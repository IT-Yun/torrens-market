# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## 🛑 EAS build policy (Sean, 2026-08-30 — absolute)
- NEVER run `eas build` (any profile/platform) unless Sean explicitly approved **that specific build** in the current conversation. 13 of the 15 free-tier iOS builds/month were burned in one day by per-feature builds.
- Batch every pending change into ONE build. JS-only changes ship via `eas update` (OTA), not a new binary.
- Before asking for a build: state this month's build count (`eas build:list`) and the full batched scope.
- `eas submit` and OTA publishes: announce before running (claim → run → announce).
