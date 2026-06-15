import { db } from '../../db/db';
import { supabase } from '../../supabase/client';
import uuid from 'react-native-uuid';
import NetInfo from '@react-native-community/netinfo';

export const SYNCABLE_TABLES = [
  'users',
  'routines',
  'routine_weeks',
  'tasks',
  'subtasks',
  'recovery_tasks',
  'task_completions',
  'achievements',
  'weekly_reports',
  'notifications',
  'analytics_events'
];

type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Queue an operation to be synced to the cloud.
 * This is offline-first: it writes to the local DB queue immediately.
 */
export async function queueOperation(tableName: string, operation: OperationType, payload: any) {
  try {
    const id = uuid.v4() as string;
    const now = Date.now();
    
    // Store in local sync queue
    await db.runAsync(
      `INSERT INTO sync_queue (id, table_name, operation, payload, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, tableName, operation, JSON.stringify(payload), now]
    );
    
    // Try to sync immediately if online
    const state = await NetInfo.fetch();
    if (state.isConnected) {
      // We don't await this so it doesn't block the caller
      runFullSync().catch(console.error);
    }
  } catch (err) {
    console.error(`Failed to queue operation for ${tableName}:`, err);
  }
}

/**
 * Pushes all pending queued operations to Supabase using Batched Upserts.
 * Solves N+1 execution by grouping requests by table.
 */
export async function pushSync() {
  const queue = await db.getAllAsync<{id: string, table_name: string, operation: string, payload: string}>(
    'SELECT * FROM sync_queue ORDER BY created_at ASC'
  );
  
  if (queue.length === 0) return;

  const tableGroups: Record<string, { upserts: Record<string, any>; deletes: Set<string>; queueItemIds: string[]; }> = {};

  for (const item of queue) {
    const payload = JSON.parse(item.payload);
    if (!tableGroups[item.table_name]) {
      tableGroups[item.table_name] = { upserts: {}, deletes: new Set(), queueItemIds: [] };
    }
    tableGroups[item.table_name].queueItemIds.push(item.id);

    if (item.operation === 'DELETE') {
      tableGroups[item.table_name].deletes.add(payload.id);
      delete tableGroups[item.table_name].upserts[payload.id];
    } else {
      // Both INSERT and UPDATE map to a Supabase .upsert()
      tableGroups[item.table_name].upserts[payload.id] = payload;
      tableGroups[item.table_name].deletes.delete(payload.id);
    }
  }

  for (const [tableName, group] of Object.entries(tableGroups)) {
    try {
      const upsertPayloads = Object.values(group.upserts);
      const deleteIds = Array.from(group.deletes);
      let success = true;

      // 1. Batched Upsert
      if (upsertPayloads.length > 0) {
        // [CONFLICT RESOLUTION] Timestamp Vector Check
        let finalUpserts = upsertPayloads;
        
        try {
          const payloadIds = upsertPayloads.map(p => p.id);
          const { data: remoteRecords, error: remoteErr } = await supabase
            .from(tableName)
            .select('id, updated_at')
            .in('id', payloadIds);

          if (!remoteErr && remoteRecords) {
            const remoteMap = new Map(remoteRecords.map(r => [r.id, r.updated_at]));
            
            finalUpserts = upsertPayloads.filter(local => {
              const remoteUpdatedAt = remoteMap.get(local.id);
              // If remote doesn't exist, this is an INSERT. Keep it.
              if (!remoteUpdatedAt) return true;
              
              // If table lacks updated_at, fallback to last-synced-wins
              if (!local.updated_at) return true;

              // Only keep local if it is strictly newer than the server
              return local.updated_at > remoteUpdatedAt;
            });
            
            const discarded = upsertPayloads.length - finalUpserts.length;
            if (discarded > 0) {
               console.log(`[SyncEngine] Conflict Resolution: Discarded ${discarded} stale local edits for ${tableName}`);
            }
          }
        } catch (e) {
          console.warn(`[SyncEngine] Conflict resolution check failed for ${tableName}`, e);
        }

        if (finalUpserts.length > 0) {
          const { error } = await supabase.from(tableName).upsert(finalUpserts);
          if (error) {
             console.error(`🚨 [SyncEngine] Push Upsert Error (${tableName}):`, error);
             success = false;
          } else {
             console.log(`[SyncEngine] Upserted ${finalUpserts.length} records to ${tableName}`);
          }
        }
      }

      // 2. Batched Delete
      if (deleteIds.length > 0) {
        const { error } = await supabase.from(tableName).delete().in('id', deleteIds);
        if (error) {
           console.error(`🚨 [SyncEngine] Push Delete Error (${tableName}):`, error);
           success = false;
        } else {
           console.log(`[SyncEngine] Deleted ${deleteIds.length} records from ${tableName}`);
        }
      }

      // 3. Clear Processed Items from Local Queue
      if (success) {
        await db.withTransactionAsync(async () => {
           for (const qid of group.queueItemIds) {
             await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [qid]);
           }
        });
      }
    } catch (err) {
       console.error(`Sync exception on ${tableName}:`, err);
    }
  }
}

/**
 * Pulls all updates from Supabase since the last successful pull, 
 * applying them locally using Last-Write-Wins (Timestamp Conflict Resolution).
 */
export async function pullSync() {
  // Get last synced timestamp
  let lastSynced = 0;
  const state = await db.getFirstAsync<{last_synced_at: number}>('SELECT last_synced_at FROM sync_state LIMIT 1');
  if (state) {
    lastSynced = state.last_synced_at;
  }

  const now = Date.now();

  // 1. Pull Tombstones (Ghost Record Cleanup)
  try {
    const { data: tombstones, error: tErr } = await supabase
      .from('sync_tombstones')
      .select('record_id, table_name, deleted_at')
      .gt('deleted_at', lastSynced);

    if (tErr) {
      console.error(`🚨 [SyncEngine] Tombstone pull failed:`, tErr);
    } else if (tombstones && tombstones.length > 0) {
      console.log(`[SyncEngine] Processing ${tombstones.length} tombstones (Hard Deletes)`);
      await db.withTransactionAsync(async () => {
        for (const tb of tombstones) {
          if (SYNCABLE_TABLES.includes(tb.table_name)) {
            await db.runAsync(`DELETE FROM ${tb.table_name} WHERE id = ?`, [tb.record_id]);
          }
        }
      });
    }
  } catch (err) {
    console.error(`[SyncEngine] Tombstone processing exception:`, err);
  }

  // 2. Pull Updates
  for (const table of SYNCABLE_TABLES) {
    try {
      // Use created_at if updated_at is missing on specific tables
      const timestampCol = ['task_completions', 'achievements', 'weekly_reports', 'analytics_events'].includes(table) ? 'created_at' : 'updated_at';
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .gt(timestampCol, lastSynced);

      if (error) {
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.error(`🚨 [RLS BLOCK] Supabase blocked PULL (SELECT) on ${table}. Check Row Level Security policies! Error:`, error);
        } else {
          console.error(`Pull sync error for ${table}:`, error);
        }
        continue;
      }
      console.log(`[SyncEngine] Pull sync ${table} gt ${lastSynced}: ${data?.length || 0} records found`);

      if (data && data.length > 0) {
        const sample = data[0];
        const columns = Object.keys(sample).join(', ');
        const placeholders = Object.keys(sample).map(() => '?').join(', ');

        await db.withTransactionAsync(async () => {
          for (const cloudRow of data) {
            // Conflict Resolution Check
            const localRow = await db.getFirstAsync<any>(
              `SELECT ${timestampCol} FROM ${table} WHERE id = ?`,
              [cloudRow.id]
            );

            const cloudTime = cloudRow[timestampCol] ? Number(cloudRow[timestampCol]) : 0;
            const localTime = localRow && localRow[timestampCol] ? Number(localRow[timestampCol]) : 0;

            // Apply update only if cloud version is newer or local record doesn't exist
            if (!localRow || cloudTime >= localTime) {
              const values = Object.values(cloudRow);
              await db.runAsync(
                `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
                values as any[]
              );
            } else {
               console.log(`[SyncEngine] Conflict resolved locally for ${table} [${cloudRow.id}]: Local (${localTime}) > Cloud (${cloudTime})`);
            }
          }
        });
      }
    } catch (error) {
      console.error(`Error pulling ${table}:`, error);
    }
  }

  // Update sync state
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_state (id, last_synced_at) VALUES (1, ?)',
    [now]
  );
  console.log(`[SyncEngine] pullSync complete. last_synced_at updated to ${now}`);
}

let isSyncing = false;

/**
 * Executes a full two-way sync (Push then Pull).
 */
export async function runFullSync() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return; // Abort if offline

    await pushSync();
    await pullSync();
  } finally {
    isSyncing = false;
  }
}
