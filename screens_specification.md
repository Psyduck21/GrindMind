# Screen Specification & Functionality Document: GrindMind

This document maps the GrindMind mobile architecture and PRD directly to user-facing screens. It details the purpose, required UI components, data states, and core functionalities for each screen.

---

## 1. Authentication & Onboarding Flow

### 1.1 Welcome Screen (`app/(auth)/welcome.tsx`)
- **Purpose:** The entry point for unauthenticated users, explaining the aggressive accountability philosophy.
- **UI Components:**
  - Full-screen Reanimated background (dark, intense aesthetic).
  - High-impact typography stating the app's value proposition ("Execution over Intention").
  - `GoogleSignInButton` (Supabase Auth).
- **State/Data:** Listens to Supabase Auth state.
- **Functionality:** Initiates the Google OAuth flow via `expo-auth-session`. On success, redirects to the Onboarding Screen (if profile is incomplete) or Dashboard.

### 1.2 Onboarding Screen (`app/(auth)/onboarding.tsx`)
- **Purpose:** Collects the constraints and preferences required for the AI to generate a personalized routine.
- **UI Components:**
  - Multi-step pager (Zustand controlled).
  - Form inputs: Goal selection, "Grind Type", Daily Available Minutes (slider), Wake/Sleep Time pickers, Motivation Level (1-10 slider), Accountability Mode (e.g., Coach, Drill Sergeant).
  - "Generate Routine" action button.
- **State/Data:** Ephemeral local state (Zustand) until submitted.
- **Functionality:** 
  - Validates inputs via Zod.
  - Submits the profile to the local SQLite `users` table.
  - Triggers the Gemini AI Edge Function to draft the initial routine.

### 1.3 Interactive AI Question Screen (`app/(auth)/ai-question.tsx`)
- **Purpose:** An intermediate screen that appears *only if* the Gemini API requests more context (e.g., "What gym equipment do you have at home?").
- **UI Components:**
  - AI Avatar / Chat bubble displaying the question.
  - Text Input / Multi-select chips for the user's answer.
- **State/Data:** Context passed from the AI Gateway via React Query.
- **Functionality:** Appends the user's answer to the prompt history and re-submits the generation request to the Edge Function.

---

## 2. Core Authenticated Flow (Tabs Layout)

### 2.1 Dashboard: Today's Grind (`app/(tabs)/index.tsx`)
- **Purpose:** The primary landing page focusing purely on today's execution.
- **UI Components:**
  - **Header:** Current date, dynamic greeting, User Avatar.
  - **Progress Section:** Circular Progress indicator showing daily completion percentage.
  - **Stats Pills:** Badges displaying current Streak 🔥, Promise Kept Rate 📊.
  - **Task List (FlashList):** Scrollable list of `TaskRow` components for today's generated routine and any mandatory Recovery Tasks.
  - **Habit Tracker:** Horizontal scroll or grid showing simple binary daily habits.
- **State/Data:** 
  - `useTasks` (React Query) fetching from local SQLite `tasks` where `scheduled_time` is today.
  - Streak/Score calculators reading historical `task_completions`.
- **Functionality:**
  - Swipe right on a `TaskRow` to mark complete (Triggers XP gain animation).
  - Swipe left to skip (Opens a modal asking for the "Skip Reason").
  - Tapping a task navigates to `Task Detail`.

### 2.2 Routine Manager (`app/(tabs)/routine.tsx`)
- **Purpose:** High-level view of the overarching AI plan and long-term goals.
- **UI Components:**
  - Overview card showing the current routine "Goal" and "Version".
  - List of all recurring tasks and their priorities.
  - "Regenerate Routine" floating action button (FAB).
- **State/Data:** Fetches from `routines` and aggregated `tasks` tables via SQLite.
- **Functionality:** 
  - Allows users to pause the routine or request a complete AI regeneration if their schedule or goals change.

### 2.3 Weekly Review & Analytics (`app/(tabs)/review.tsx`)
- **Purpose:** A historical breakdown of consistency, visualizing the user's adherence and the AI's feedback.
- **UI Components:**
  - Bar charts (Consistency Score over the week).
  - Summary Cards: Tasks Completed vs. Tasks Missed, Recovery Tasks completed.
  - "AI Roast/Feedback" Text Block: Dynamic text based on behavior (e.g., "You missed two critical tasks this week. Your promises mean nothing unless executed.").
- **State/Data:** Queries `weekly_reports` and aggregates `task_completions`.
- **Functionality:** Auto-generates at the end of the week, pulling insights via a background Gemini API call to summarize the user's raw completion data.

### 2.4 Settings & Profile (`app/(tabs)/settings.tsx`)
- **Purpose:** Manage app preferences, notifications, and accountability levels.
- **UI Components:**
  - Accountability Mode toggles (determines the severity of the Consequence Engine).
  - Notification Permissions switch.
  - "Sign Out" button.
- **State/Data:** Modifies the local `users` table and syncs to Supabase.
- **Functionality:** Updating the Accountability Mode triggers a background recalculation of future consequence weights.

---

## 3. Detail & Consequence Flows

### 3.1 Task Detail & Consequence Modal (`app/task/[id].tsx`)
- **Purpose:** Deep dive into a specific task's requirements and the enforcement of penalties.
- **UI Components:**
  - Task Title, Category, Priority, Estimated Duration.
  - Detailed Description/Instructions (generated by AI).
  - **Consequence Warning Box:** Prominently displays what will happen if skipped (e.g., "If you skip this CRITICAL task, you will be assigned a 30-minute mandatory recovery task tomorrow.").
  - "Complete Task" (Primary Button) / "Skip Task" (Destructive Button).
- **State/Data:** Fetches specific task ID from SQLite.
- **Functionality:**
  - If "Complete" is pressed: Logs completion, awards XP, navigates back to Dashboard.
  - If "Skip" is pressed: 
    1. Prompts for a text explanation ("Why are you skipping?").
    2. The Consequence Engine runs locally, immediately inserting a `recovery_task` into the database for tomorrow.
    3. Triggers a harsh haptic feedback and displays a penalty confirmation toast.
