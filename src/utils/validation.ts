import { z } from 'zod';

export const onboardingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  grindType: z.enum(['study', 'fitness', 'career', 'custom']),
  customGrindType: z.string().optional().refine((val) => {
    // If grindType is custom, customGrindType must be provided
    return true; // We'll handle this logic in the component or via superRefine later if needed
  }),
  wakeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  sleepTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  dailyMinutes: z.number().min(10, 'Minimum 10 minutes required').max(1440, 'Maximum 24 hours'),
  accountabilityMode: z.enum(['friendly', 'coach', 'military', 'savage', 'iron_discipline']),
});

export type OnboardingData = z.infer<typeof onboardingSchema>;
