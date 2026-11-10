# Doyo

Hackathon entry (PayPal AI Hackathon, due 2026-11-13): a home-services marketplace for Pakistan where an AI
agent books and negotiates with workers for the customer, and PayPal (sandbox) takes payment and pays workers.
`frontend/` is the Expo app, `backend/` is the Node/Fastify API live at `https://api.letdoyo.com`.

## How I want you to work

- Be terse. Answer, then stop. No recap, no list of offers at the end.
- "Answer in chat" means no file changes. Never make a change I did not ask for.
- Smallest change that does the job. If I say no, drop it for good.
- When wrong, say the correct thing in one line.
- Verify against what is live or built, and say plainly what you could not check.
- Version numbers stop at .9: after 1.0.9 comes 1.1.0.

## Shipping (no PC, no Expo services)

Everything deploys from GitHub Actions to our VM (`.github/workflows/`). Push and it ships:

- `frontend/**` → the JS bundle is exported and published to our own update server
  (`backend/src/ota.ts`, `https://api.letdoyo.com/ota/manifest`). The phone app applies it the next time it is
  opened or brought back (`frontend/services/liveUpdates.ts`). Tell me to reopen the app.
- `backend/**` → type-checked and deployed to the VM; the workflow waits for `/health`.
- `website/**` → the marketing site and the operations dashboard, published to `letdoyo.com`.
- A native change (new native package, plugin, permission, anything in `app.json` outside JS) cannot ship as an
  update: bump `expo.version` in `frontend/app.json` (it is the runtime version updates are matched on). Pushing
  `app.json` or `package.json` to `main` builds a new APK, downloadable at `https://api.letdoyo.com/ota/app.apk`.

Type-check (`npx tsc --noEmit` in `frontend/` or `backend/`) before pushing, then check the workflow run with
`gh run list` / `gh run watch` and tell me if it failed.

## Rules

- Never copy code from the Saafify repo (`myApp`, `saafify-backend`); that code is under NDA.
- Secrets never go in the repo or in chat: `backend/.env.secrets`, `paypal-sandbox-accounts.txt` and the VM `.env`.
- Styles are palette factories (`makeXStyles = (c: Palette) => StyleSheet.create(...)` via `useThemedStyles`).
- i18n keys are the English string; Urdu needs an entry in `frontend/i18n/translations.ts`.
- `CustomAlert`, never `Alert.alert`. `phosphor-react-native` for icons. New screens go in both
  `navigation/types.ts` and `App.tsx`.
- Realtime is sockets; never add polling.
- The whole app runs in demo mode: `reviewLocation` is set for everyone, the start code is `0000`, worker
  onboarding skips approval, and "Continue demo flow" performs the simulated worker's next step.
