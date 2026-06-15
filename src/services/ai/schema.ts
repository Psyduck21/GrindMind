import { z } from 'zod';

export const SubtaskSchema = z.object({
  title: z.string().min(1),
  is_completed: z.boolean().optional(),
});

export const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.string().min(1),
  scheduled_time: z.string().optional(),
  estimated_duration_minutes: z.number().int().min(1),
  consequence_weight: z.number().min(1).max(3).optional().default(1.0),
  target_week: z.number().int().min(1),
  target_day: z.string().min(1),
  subtasks: z.array(z.string()).optional(),
  recurrence_rule: z.string().optional(),
});

export const GeneratedRoutineSchema = z.object({
  routine: z.object({
    title: z.string().min(1),
    goal: z.string().min(1),
    routine_type: z.string().optional(),
  }),
  tasks: z.array(TaskSchema).min(1),
});

export const IntentActionSchema = z.object({
  action: z.enum(['MOVE', 'CANCEL', 'UPDATE', 'CREATE']),
  task_id: z.string().optional(), // Required for MOVE, CANCEL, UPDATE
  new_scheduled_date: z.string().optional(), // For MOVE/CREATE
  new_scheduled_time: z.string().optional(), // For MOVE/CREATE
  new_duration_minutes: z.number().optional(), // For UPDATE/CREATE
  new_title: z.string().optional(), // For CREATE/UPDATE
  new_priority: z.enum(['high', 'medium', 'low']).optional()
});

export const IntentGraphSchema = z.object({
  intents: z.array(IntentActionSchema),
  message_to_user: z.string()
});

export type GeneratedRoutine = z.infer<typeof GeneratedRoutineSchema>;
export type GeneratedTask = z.infer<typeof TaskSchema>;
export type IntentAction = z.infer<typeof IntentActionSchema>;
export type IntentGraph = z.infer<typeof IntentGraphSchema>;
