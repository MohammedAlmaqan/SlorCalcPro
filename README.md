# SlorCalcPro

Professional solar system design tool for Android — 100% offline.

- **Platform:** Android (Play Store via EAS, AAB)
- **Connectivity:** None required. No `INTERNET` permission is granted.
- **Stack:** Expo SDK 57 · React Native 0.86 · TypeScript (strict) · Expo Router · React Native Paper
- **Scope:** See `Technical_Studay.md` (requirements) and `PLAN.md` (approved plan).
- **Progress:** See `CHANGELOG.md`.

## Requirements

- Node.js ≥ 22.13
- An Expo account (`owner: merathdev`) for EAS remote builds

## Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run start` | Start Expo dev server |
| `npm run android` | Run on Android device/emulator |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (write) |
| `npx expo-doctor` | Expo project health check |
| `npx eas build --profile production --platform android` | Release AAB |
