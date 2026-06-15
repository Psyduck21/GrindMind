import { supabase } from '../../supabase/client';
import { queryClient } from '../../../app/_layout';

/**
 * Initializes Supabase Realtime listeners.
 * Listens for INSERT, UPDATE, and DELETE events on key tables and invalidates the local React Query cache.
 */
export const startRealtimeSync = (userId: string) => {
  if (!userId) return null;

  console.log('[Realtime] Subscribing to Supabase Realtime channels...');

  const channel = supabase.channel(`grindmind_realtime_${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
      (payload) => {
        console.log('[Realtime] Tasks change received:', payload);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        
        // If it's a specific update, we could invalidate the exact task
        if (payload.new && (payload.new as any).id) {
          queryClient.invalidateQueries({ queryKey: ['task', (payload.new as any).id] });
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_completions', filter: `user_id=eq.${userId}` },
      (payload) => {
        console.log('[Realtime] Task completion received:', payload);
        queryClient.invalidateQueries({ queryKey: ['completions'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Re-fetch tasks to update completion state
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'achievements', filter: `user_id=eq.${userId}` },
      (payload) => {
        console.log('[Realtime] Achievements change received:', payload);
        queryClient.invalidateQueries({ queryKey: ['user'] }); // Invalidate profile stats
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });

  return channel;
};

export const stopRealtimeSync = async (channel: any) => {
  if (channel) {
    console.log('[Realtime] Unsubscribing...');
    await supabase.removeChannel(channel);
  }
};
