const PRIORITY_WEIGHTS = {
  'critical': 4,
  'high': 3,
  'medium': 2,
  'low': 1
};

const addMinutes = (timeStr, mins) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m + mins;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const resolveCascadingShifts = (tasks) => {
  let collisionFound = true;
  let loopCount = 0;

  const startTime = process.hrtime.bigint();

  // REMOVED SAFETY COUNTER
  while (collisionFound) { 
    collisionFound = false;
    loopCount++;

    tasks.sort((a, b) => timeToMins(a.scheduled_time) - timeToMins(b.scheduled_time));

    for (let i = 0; i < tasks.length - 1; i++) {
      const current = tasks[i];
      const next = tasks[i + 1];

      if (!current.scheduled_time || !next.scheduled_time) continue;

      const currentEndMins = timeToMins(current.scheduled_time) + (current.estimated_duration_minutes || 30);
      const nextStartMins = timeToMins(next.scheduled_time);

      if (currentEndMins > nextStartMins) {
        collisionFound = true;

        const currentPrio = PRIORITY_WEIGHTS[current.priority] || 2;
        const nextPrio = PRIORITY_WEIGHTS[next.priority] || 2;
        const currentLocked = current.is_time_locked === 1;
        const nextLocked = next.is_time_locked === 1;

        if (nextLocked && !currentLocked) {
          current.scheduled_time = addMinutes(next.scheduled_time, next.estimated_duration_minutes || 30);
        } else if (currentLocked && !nextLocked) {
          next.scheduled_time = addMinutes(current.scheduled_time, current.estimated_duration_minutes || 30);
        } else if (currentPrio >= nextPrio) {
          next.scheduled_time = addMinutes(current.scheduled_time, current.estimated_duration_minutes || 30);
        } else {
          current.scheduled_time = addMinutes(next.scheduled_time, next.estimated_duration_minutes || 30);
        }
        
        break; // Break and re-sort
      }
    }
  }

  const endTime = process.hrtime.bigint();
  const execTimeMs = Number(endTime - startTime) / 1000000;

  return { execTimeMs, loopCount, tasksResolved: tasks.length };
};

const runBenchmark = (taskCount) => {
  const tasks = Array.from({ length: taskCount }).map((_, i) => ({
    id: i,
    scheduled_time: '09:00',
    estimated_duration_minutes: 30,
    priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
    is_time_locked: 0
  }));

  const result = resolveCascadingShifts(tasks);
  console.log(`[STRESS TEST] ${taskCount} tasks -> Exec Time: ${result.execTimeMs.toFixed(2)}ms | Loops: ${result.loopCount}`);
};

console.log('--- GrindMind Tetris Engine Stress Benchmark (Unlimited Loops) ---');
runBenchmark(10);
runBenchmark(20);
runBenchmark(50);
runBenchmark(100);

