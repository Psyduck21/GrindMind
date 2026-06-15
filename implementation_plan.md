# GrindMind V2: Comprehensive Feature QA Plan

To "test all the features for QA", we must validate every layer of the application (Data, Intelligence, Business Logic, and UI). Since we do not have a traditional automated Jest suite configured for the Expo/SQLite environment, I propose a multi-phased testing approach leveraging static analysis, isolated scripts, and an End-to-End Browser Subagent.

## User Review Required
> [!IMPORTANT]
> Since I am an AI, I cannot physically tap on your Android device. To test the UI features, I will use my **Browser Subagent** tool to launch the app via `npx expo start --web`, navigate through the screens, and verify the UI logic. Please approve the testing phases below.

## Phase 1: Static Analysis & Integrity
Before running the app, we must ensure the codebase is structurally sound.
- Run `npx tsc --noEmit` to verify 100% type safety across all React components and services.
- Run `npx expo-doctor` to verify there are no underlying dependency conflicts or mismatched Expo SDK versions.

## Phase 2: Business Logic Unit Tests (Node.js Scripts)
I will write isolated JavaScript test scripts (similar to our stress benchmark) to validate the core engines without needing the UI.
- **Gamification Engine Test:** Validate that `badgeEngine.ts` correctly awards the "Unbreakable" badge only when the streak crosses 7 days.
- **AI Context Hydration Test:** Validate that `hydrateContextWindow` correctly formats the SQLite tasks into the dense JSON array required by Gemini.

## Phase 3: End-to-End (E2E) Browser Subagent Testing
I will spin up a browser subagent, compile the app for the web (`npx expo start --web`), and perform visual QA on the following features:
1. **Dashboard:** Verify the calendar hub renders tasks correctly.
2. **AI Orchestrator:** Click the floating action button to open the modal and ensure the UI doesn't crash.
3. **Zen Mode:** Navigate into a task details screen, launch Zen Mode, and verify the `CircularProgress` wheel mounts.
4. **Profile Hub:** Navigate to the Settings/Profile tab to verify the XP bar and Badge Grid render correctly.

## Deliverable
Upon approval, I will execute these phases and compile a final **Comprehensive Feature QA Matrix** artifact detailing the pass/fail status of every V2 module.
