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
