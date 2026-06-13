# Product Requirements Document (PRD): GrindMind

## 1. Product Overview

### 1.1 Vision
To build a ruthless, deterministic AI accountability coach that prioritizes execution over intention. GrindMind doesn't just plan your day; it enforces it through a strict consequence-based gamification system.

### 1.2 Problem
Many productivity and fitness apps excel at planning but fail at accountability. Users easily ignore scheduled tasks without facing any immediate repercussions, leading to broken habits and loss of motivation.

### 1.3 Solution
**GrindMind** is a mobile application that generates personalized daily routines using AI, tracks user adherence, and rigorously penalizes skipped tasks using a "Consequence Engine". If a user misses a commitment, they are assigned a mandatory "recovery task" (makeup work) with escalating severity.

## 2. Target Audience
- Individuals seeking aggressive accountability for fitness, productivity, or personal goals.
- People who respond better to "tough love" coaching rather than gentle reminders.
- Users who struggle with consistency and want a gamified, structured system to enforce discipline.

## 3. Core Features

### 3.1 AI Accountability Coach (Powered by Gemini)
- **Profile-Driven Routine Generation**: Generates a realistic but challenging 3-5 task daily routine based on user constraints (wake/sleep time, daily available minutes, fitness level, goal, and accountability mode).
- **Interactive Prompts**: The AI acts interactively to clarify ambiguities before generating a final routine (e.g., asking for available home workout equipment).
- **Strict Adherence**: The AI strictly enforces the user's available daily minutes and schedules tasks accordingly.

### 3.2 The Consequence Engine
- **Deterministic Penalties**: If a user skips a task, the engine records a skip reason and calculates a penalty.
- **Escalating Severity**: Missing a "critical" priority task yields a moderate penalty (e.g., +15 mins makeup). Missing it a second time escalates the penalty to "strong" severity (+30 mins makeup).
- **Recovery Tasks**: Generates mandatory make-up tasks scheduled for the next day to reclaim lost time.

### 3.3 Gamification & Scoring
- **Streaks & Promise Kept Rate**: Tracks consecutive days of completed tasks and the percentage of commitments kept.
- **XP & Leveling System**: Awards XP for completing tasks and taking on recovery tasks.
- **Badges/Achievements**: Unlocks milestones based on consistency and behavior.

### 3.4 Dashboard & Analytics
- **Today's Grind**: A clean daily view of tasks and habits.
- **Progress Tracking**: Circular progress indicators and stats pills displaying current streaks and completion rates.
- **Weekly Reports**: Automated weekly summaries tracking completed/missed tasks, streak changes, consistency scores, and AI-generated behavior suggestions.

## 4. User Flow

1. **Onboarding & Authentication**: 
   - User signs in via Supabase Auth (Google OAuth).
   - User completes onboarding, defining their "Grind Type," daily commitment time, wake/sleep schedules, and motivation level.
2. **Routine Generation**: 
   - The app sends the user profile to the Gemini AI API.
   - The AI returns a structured JSON routine containing specific, scheduled tasks.
3. **The Daily Grind**: 
   - User checks the Dashboard.
   - User marks tasks as complete (gains XP) or skips them (requires a reason).
4. **Consequences & Recovery**: 
   - At the end of the day or immediately upon skipping, the Consequence Engine calculates penalties and schedules recovery tasks for the next day.

## 5. Technical Architecture

- **Frontend**: React Native with Expo (Router for navigation).
- **Styling**: Custom theme with defined Typography and Colors (`COLORS`, `TYPOGRAPHY`), Reanimated for animations.
- **State Management**: Zustand & React Query.
- **Local Storage (Offline-First)**: Expo SQLite (`grindmind.db`) acting as the primary fast-access data store.
- **Authentication**: Supabase Auth.
- **AI Integration**: Google Gemini API (`gemini-2.5-flash`), strictly typed with Zod schemas for guaranteed JSON output.

## 6. High-Level Data Model (Local SQLite)

- **Users**: Core profile data, schedules, accountability mode.
- **Routines**: High-level goal and AI generation metadata.
- **Tasks**: Individual actionable items with priorities and consequence weights.
- **Habits**: Recurring daily items with streak tracking.
- **Task Completions**: Log of historical task executions, skip reasons, and XP awarded.
- **Recovery Tasks**: Auto-generated penalty tasks linked to missed original tasks.
- **Weekly Reports / Achievements**: Aggregated metrics and unlocked badges.

## 7. Future Considerations
- **Cloud Sync**: While currently offline-first with SQLite, full bidirectional sync to Supabase for multi-device support.
- **Push Notifications**: Aggressive, dynamic push notifications based on the user's "Accountability Mode."
- **Social / Leaderboards**: Pitting users against each other in "Grind Challenges."
