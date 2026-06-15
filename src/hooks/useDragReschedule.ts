import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IntentGraph } from '../services/ai/schema';
import { applyIntentGraph } from '../services/task/timeBlockManager';

/**
 * A generic hook that uses the mathematical constraint engine 
 * (Tetris engine) to manually resolve Drag & Drop events.
 * It simulates an AI "Intent" to plug directly into the robust collision pipeline.
 */
export function useDragReschedule() {
  const queryClient = useQueryClient();

  const onDragEnd = useCallback(async (taskId: string, newDate: string, newTime: string) => {
    try {
      // Formulate a mock intent to feed the Constraint Engine
      const mockIntent: IntentGraph = {
        intents: [
          {
            action: 'MOVE',
            task_id: taskId,
            new_scheduled_date: newDate,
            new_scheduled_time: newTime
          }
        ],
        message_to_user: 'Manual Drag Complete'
      };

      // Push it through the exact same collision/spillover logic as the AI Orchestrator
      await applyIntentGraph(mockIntent);

      // Invalidate the agenda so the UI snaps into the newly calculated Tetris grid
      await queryClient.invalidateQueries({ queryKey: ['tasks', 'agenda'] });
      
    } catch (e) {
      console.error('Failed to resolve manual drag drop:', e);
      throw e;
    }
  }, [queryClient]);

  return { onDragEnd };
}
