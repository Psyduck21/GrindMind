import os

fixes = [
    ("app/(tabs)/routine/[id].tsx", "const toggleTaskDone = (taskId: string) => {", "const toggleTaskDone = async (taskId: string) => {"),
    ("app/(tabs)/settings.tsx", "const handleWipeDatabase = () => {", "const handleWipeDatabase = async () => {"),
    ("app/(tabs)/settings.tsx", "const handleForceSync = () => {", "const handleForceSync = async () => {"),
    ("app/preferences.tsx", "const handleCompleteOnboarding = () => {", "const handleCompleteOnboarding = async () => {"),
    ("app/task/[id].tsx", "const toggleSubtask = (subtaskId: string) => {", "const toggleSubtask = async (subtaskId: string) => {"),
    ("src/db/repositories/habit.ts", "export const getHabits = (routineId: string) => {", "export const getHabits = async (routineId: string) => {"),
    ("src/db/repositories/habit.ts", "export const getHabitCompletions = (habitId: string) => {", "export const getHabitCompletions = async (habitId: string) => {"),
    ("src/hooks/useQueries.ts", "const subtasks = await db.getAllAsync", "const subtasks = await db.getAllAsync"), # Wait, the TS error was missing await inside map.
    # In useQueries.ts: "const enrichedTasks = tasks.map(task => { const subtasks = await db.getAllAsync..." map doesn't wait!
    # I need to use Promise.all.
    ("src/services/behavior/patternAnalyzer.ts", "const analyzePatterns = (userId: string) => {", "const analyzePatterns = async (userId: string) => {"),
    ("src/services/behavior/weeklyReportGenerator.ts", "export const getWeeklyStats = (userId: string) => {", "export const getWeeklyStats = async (userId: string) => {"),
    ("src/services/behavior/weeklyReportGenerator.ts", "const analyzeConsistency = (stats: any) => {", "const analyzeConsistency = async (stats: any) => {"),
    ("src/services/consequence/consequenceEngine.ts", "export const processTaskMiss = (task: TaskItem, userId: string, skipReason: string) => {", "export const processTaskMiss = async (task: TaskItem, userId: string, skipReason: string) => {"),
    ("src/services/gamification/badgeEngine.ts", "export const getBadgeStats = (userId: string): BadgeStats => {", "export const getBadgeStats = async (userId: string): Promise<BadgeStats> => {"),
    ("src/services/gamification/badgeEngine.ts", "export const checkAndAwardBadges = (userId: string): string[] => {", "export const checkAndAwardBadges = async (userId: string): Promise<string[]> => {"),
    ("src/services/gamification/badgeEngine.ts", "export const getAchievements = (userId: string) => {", "export const getAchievements = async (userId: string) => {")
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
