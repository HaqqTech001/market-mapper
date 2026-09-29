# Native migration

This branch is the controlled migration from the original Vite/React prototype to the production-target React Native + Expo application.

## Rules

- `master` remains the reference implementation until native parity is reached.
- Expo/React Native is authoritative on this branch.
- Existing domain logic under `src/` is preserved and ported deliberately.
- Do not claim a capability is native until its dependency, adapter, UI, and validation exist.
- Web-only files remain temporarily as migration reference and are excluded from the native TypeScript entry path where necessary.

## Stage 1 checkpoint

Implemented:
- Expo application entry via `expo-router/entry`
- React Native runtime dependencies
- Expo Router root layout
- native foundation screen
- Expo TypeScript base configuration
- Android/iOS package identifiers

Not yet implemented:
- Expo SQLite adapter
- native map/location
- native authentication/session persistence
- camera/media
- notifications
- operational Supabase schema/sync
- native ports of mapping workflows

Those are subsequent controlled stages.


## Native path recorder checkpoint

Implemented on the migration branch:
- Expo Location foreground GPS stream
- react-native-maps authoritative field renderer
- existing movement detector reused for stationary drift / movement acceptance
- every raw GPS sample persisted to Expo SQLite while recording
- multi-segment Pause / Resume
- unfinished session recovery
- Finish -> Review separation
- Save -> finalized local path + existing outbox queue
- explicit confirmed Discard

Integration blockers before production use:
- replace temporary native field mission ID with authenticated selected mission context
- replace temporary save owner with authenticated profile ID
- wire correction controls (undo distance/time, trim, restart from junction) into native Review UI
- physical Android GPS/recovery validation remains required
