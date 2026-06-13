# Mobile Frontend Architecture Document: GrindMind

## 1. Mobile Framework & Paradigm Selection

**Recommendation:** Cross-Platform using **React Native with Expo**.

**Justification:**
Based on the PRD's requirement for a high-performance, animation-rich, gamified experience and the need for rapid deployment to both iOS and Android, React Native via the Expo framework is the ideal choice. 
- **Timeline & Complexity:** Expo handles the heavy lifting of native compilation, OTA (Over-The-Air) updates, and plugin management, accelerating time-to-market.
- **Performance:** With the New Architecture (Fabric) and JSI-based modules (like `react-native-reanimated` and `expo-sqlite`), React Native achieves near-native performance that easily satisfies the UI requirements of GrindMind's dynamic dashboard.

---

## 2. State Management & Data Flow

**Local UI State:** `Zustand`
- Zustand provides a lightweight, boilerplate-free global store. It will manage ephemeral UI states, animation triggers, and gamification overlays (like XP popups) without causing unnecessary re-renders.

**Remote State & Caching:** `@tanstack/react-query`
- React Query handles the complex logic of fetching, caching, and invalidating backend AI data. It seamlessly manages loading states and retries when calling the Gemini Edge Functions.

**Offline-First Strategy:** `Expo SQLite` (The Single Source of Truth)
- GrindMind relies on an aggressive "Accountability Coach" where users must be able to log completions instantly. 
- **Implementation:** All UI components read from and write directly to `Expo SQLite`. Network connectivity is only required for AI routine generation and background syncing to Supabase. This guarantees that checking off tasks and evaluating the Consequence Engine happens in <16ms, ensuring a perfectly snappy experience.

---

## 3. Backend Integration (Aligning with System Architecture)

**Communication Protocols:**
- **AI Gateway:** Synchronous REST calls over HTTPS to Supabase Edge Functions for generating routines.
- **Cloud Sync:** Asynchronous REST batch payloads to Supabase Postgres (via the `supabase-js` client) to reconcile the local SQLite state with the cloud.

**Authentication & Authorization:**
- **Flow:** Users authenticate via Google OAuth using `expo-auth-session` and `expo-web-browser`.
- **Token Storage:** Upon successful redirect from Supabase `/auth/v1/callback`, the session token is securely stored in `expo-secure-store` (backed by iOS Keychain and Android Keystore).
- **Session Management:** The Supabase client automatically handles refresh token rotation, ensuring the user remains persistently logged in.

---

## 4. Navigation & Deep Linking Architecture

**Core Structure:** `Expo Router` (File-based routing)
- **(Auth) Stack:** `welcome.tsx` and `onboarding.tsx` for unauthenticated users.
- **(Tabs) Layout:** The core authenticated experience.
  - *Index (Dashboard):* The "Today's Grind" view.
  - *Routine:* Managing and editing the AI-generated routines.
  - *Settings:* Profile and accountability mode configurations.
- **Modals/Stacks:** `task/[id].tsx` for detailed task views and recovery penalty flows.

**Deep Linking & Universal Links:**
- Expo Router natively supports deep linking. Links like `grindmind://task/123` will route users directly from push notifications or email weekly reports straight into the specific task detail screen, bypassing the home screen.

---

## 5. Device Capabilities & Background Tasks

**Native Device APIs:**
- **Push Notifications (`expo-notifications`):** Crucial for the Accountability Coach. Aggressive local notifications warn users of impending penalties if tasks are not completed before their deadline.
- **Secure Storage (`expo-secure-store`):** For JWT tokens and Gemini API Fallback Keys.

**Background Tasks:**
- **Background Sync (`expo-background-fetch` / `expo-task-manager`):** Used to perform periodic silent syncs of local SQLite data (task completions, skip reasons) up to the Supabase cloud. 
- **Battery Optimization:** Sync tasks are registered with the OS to only run during opportunistic windows (e.g., when the device is charging or on Wi-Fi) to prevent battery drain.

---

## 6. App Performance & Release Strategy

**Performance Optimizations:**
- **List Scrolling:** Utilizing `@shopify/flash-list` instead of standard FlatList. FlashList recycles views under the hood, ensuring buttery smooth 60fps scrolling even if the user has hundreds of historical task logs.
- **Animations:** Offloading UI thread work by using `react-native-reanimated` for all gamification effects and progress bar animations.
- **Bundle Size:** Utilizing EAS (Expo Application Services) Build with Hermes engine enabled, significantly reducing TTI (Time to Interactive) and APK/IPA bundle sizes.

**CI/CD Pipeline & Release Strategy:**
- **Pipeline:** Managed entirely via `EAS Build` and `EAS Submit`. GitHub Actions triggers builds on merges to the `main` branch.
- **OTA Updates:** Minor bug fixes and UI tweaks are shipped instantly via `EAS Update`, bypassing the App Store review process.
- **Store Release:** Native binary changes (e.g., adding new native modules) are pushed to Google Play Tracks (Internal -> Beta -> Prod) and Apple TestFlight via EAS Submit.

---

## 7. Mobile Architecture Diagram

```mermaid
flowchart TD
    %% Layers
    subgraph UI Layer [UI Layer - React Native components]
        Screens[Screens & Views]
        Components[Dumb Components / Widgets]
        Hooks[Custom React Hooks]
    end

    subgraph State Layer [State & View-Model Layer]
        Zustand[(Zustand - Ephemeral State)]
        ReactQuery{{React Query - Remote Cache}}
    end

    subgraph Data Layer [Repository & Data Layer]
        LocalDB[(Expo SQLite)]
        SyncMgr[Background Sync Manager]
        AuthMgr[Auth Manager]
        SupabaseClient[Supabase Client]
    end

    subgraph External Interfaces [System Architecture Boundaries]
        Edge[Supabase Edge Functions / AI]
        CloudDB[(Supabase Postgres DB)]
        OAuth[Google Auth]
        SecureStore[(Keychain/Keystore)]
    end

    %% UI to State
    Screens --> Hooks
    Hooks --> Zustand
    Hooks --> ReactQuery

    %% State to Data
    ReactQuery --> LocalDB
    ReactQuery --> SupabaseClient
    ReactQuery --> AuthMgr

    %% Data to External
    LocalDB <--> SyncMgr
    SyncMgr -.-x|Async Batch Payload| CloudDB
    
    AuthMgr --> OAuth
    AuthMgr <--> SecureStore
    
    SupabaseClient --> Edge

    %% Styling
    classDef ui fill:#fce4ec,stroke:#880e4f,stroke-width:2px;
    classDef state fill:#fff8e1,stroke:#f57f17,stroke-width:2px;
    classDef data fill:#e8eaf6,stroke:#1a237e,stroke-width:2px;
    classDef external fill:#eceff1,stroke:#263238,stroke-width:2px;

    class UI Layer ui;
    class State Layer state;
    class Data Layer data;
    class External Interfaces external;
```
