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
  'task_completions'
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
    db.runSync(
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
 * Pushes all pending queued operations to Supabase in order.
 */
export async function pushSync() {
  const queue = db.getAllSync<{id: string, table_name: string, operation: string, payload: string}>(
    'SELECT * FROM sync_queue ORDER BY created_at ASC'
  );
  
  if (queue.length === 0) return;

  for (const item of queue) {
    const payload = JSON.parse(item.payload);
    let success = false;

    try {
      if (item.operation === 'INSERT') {
        const { error } = await supabase.from(item.table_name).insert(payload);
        if (!error || error.code === '23505') {
          success = true; // 23505 = unique constraint violation (already exists)
        } else if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.error(`🚨 [RLS BLOCK] Supabase blocked INSERT on ${item.table_name}. Check Row Level Security policies! Error:`, error);
        } else {
          console.error(`Push Insert Error (${item.table_name}):`, error);
        }
        console.log(`[SyncEngine] Push Insert ${item.table_name}: success=${success}`, payload);
      } 
      else if (item.operation === 'UPDATE') {
        const { error } = await supabase.from(item.table_name).update(payload).eq('id', payload.id);
        if (!error) {
          success = true;
        } else if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.error(`🚨 [RLS BLOCK] Supabase blocked UPDATE on ${item.table_name}. Check Row Level Security policies! Error:`, error);
        } else {
          console.error(`Push Update Error (${item.table_name}):`, error);
        }
        console.log(`[SyncEngine] Push Update ${item.table_name}: success=${success}`, payload);
      } 
      else if (item.operation === 'DELETE') {
        const { error } = await supabase.from(item.table_name).delete().eq('id', payload.id);
        if (!error) {
          success = true;
        } else if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.error(`🚨 [RLS BLOCK] Supabase blocked DELETE on ${item.table_name}. Check Row Level Security policies! Error:`, error);
        } else {
          console.error(`Push Delete Error (${item.table_name}):`, error);
        }
      }

      // If successful (or safely ignorable like a duplicate insert), remove from local queue
      if (success) {
        db.runSync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
      }
    } catch (err) {
      console.error(`Sync exception on ${item.table_name} ${item.operation}:`, err);
    }
  }
}

/**
 * Pulls all updates from Supabase since the last successful pull, 
 * applying them locally using Last-Write-Wins (INSERT OR REPLACE).
 */
export async function pullSync() {
  // Get last synced timestamp
  let lastSynced = 0;
  const state = db.getFirstSync<{last_synced_at: number}>('SELECT last_synced_at FROM sync_state LIMIT 1');
  if (state) {
    lastSynced = state.last_synced_at;
  }

  const now = Date.now();

  for (const table of SYNCABLE_TABLES) {
    try {
      // Some tables like subtasks might only have created_at
      const timestampCol = ['subtasks', 'task_completions', 'achievements'].includes(table) ? 'created_at' : 'updated_at';
      
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

        db.withTransactionSync(() => {
          for (const row of data) {
            const values = Object.values(row);
            // Replace handles conflict by overwriting with the newer cloud data
            db.runSync(
              `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
              values as any[]
            );
          }
        });
      }
    } catch (err) {
      console.error(`Pull sync crash for ${table}:`, err);
    }
  }

  // Update sync state
  if (state) {
    db.runSync('UPDATE sync_state SET last_synced_at = ?', [now]);
  } else {
    db.runSync('INSERT INTO sync_state (id, last_synced_at) VALUES (?, ?)', [uuid.v4() as string, now]);
  }
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
