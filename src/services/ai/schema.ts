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

export type GeneratedRoutine = z.infer<typeof GeneratedRoutineSchema>;
export type GeneratedTask = z.infer<typeof TaskSchema>;
