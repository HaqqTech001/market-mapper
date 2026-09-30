# Native productionization status

This branch is the controlled migration from the original Vite/React prototype to the production-target React Native + Expo application. `master` remains protected/reference until native parity and validation.

## Implemented in code

- Expo Router / React Native application foundation.
- Expo SQLite is the authoritative native local database; reference catalogue seed only on the native migration path.
- Supabase session persistence via SecureStore and authenticated profile/role resolution.
- Mapping is restricted to missions assigned through `mission_members`; no temporary mission/current-user fallback.
- react-native-maps + Expo Location foreground GPS.
- Durable path recorder: raw samples, movement filtering, stationary state, Pause/Resume, multi-segment recording, Finish -> Review -> Save, review crash recovery, explicit Discard.
- Capture during active/paused path without changing path state:
  - four-step Business flow with catalogue offerings and optional photo/Photo Declined;
  - eight-type Junction picker;
  - Place capture;
  - Field Issue capture.
- Junction branch persistence and Remaining Branches workflow; selected branch progresses UNMAPPED -> IN_PROGRESS -> MAPPED when its new path is actually finalized.
- Native business photos: camera/gallery selection, resize/compression, durable local staging and independent upload queue.
- Real outbox synchronization code for Businesses/Offerings, Paths, Junctions/Branches, Places and Field Issues.
- Separate Supabase Storage media worker; relational records do not depend on photo upload success.
- Sync HUD and Offline Data / Sync Centre with pending/failed counts, bounded retry and preserved suspected conflicts.
- Supabase/PostGIS migrations for operational paths, junction graph, places, businesses, offerings, issues and private field-media storage with RLS/storage policies.

## Deliberately not claimed as verified

These changes have been committed through the GitHub integration; they have NOT yet been installed and exercised on a physical Android device in this workflow.

Before production release, still required:
1. Install dependencies and regenerate/verify the package lock.
2. Run TypeScript/typecheck and resolve any Expo 57 API/version mismatches.
3. Run `npx expo prebuild` and `npx expo run:android` locally.
4. Apply Supabase migrations to a non-production/staging project first and validate RLS with mapper/team-lead/admin accounts.
5. Validate GPS drift/movement, Pause/Resume, crash recovery and branch continuation physically.
6. Validate camera/gallery permissions, durable staged files, offline capture and later Storage upload.
7. Exercise airplane-mode capture -> reconnect -> sync, server/RLS failures, retry and conflict preservation.
8. Validate tablet/iPad layouts and outdoor readability on hardware.
9. Complete/validate cloud coverage for remaining coordination domains (revisits, handovers, reconciliation, chat, notifications/catalogue administration) before those are considered production-native.
10. Add native Review correction controls (undo distance/time, trim, restart from selected point/junction); the current native Review supports save/discard and recovery but not the full correction toolset.
11. Background GPS is NOT enabled; only foreground location is currently requested/implemented.

## Production safety rules

- Never expose the Supabase service-role key in the mobile app.
- Never clear SQLite merely because a user signs out; unsynced field work may exist.
- Never display Synced unless both relational and media queues confirm completion.
- Never auto-resolve a suspected concurrent cloud/local conflict by overwriting another mapper's data.
- Never enable automatic operational demo mission seeding or implicit demo login in production.
- Browser/Vite code remains migration reference only; it is not evidence that a capability works natively.
