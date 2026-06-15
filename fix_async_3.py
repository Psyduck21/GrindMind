import os

fixes = [
    ("app/(tabs)/routine/[id].tsx", "const handleMarkDone = (taskId: string) => {", "const handleMarkDone = async (taskId: string) => {"),
    ("app/(tabs)/settings.tsx", "const handleWipeDatabase = () => {", "const handleWipeDatabase = async () => {"),
    ("app/(tabs)/settings.tsx", "const handleForceSync = () => {", "const handleForceSync = async () => {"),
    ("app/preferences.tsx", "const loadUser = () => {", "const loadUser = async () => {"),
    ("app/task/[id].tsx", "queryFn: () => await db.getFirstAsync", "queryFn: async () => await db.getFirstAsync"),
    ("app/task/[id].tsx", "const unlocked = checkAndAwardBadges(user.id);", "const unlocked = await checkAndAwardBadges(user.id);"),
    ("src/db/repositories/habit.ts", "export const getHabitsForRoutine = (routineId: string): HabitItem[] => {", "export const getHabitsForRoutine = async (routineId: string): Promise<HabitItem[]> => {"),
    ("src/db/repositories/habit.ts", "export const completeHabit = (habitId: string) => {", "export const completeHabit = async (habitId: string) => {"),
    ("src/db/repositories/habit.ts", "habits.forEach((h) => {", "for (const h of habits) {"),
    ("src/services/behavior/patternAnalyzer.ts", "export const analyzePatterns = (userId: string): FailurePattern => {", "export const analyzePatterns = async (userId: string): Promise<FailurePattern> => {"),
    ("src/services/consequence/consequenceEngine.ts", "await db.getAllAsync<any>(`SELECT id FROM task_completions WHERE task_id = ? AND state = 'skipped'`, [task.id]).length", "(await db.getAllAsync<any>(`SELECT id FROM task_completions WHERE task_id = ? AND state = 'skipped'`, [task.id])).length"),
    ("src/services/gamification/badgeEngine.ts", "return await db.getAllAsync<any>(", "const res = await db.getAllAsync<any>("),
    ("src/services/gamification/badgeEngine.ts", ").map((r) => r.badge_name);", "); return res.map((r: any) => r.badge_name);"),
    ("src/services/gamification/badgeEngine.ts", "if (badge.check(stats)) {", "const stats = await getBadgeStats(userId); if (badge.check(stats)) {"),
    ("src/services/gamification/badgeEngine.ts", "const stats = getBadgeStats(userId);", ""),
    ("src/services/notification/notificationScheduler.ts", "const pendingTasks = getTodaysPendingTasks(userId);", "const pendingTasks = await getTodaysPendingTasks(userId);")
]

for filepath, search_str, replace_str in fixes:
    full_path = os.path.join("/run/media/heisenberg/Piu Piu/projects/GrindMind", filepath)
    if os.path.exists(full_path):
        with open(full_path, "r") as f:
            content = f.read()
        content = content.replace(search_str, replace_str)
        with open(full_path, "w") as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"Not found: {filepath}")
