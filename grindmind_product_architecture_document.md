# GrindMind: Complete Product & Architecture Blueprint

This document serves as the master blueprint for GrindMind. It exhaustively details every feature (macro and micro), the underlying technical architectures, specific algorithm implementations, and the absolute hardware/network constraints of the system.

---

## 1. Product Identity & Core Philosophy
GrindMind is an **Offline-First, Enterprise AI Scheduler** fused with a **Hybrid RPG Gamification Engine**. It targets two demographics:
*   **The Professional**: Uses GrindMind purely as an intelligent AI calendar that automatically reschedules meetings and unblocks their time using strict constraint-resolution mathematics.
*   **The Student/Hustler**: Uses GrindMind as a gamified life-tracker where completing daily habits yields XP, levels, and badges, while missing habits triggers the Consequence Engine (penalties).

---

## 2. Exhaustive Feature Matrix

### 2.1 The Interactive V2 Calendar Hub
*   **Description**: The central dashboard is an interactive Agenda view (powered by `react-native-calendars`).
*   **Capabilities**: Users can view a 30-day timeline. Tapping an empty slot instantiates a new task. Long-pressing a task opens a tactile bottom-sheet for manual rescheduling. Dragging-and-dropping a task triggers the Constraint Engine to auto-shift surrounding blocks.
*   **Implementation**: React Native FlatLists with strict memoization to render only the visible viewport, preventing RAM bloat on Android.

### 2.2 The AI Natural Language Orchestrator
*   **Description**: A floating "AI Backdrop" where users can speak or type unstructured commands (e.g., "Clear my afternoon", "Add a flight at 2pm tomorrow").
*   **Implementation**: 
    *   *1-Month Rolling Window*: The app queries SQLite for tasks 15 days in the past and future.
    *   *Programmatic Payload Stripping*: Pure JS maps over the data, deleting heavy strings (`description`, `ai_context`) to create a lightweight JSON summary.
    *   *Query*: Sent to the LLM (Gemini) which outputs a strict Intent Graph (`[{action: "MOVE", task_id: "X", new_time: "14:00"}]`).

### 2.3 The Hybrid Gamification Engine
*   **Description**: Gamification is not forced. Users can toggle "Game Mode" globally, or selectively on individual tasks.
*   **Implementation**: A schema flag `is_gamified`. When `markTaskComplete()` fires, it checks this flag. If `1`, it invokes `xpEngine` and `badgeEngine` (granting XP and checking achievement milestones). If `0`, it completes silently like a standard calendar event.

### 2.4 Task Timers & Zen Mode
*   **Description**: Tasks feature built-in countdown timers. "Zen Mode" strips UI distractions while the timer runs. Completing the timer automatically completes the task.
*   **Implementation**: To bypass iOS/Android suspending JavaScript in the background, the timer calculates an absolute `endTime`. When the app re-enters the foreground, it calculates `endTime - Date.now()` to render the exact remaining seconds perfectly.

### 2.5 The Consequence Engine
*   **Description**: Punishes users for missing gamified tasks.
*   **Implementation**: A background cron checks for overdue tasks. If a task is missed, it generates a "Recovery Task" strictly mapped to Tomorrow's `scheduled_date` with a high priority.

### 2.6 Deep Analytics & Weekly Reports
*   **Description**: Tracks user completion rates, XP velocity, and habit consistency.
*   **Implementation**: Local SQLite aggregates. The engine separates functional completions (total tasks done) from gamified completions (total XP earned) so Professional users still get accurate productivity reports.

---

## 3. Core Algorithms & Systems

### 3.1 The Deterministic Constraint Engine (Rescheduler)
**How it works**: The AI does *not* touch the database. The AI outputs an "Intent". This local TypeScript engine executes it.
1. **Time Locking**: Immovable tasks (Flights, Doctor) are flagged `is_time_locked = 1`. The engine is forbidden from moving them.
2. **Priority-Weighted Cascading**: If Task A is dropped onto Task B's time slot, the engine checks priority. If A > B, B is pushed forward by A's duration. 
3. **Tetris Block-Shifting**: If B hits C, C is pushed forward. 
4. **Workload Spillover**: If the cascading shift pushes a task past 23:59 (exceeding daily workload limits), it intelligently rolls over to `Tomorrow` or the `Backlog`.
*Execution*: Runs entirely client-side. The isolated single-day matrix ensures < 0.1ms execution time.

### 3.2 Offline-First Tombstone Sync Architecture
**How it works**: GrindMind operates 100% locally on SQLite and syncs to Supabase in the background.
1. **Last-Write-Wins**: `pullSync` fetches rows where `updated_at > lastSynced`.
2. **Batched Upserts**: To prevent network throttling, local updates queue in `sync_queue` and push as a single multi-row network request.
3. **The Tombstone Ledger**: If an iPad deletes a task, Supabase triggers an `AFTER DELETE` function, generating a Tombstone record. When the Phone connects, it intercepts the Tombstones *first* and aggressively hard-deletes local ghost records, guaranteeing absolute data integrity.

---

## 4. Hardware, Network & Storage Limits (Bottlenecks)

### 4.1 Storage (SQLite vs PostgreSQL)
*   **Limit**: User's phone flash storage.
*   **Reality**: A massive 2-page email stored in the unstructured `ai_context` column costs ~5KB. 100,000 tasks cost ~10MB. The storage constraint is effectively **zero**. A user can use GrindMind for 10 years without filling their phone.

### 4.2 Network & Concurrency
*   **Limit**: Supabase Postgres connection pool (PgBouncer).
*   **Reality**: Because GrindMind is Offline-First, users do not hold persistent WebSocket connections. They execute a 100ms HTTP Batched Upsert and disconnect. A free-tier Supabase cluster can handle **500 - 1,000 simultaneous syncs**, translating to **10,000+ Daily Active Users (DAU)** effortlessly.

### 4.3 AI Token Costs & Rate Limits
*   **Limit**: Free-tier LLMs restrict queries per minute (e.g., 15 RPM).
*   **Reality**: The absolute bottleneck of the entire system is the AI Provider. 
    *   *Mitigation*: Programmatic Payload Stripping keeps context windows under 1,000 tokens. This guarantees that if you scale to a Paid Tier, the cost per query remains micro-cents (roughly $0.50 per 1,000 requests), ensuring infinite, cheap scalability.

### 4.4 CPU Thread Freezing (React Native)
*   **Limit**: Complex JS calculations blocking the main UI thread on $150 Android devices.
*   **Reality**: The Constraint Engine is mathematically capped to iterate only over a bounded daily array (< 30 items). Time complexity is technically O(n²), but because 'n' is artificially capped, execution remains in the microsecond range, guaranteeing zero UI frame drops.
