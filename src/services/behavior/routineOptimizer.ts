import { FailurePattern } from './patternAnalyzer';

export interface RoutineSuggestion {
  type: 'reschedule' | 'reduce_load' | 'add_buffer' | 'rebuild' | 'swap_category';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Rule-based routine optimizer.
 * Takes analyzed failure patterns and generates actionable suggestions.
 * Fully deterministic — no AI involved.
 */
export const generateSuggestions = (
  pattern: FailurePattern,
  dailyMinutes: number
): RoutineSuggestion[] => {
  const suggestions: RoutineSuggestion[] = [];

  // Rule 1: High overall skip rate
  if (pattern.skipRate > 0.5) {
    suggestions.push({
      type: 'reduce_load',
      title: 'Overloaded Routine',
      description: `You're skipping over ${Math.round(pattern.skipRate * 100)}% of tasks. Your routine may be too ambitious. Consider reducing daily tasks by 20%.`,
      severity: 'critical',
    });
  } else if (pattern.skipRate > 0.3) {
    suggestions.push({
      type: 'add_buffer',
      title: 'High Skip Rate',
      description: `${Math.round(pattern.skipRate * 100)}% skip rate detected. Add 15-minute buffer blocks between tasks to reduce pressure.`,
      severity: 'warning',
    });
  }

  // Rule 2: Worst time of day
  if (pattern.worstTimeOfDay) {
    const timeLabel: Record<string, string> = {
      morning: 'morning (before 12PM)',
      afternoon: 'afternoon (12PM–5PM)',
      evening: 'evening (after 5PM)',
    };
    suggestions.push({
      type: 'reschedule',
      title: `${pattern.worstTimeOfDay.charAt(0).toUpperCase() + pattern.worstTimeOfDay.slice(1)} Tasks Frequently Skipped`,
      description: `You skip most tasks scheduled in the ${timeLabel[pattern.worstTimeOfDay]}. Try moving heavy tasks to your stronger time blocks.`,
      severity: 'warning',
    });
  }

  // Rule 3: Worst day of week
  if (pattern.worstDayOfWeek) {
    suggestions.push({
      type: 'reschedule',
      title: `${pattern.worstDayOfWeek} Is Your Weak Day`,
      description: `${pattern.worstDayOfWeek} consistently shows the most skips. Schedule lighter tasks or a rest/review day on ${pattern.worstDayOfWeek}s.`,
      severity: 'info',
    });
  }

  // Rule 4: Specific category struggles
  if (pattern.mostSkippedCategory) {
    suggestions.push({
      type: 'swap_category',
      title: `"${pattern.mostSkippedCategory}" Tasks Ignored`,
      description: `Tasks in the "${pattern.mostSkippedCategory}" category are skipped most often. Consider breaking them into smaller sub-tasks or reducing their frequency.`,
      severity: 'warning',
    });
  }

  // Rule 5: Consecutive misses → rebuild trigger
  if (pattern.consecutiveMissDays >= 3 || pattern.missedCriticalCount >= 5) {
    suggestions.push({
      type: 'rebuild',
      title: 'Routine Rebuild Recommended',
      description: `${pattern.consecutiveMissDays} consecutive miss days or ${pattern.missedCriticalCount} missed critical tasks. Your current routine is no longer sustainable. A rebuild is strongly advised.`,
      severity: 'critical',
    });
  }

  // Rule 6: Positive — nothing broken
  if (suggestions.length === 0) {
    suggestions.push({
      type: 'add_buffer',
      title: "You're On Track",
      description: 'No critical patterns detected. Keep up the current routine and push intensity slightly higher if you feel comfortable.',
      severity: 'info',
    });
  }

  return suggestions;
};
