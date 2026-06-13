# System Architecture Document: GrindMind

## 1. Executive Architectural Summary

The chosen architectural pattern for GrindMind is an **Offline-First Mobile Architecture with a Backend-as-a-Service (BaaS) and Serverless Edge computing model**. 

**Justification:**
The PRD emphasizes a strict, "ruthless" accountability coach where users must manage daily routines and face immediate consequences. For a habit and accountability app, latency or network drops cannot be an excuse for missing a task. An offline-first approach ensures the user can always access their routine, log completions, and trigger the Consequence Engine instantaneously. By pairing this with a BaaS (Supabase) and Serverless Edge Functions, we achieve high scalability, secure AI integration, and minimal operational overhead without maintaining a traditional monolithic backend.

---

## 2. Core Modules & Services

### 2.1 Mobile Client Application (Frontend)
- **Role:** Handles UI, user interactions, local state, and offline logic.
- **PRD Features Supported:** Dashboard & Analytics, Onboarding.

### 2.2 Local Storage & State Manager
- **Role:** The primary source of truth for the user while actively using the app. Stores routines, tasks, and gamification state.
- **PRD Features Supported:** Fast UI updates, offline capability for the "Daily Grind."

### 2.3 The Consequence & Gamification Engine (Client-Side & Edge)
- **Role:** Evaluates missed tasks, calculates penalties, generates recovery tasks, and awards XP/Badges. Runs locally for immediate feedback, validated on the edge to prevent cheating.
- **PRD Features Supported:** The Consequence Engine, Gamification & Scoring.

### 2.4 AI Gateway (Serverless Edge Function)
- **Role:** Acts as a secure intermediary between the mobile client and the Gemini API. Validates user profiles, constructs prompts, and sanitizes the structured JSON response.
- **PRD Features Supported:** AI Accountability Coach, Interactive Prompts.

### 2.5 Identity & Sync Backend (Supabase)
- **Role:** Manages user authentication, cloud backup of routines/tasks, and leaderboards.
- **PRD Features Supported:** Authentication, Future Considerations (Cloud Sync, Social Leaderboards).

---

## 3. Inter-Module Communication

- **Mobile Client ↔ Local Database:** Synchronous, high-speed local SQL queries. This guarantees sub-50ms UI updates and immediate gamification feedback.
- **Mobile Client ↔ Identity Backend (Supabase Auth):** Asynchronous REST over HTTPS for login/OAuth.
- **Mobile Client ↔ AI Gateway (Edge Functions):** Synchronous REST over HTTPS. The client awaits the generated routine JSON before writing to the local database.
- **Local Database ↔ Cloud Database (Sync):** Asynchronous background synchronization (via REST or WebSocket/Realtime). Changes are queued locally and pushed to the cloud when a network connection is available to reconcile state and update global leaderboards.

---

## 4. Proposed Technology Stack

- **Frontend & Clients:** `React Native with Expo`
  - *Justification:* Allows rapid cross-platform (iOS/Android) development with native performance and a unified codebase.
- **Backend Frameworks:** `Supabase Edge Functions (Deno)`
  - *Justification:* Provides secure, auto-scaling environments to run AI prompts without exposing API keys on the client.
- **Databases:**
  - *Local:* `Expo SQLite` (Relational)
    - *Justification:* Relational structure maps perfectly to Users > Routines > Tasks > Recovery Tasks, enabling fast local joins and offline capability.
  - *Cloud:* `PostgreSQL (via Supabase)` (Relational)
    - *Justification:* Mirrors the local SQLite schema securely in the cloud with built-in Row Level Security (RLS) for data privacy.
- **AI Integration:** `Google Gemini API (gemini-2.5-flash)`
  - *Justification:* Extremely fast inference times, high context windows for complex routing logic, and native support for strict JSON schema output.
- **Caching & Infrastructure:** `Zustand` & `React Query`
  - *Justification:* React Query caches API/Edge Function responses, while Zustand provides lightweight, rapid local state management for UI animations.

---

## 5. Critical Path Data Flow

**User Journey: AI Routine Generation**
1. **Action:** User submits their daily constraints (wake time, available minutes) and requests a new routine.
2. **Client Request:** The mobile app sends a POST request with the user's profile payload and JWT auth token to the `generate-routine` Edge Function.
3. **Gateway Verification:** The Edge Function verifies the JWT against Supabase Auth.
4. **AI Processing:** The Edge Function constructs the `MASTER_PROMPT` using the user's data and makes a secure, synchronous server-to-server HTTP call to the Gemini API.
5. **Validation:** Gemini returns a JSON string. The Edge Function validates it against a strict Zod schema.
6. **Response:** The Edge Function returns the validated JSON object to the mobile app.
7. **Local Transaction:** The app opens a local SQLite transaction, inserting the new Routine and associated Tasks.
8. **UI Update:** React Query invalidates local caches, and the Dashboard re-renders immediately to show the "Today's Grind" tasks.
9. **Background Sync:** The app queues an asynchronous sync to mirror these new tasks into the Supabase Postgres database.

---

## 6. Addressing PRD Constraints (NFRs)

- **Scalability:** The serverless architecture (Supabase Edge Functions) means the backend automatically scales to handle thousands of simultaneous AI generation requests during peak morning hours without provisioning servers.
- **Security:** 
  - *API Keys:* The Gemini API key is completely hidden in the Edge Function environment, preventing scraping or abuse by malicious clients.
  - *Data Privacy:* Supabase PostgreSQL uses Row Level Security (RLS) so users can only ever sync and read their own task records.
- **Performance/Speed:** The offline-first SQLite database ensures that checking off tasks or triggering the Consequence Engine happens instantly with 0ms network latency. Network calls are strictly reserved for AI generation and background syncing.

---

## 7. Visual Architecture Diagram

```mermaid
flowchart TD
    subgraph Mobile Client [Mobile Application - React Native / Expo]
        UI[UI & Dashboard]
        State[Zustand State / React Query]
        LocalDB[(Local SQLite DB)]
        CE[Consequence & Gamification Engine]
        
        UI <--> State
        State <--> LocalDB
        State <--> CE
        CE <--> LocalDB
    end

    subgraph Backend Services [Supabase BaaS]
        Auth[Supabase Auth / Google OAuth]
        EdgeFn[Edge Functions - Deno]
        CloudDB[(Cloud PostgreSQL DB)]
    end

    subgraph Third-Party APIs
        Gemini[Google Gemini API]
    end

    %% Communication lines
    UI -->|1. Authenticate| Auth
    State -.->|5. Background Sync| CloudDB
    UI -->|2. Request Routine| EdgeFn
    EdgeFn -->|3. Secure Prompting| Gemini
    Gemini -->|4. Strict JSON| EdgeFn
    EdgeFn -->|Return Routine| State

    %% Styling
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef backend fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef external fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    
    class Mobile Client client;
    class Backend Services backend;
    class Third-Party APIs external;
```
