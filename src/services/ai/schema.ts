import { z } from 'zod';

export const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.string().min(1),
  scheduled_time: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'scheduled_time must be HH:MM'),
  estimated_duration_minutes: z.number().int().min(1),
  consequence_weight: z.number().min(1).max(3),
  recurrence_rule: z.string().optional(),
});

export const GeneratedRoutineSchema = z.object({
  routine: z.object({
    title: z.string().min(1),
    goal: z.string().min(1),
  }),
  tasks: z.array(TaskSchema).min(1),
});

export type GeneratedRoutine = z.infer<typeof GeneratedRoutineSchema>;
