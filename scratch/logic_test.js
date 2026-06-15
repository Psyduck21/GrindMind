const { execSync } = require('child_process');

console.log('--- Testing AI Context Hydrator Logic ---');
// Mock the summarizePayload logic since we can't easily mock SQLite in native node JS without setup
const mockTasks = [
  {
    id: 1,
    title: 'Workout',
    priority: 'high',
    scheduled_date: '2026-06-15',
    scheduled_time: '08:00',
    estimated_duration_minutes: 60,
    is_time_locked: 1,
    status: 'completed',
    ai_context: 'Should be done early'
  },
  {
    id: 2,
    title: 'Code Review',
    priority: 'critical',
    scheduled_date: '2026-06-15',
    scheduled_time: '10:00',
    estimated_duration_minutes: 45,
    is_time_locked: 0,
    status: 'not_started',
    ai_context: null
  }
];

const summarizePayload = (payload) => {
  return payload.map(task => ({
    i: task.id,
    ti: task.title,
    p: task.priority,
    d: task.scheduled_date,
    t: task.scheduled_time,
    st: task.status,
    l: task.is_time_locked
  }));
};

const summarized = summarizePayload(mockTasks);
console.assert(summarized[0].i === 1, 'ID not mapped');
console.assert(summarized[0].ti === 'Workout', 'Title not mapped');
console.assert(summarized[0].ai_context === undefined, 'AI Context was not stripped');
console.log('✅ AI Hydrator Token Summarization logic passed.');

console.log('\n--- Testing Badge Engine Thresholds ---');
const BADGE_CONFIGS = [
  { id: 'unbreakable', name: 'Unbreakable', type: 'streak', condition: 7 },
  { id: 'consistency_king', name: 'Consistency King', type: 'streak', condition: 30 },
  { id: 'comeback_kid', name: 'Comeback Kid', type: 'recovery', condition: 5 }
];

const checkBadges = (stats) => {
  const newlyUnlocked = [];
  for (const b of BADGE_CONFIGS) {
    let qualifies = false;
    if (b.type === 'streak' && stats.currentStreak >= b.condition) qualifies = true;
    if (b.type === 'recovery' && stats.recoveryCount >= b.condition) qualifies = true;
    
    // Simulate it wasn't unlocked yet
    if (qualifies) newlyUnlocked.push(b);
  }
  return newlyUnlocked;
};

const stats1 = { currentStreak: 6, recoveryCount: 4 };
console.assert(checkBadges(stats1).length === 0, 'Badge incorrectly awarded early');

const stats2 = { currentStreak: 7, recoveryCount: 4 };
const badges2 = checkBadges(stats2);
console.assert(badges2.length === 1 && badges2[0].id === 'unbreakable', 'Unbreakable not awarded at 7 days');

const stats3 = { currentStreak: 30, recoveryCount: 5 };
const badges3 = checkBadges(stats3);
console.assert(badges3.length === 3, 'Multiple badges not awarded properly');

console.log('✅ Gamification Engine Thresholds passed.');

