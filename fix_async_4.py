import os

fixes = [
    ("app/task/[id].tsx", "const unlocked = checkAndAwardBadges", "const unlocked = await checkAndAwardBadges"),
    ("src/services/behavior/weeklyReportGenerator.ts", "pattern: ReturnType<typeof analyzePatterns>;", "pattern: Awaited<ReturnType<typeof analyzePatterns>>;"),
    ("src/services/gamification/badgeEngine.ts", "); return res.map((r: any) => r.badge_name);", "const res = await db.getAllAsync<any>('SELECT * FROM achievements WHERE user_id = ?', [userId]); return res.map((r: any) => r.badge_name);"),
    ("src/services/gamification/badgeEngine.ts", "const res = await db.getAllAsync<any>(\n    `SELECT * FROM achievements WHERE user_id = ?`,", "const res = await db.getAllAsync<any>(\n    `SELECT * FROM achievements WHERE user_id = ?`,"),
    ("src/services/notification/notificationScheduler.ts", "const pendingTasks = getTodaysPendingTasks", "const pendingTasks = await getTodaysPendingTasks")
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
