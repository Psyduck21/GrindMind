import os
import re

fixes = [
    ("app/(tabs)/index.tsx", "onToggleSubtask={(subtaskId: string) => {", "onToggleSubtask={async (subtaskId: string) => {"),
    ("app/(tabs)/routine/[id].tsx", "onToggleSubtask={(subtaskId: string) => {", "onToggleSubtask={async (subtaskId: string) => {"),
    ("app/(tabs)/settings.tsx", "const handleClearData = () => {", "const handleClearData = async () => {"),
    ("app/preferences.tsx", "const handleSave = () => {", "const handleSave = async () => {"),
    ("app/task/[id].tsx", "const handleMarkDone = () => {", "const handleMarkDone = async () => {"),
    ("app/task/[id].tsx", "const handleSkip = () => {", "const handleSkip = async () => {"),
    ("src/db/repositories/habit.ts", "export const logHabitCompletion = (userId: string, habitId: string) => {", "export const logHabitCompletion = async (userId: string, habitId: string) => {"),
    ("src/db/repositories/habit.ts", "export const checkHabitStreak = (habitId: string) => {", "export const checkHabitStreak = async (habitId: string) => {"),
    ("src/db/repositories/routine.ts", "export const getActiveRoutine = (userId: string) => {", "export const getActiveRoutine = async (userId: string) => {"),
    ("src/db/repositories/routine.ts", "export const getTasksForRoutine = (routineId: string) => {", "export const getTasksForRoutine = async (routineId: string) => {"),
    ("src/hooks/useQueries.ts", "queryFn: () => {", "queryFn: async () => {"),
    ("src/services/behavior/patternAnalyzer.ts", "export const analyzePatterns = (userId: string) => {", "export const analyzePatterns = async (userId: string) => {"),
    ("src/services/behavior/weeklyReportGenerator.ts", "export const generateWeeklyReport = (userId: string) => {", "export const generateWeeklyReport = async (userId: string) => {"),
    ("src/services/consequence/consequenceEngine.ts", "export const applyConsequences = (userId: string, taskId: string) => {", "export const applyConsequences = async (userId: string, taskId: string) => {"),
    ("src/services/consequence/consequenceEngine.ts", "const handleMissedCriticalTask = (userId: string, task: any) => {", "const handleMissedCriticalTask = async (userId: string, task: any) => {"),
    ("src/services/consequence/consequenceEngine.ts", "const createRecoveryTask = (userId: string, sourceTask: any, severity: string) => {", "const createRecoveryTask = async (userId: string, sourceTask: any, severity: string) => {"),
    ("src/services/gamification/badgeEngine.ts", "export const evaluateBadges = (userId: string) => {", "export const evaluateBadges = async (userId: string) => {"),
    ("src/services/gamification/badgeEngine.ts", "const checkFirstTaskBadge = (userId: string) => {", "const checkFirstTaskBadge = async (userId: string) => {"),
    ("src/services/gamification/badgeEngine.ts", "const checkConsistencyBadge = (userId: string) => {", "const checkConsistencyBadge = async (userId: string) => {"),
    ("src/services/gamification/badgeEngine.ts", "const checkRecoveryBadge = (userId: string) => {", "const checkRecoveryBadge = async (userId: string) => {"),
    ("src/services/gamification/badgeEngine.ts", "const awardBadge = (userId: string, badgeName: string, xp: number) => {", "const awardBadge = async (userId: string, badgeName: string, xp: number) => {"),
    ("src/services/gamification/xpEngine.ts", "export const getTotalXp = (userId: string): number => {", "export const getTotalXp = async (userId: string): Promise<number> => {"),
    ("src/services/gamification/xpEngine.ts", "export const checkStreakBonus = (userId: string, currentStreak: number): number => {", "export const checkStreakBonus = async (userId: string, currentStreak: number): Promise<number> => {"),
    ("src/services/gamification/xpEngine.ts", "export const awardXp = (userId: string, amount: number, reason: string) => {", "export const awardXp = async (userId: string, amount: number, reason: string) => {"),
    ("src/services/notification/notificationScheduler.ts", "const getTodaysPendingTasks = (userId: string) => {", "const getTodaysPendingTasks = async (userId: string) => {"),
    ("src/services/notification/notificationScheduler.ts", "const logNotification = (", "const logNotification = async ("),
    ("src/services/scoring/scoreEngine.ts", "export const calculateDailyScore = (routineId: string): number => {", "export const calculateDailyScore = async (routineId: string): Promise<number> => {"),
    ("src/services/scoring/scoreEngine.ts", "export const calculatePromiseKeptRate = (userId: string): number => {", "export const calculatePromiseKeptRate = async (userId: string): Promise<number> => {"),
    ("src/services/scoring/streakCalculator.ts", "export const calculateStreak = (userId: string): number => {", "export const calculateStreak = async (userId: string): Promise<number> => {"),
    ("src/services/sync/syncEngine.ts", "await db.withTransactionAsync(() => {", "await db.withTransactionAsync(async () => {"),
    ("src/services/task/autoRescheduler.ts", "export const autoRescheduleMissedTasks = () => {", "export const autoRescheduleMissedTasks = async () => {"),
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
