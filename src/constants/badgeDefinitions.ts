/**
 * Badge Definitions
 * TRD §11 — Gamification FR-79 to FR-83
 */

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  /** Returns true when the badge should be unlocked */
  check: (stats: BadgeStats) => boolean;
}

export interface BadgeStats {
  streak: number;
  totalCompleted: number;
  totalRecoveryCompleted: number;
  perfectDays: number;
  totalXp: number;
  firstTaskDone: boolean;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_task',
    name: 'First Blood',
    description: 'Complete your very first task.',
    icon: '⚡',
    xpReward: 50,
    check: (s) => s.firstTaskDone,
  },
  {
    id: 'three_day_streak',
    name: 'Getting Warmed Up',
    description: 'Maintain a 3-day streak.',
    icon: '🔥',
    xpReward: 75,
    check: (s) => s.streak >= 3,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak.',
    icon: '🗡️',
    xpReward: 150,
    check: (s) => s.streak >= 7,
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Complete 5 recovery tasks.',
    icon: '♻️',
    xpReward: 100,
    check: (s) => s.totalRecoveryCompleted >= 5,
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Achieve 100% completion for 7 consecutive days.',
    icon: '💎',
    xpReward: 250,
    check: (s) => s.perfectDays >= 7,
  },
  {
    id: 'grind_mode',
    name: 'Grind Mode',
    description: 'Complete 50 tasks total.',
    icon: '⚙️',
    xpReward: 200,
    check: (s) => s.totalCompleted >= 50,
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Maintain a 30-day streak.',
    icon: '☠️',
    xpReward: 500,
    check: (s) => s.streak >= 30,
  },
  {
    id: 'elite_grinder',
    name: 'Elite Grinder',
    description: 'Reach 2000 XP total.',
    icon: '👑',
    xpReward: 0,
    check: (s) => s.totalXp >= 2000,
  },
];
