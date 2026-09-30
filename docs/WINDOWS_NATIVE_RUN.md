# Windows Local Run — Native Migration Branch

This guide is for `migration/native-expo-foundation`. Do not use `master` for native testing.

## Prerequisites
- Git
- Node.js 22 LTS or newer compatible Node 22 release
- Android Studio with Android SDK, Platform Tools, emulator (or an Android phone with USB debugging)
- JDK 17 available to Gradle
- A working Supabase project with this branch's migrations applied

## Pull the branch
If you already cloned the repository:

```powershell
git fetch origin
git switch migration/native-expo-foundation
git pull origin migration/native-expo-foundation
```

If the branch does not exist locally:

```powershell
git fetch origin
git switch -c migration/native-expo-foundation --track origin/migration/native-expo-foundation
```

For a fresh clone:

```powershell
git clone https://github.com/HaqqTech001/market-mapper.git
cd market-mapper
git switch migration/native-expo-foundation
```

## Environment
Copy the example:

```powershell
Copy-Item .env.example .env
```

Fill in:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_ENV=development`

Never put a Supabase service-role key in the app.

## Install
Use npm for this local validation:

```powershell
npm install
npx expo install --check
npm run typecheck
```

If Expo reports dependency version mismatches:

```powershell
npx expo install --fix
npm run typecheck
```

## Android native run
The `android/` directory is intentionally not committed yet. Generate the native project locally:

```powershell
npx expo prebuild --platform android
npm run android
```

Have an Android emulator already running, or connect a USB-debugging Android device and confirm it appears in:

```powershell
adb devices
```

## Metro only
After the development build is installed:

```powershell
npm start
```

For a physical phone on the same network, Expo/Metro can normally connect over LAN. USB debugging is the more reliable first native validation path.

## Important
- Windows can build/run Android locally.
- iOS native compilation/signing requires macOS/Xcode.
- Do not delete the app's SQLite data casually after field testing; it may contain unsynced records.
- Background location is not enabled in this migration yet.
- Native physical GPS/media/map behavior still requires real-device validation.
- Apply the Supabase migrations in `supabase/migrations/` to the target project before testing cross-device sync/RLS.
