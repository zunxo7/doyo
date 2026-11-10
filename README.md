# Doyo

**Tell Doyo what you need. It negotiates with workers, books the best one within your limit, and settles
through PayPal.**

Doyo is an agentic home-services marketplace for Pakistan: home cleaning, vehicle wash, furniture shifting
and a barber at home. It was built for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/).

Home services in Pakistan are booked by phone and settled by haggling. Doyo replaces both with an AI agent
that sits between two people and completes the transaction for them: it understands the request, bargains
with real workers in a chat the customer can watch, never spends more than the customer allowed, and moves
the money through PayPal once the job is done.

## Try it

| | |
|---|---|
| Website | `https://letdoyo.com` |
| Android app | `https://api.letdoyo.com/ota/app.apk?v=37mb` |
| Sign in | Continue with Email → `judge@letdoyo.com` → code `1234` |
| PayPal | Nothing to set up: every account books with a shared PayPal **sandbox** personal account, so no real money moves. |
| API | `https://api.letdoyo.com` (`/health`) |
| Operations dashboard | `https://letdoyo.com/dashboard/`, same sign-in |

The whole app runs in a demo mode so one person can walk both sides:

- Everyone starts at G-10 Markaz, Islamabad, where the simulated workers are.
- Four AI workers bid on every request, so a booking always completes.
- After booking, **Continue demo flow** on the tracking screen performs the worker's next step
  (arrived → started → completed). The start code is always `0000`.
- Choosing **Worker** skips document checks. Going online brings a request from a simulated customer.

## How it works

### Customer

1. **Say it.** The home screen is a chat. "Deep clean 3 rooms", "gaari dho do", "haircut and beard for two".
2. **Plan.** Doyo answers with a plan card: the job, the address, the worker preference, a starting price
   and a **Never over** limit. Change anything by typing ("female worker only", "keep it under 700"), switch
   jobs, or cancel, at any point.
3. **Negotiation.** Doyo posts the request. Workers answer in the thread, Doyo counters, raises within the
   limit when nobody bites, and books the best offer, weighing price against rating and arrival time. The
   customer can tap **Take over** and choose an offer themselves.
4. **Job.** Live tracking on the map, in-app chat with the worker, a start code at the door.
5. **Payment.** When the worker completes the job, PayPal is charged the agreed price and the worker is paid
   out. The chat closes with a receipt: "PKR 950 paid with PayPal. Doyo saved you PKR 50."

### Worker

Workers use the same app. Requests arrive as job cards; a worker accepts the price or sends their own. When
Doyo asks one worker to come down, only that worker's card changes to "Customer offers PKR 950", with Accept
and Make offer still in place. Earnings and PayPal payouts appear in the Earnings tab.

### The limit is enforced by the server, not the model

The agent proposes; the server decides. `acceptOffer` refuses any offer above the customer's limit, counter
and raise prices are validated against it, and worker bids are clamped to a sane band, whatever a model
returns. The limit is never sent to workers.

## PayPal

All calls are in [`backend/src/paypal.ts`](backend/src/paypal.ts), using the
[PayPal Server SDK](https://github.com/paypal/PayPal-TypeScript-Server-SDK) (`@paypal/paypal-server-sdk`).

| Step | API | When |
|---|---|---|
| Link PayPal once | Vault: `createSetupToken` → payer approves → `createPaymentToken` | Onboarding, or the first PayPal booking |
| Charge the agreed price | Orders: `createOrder` with `payment_source.paypal.vault_id`, intent `CAPTURE` | The moment the job is completed. Nothing is charged at booking |
| Pay the worker | Payouts: `POST /v1/payments/payouts` | Right after the charge. `sender_batch_id` is the job id, so a job can only pay out once |
| Worker settles cash commission | Orders: `createOrder` + `captureOrder` | From the worker's wallet, for jobs paid in cash |

Doyo keeps 15% of each job. PayPal has no PKR, so sandbox amounts are converted at a fixed demo rate; every
amount the customer and worker see is in PKR. The SDK has no Payouts controller, so that one call goes to the
REST API directly.

## Operations dashboard

`https://letdoyo.com/dashboard/` is built on [AG Studio](https://www.ag-grid.com/studio/) and reads the same
records live over the WebSocket.

- **Pages:** Overview, Bookings, PayPal, and My charts.
- **Doyo widgets:** six custom AG Studio widget types: the latest negotiation as a chat, where the money went
  (charge → commission → payout), each booking against the customer's limit, top workers, an activity feed,
  and booking speed.
- **Ask Doyo:** an agent inside Studio's AI panel. It answers from the records with its own tools
  (`explain_booking`, `payment_problems`, queries) and builds widgets with `add_chart`: bar, line, area,
  stacked, pie, donut, funnel, KPI, gauge, table, or any Doyo widget, placed in the first free spot.
  Charts animate, and My charts is kept in the browser.
- The model call goes through the backend ([`backend/src/opsLlm.ts`](backend/src/opsLlm.ts)), so the API key
  never reaches the browser.

## AI

| Role | Model | Where |
|---|---|---|
| Booking agent | Claude Sonnet, tool use | [`backend/src/bookingAgent.ts`](backend/src/bookingAgent.ts) |
| Request → booking plan | Claude Haiku, structured output | `planRequest` in the same file |
| Simulated workers and their chat lines | Claude Haiku | [`backend/src/agents.ts`](backend/src/agents.ts) |
| Dashboard assistant | Claude Sonnet, via AG Studio's agent framework | [`dashboard/src/App.tsx`](dashboard/src/App.tsx) |

The booking agent runs a tool loop: `wait_for_offers`, `counter_offer`, `raise_price`, `accept_offer`,
`hand_back`. Each tool call is an action on the live marketplace, and each carries the line Doyo says in the
chat. Guardrails:

- Every tool call is validated against the customer's limit on the server.
- Customer text, worker names and chat messages are passed as tagged data, never as instructions.
- A daily call cap, and a rule-based fallback that keeps bookings working with no API key or during an outage.
- A hard turn limit, after which control is handed back to the customer.

## Architecture

```
frontend/   Expo SDK 57 · React Native 0.86 · MapLibre · expo-updates
backend/    Node 24 · TypeScript · Fastify · WebSockets · node:sqlite · zod
dashboard/  Operations dashboard · React · Vite · AG Studio (builds into website/dashboard)
website/    Marketing site · GSAP
.github/    Workflows: deploy backend, publish app update, publish website, build APK
```

- **Realtime:** one WebSocket per client; job rooms and the worker market are topics. No polling.
- **App updates:** the backend implements the expo-updates protocol itself
  ([`backend/src/ota.ts`](backend/src/ota.ts)), so a push ships a new JS bundle to installed apps with no
  third-party service.
- **Deploys:** GitHub Actions deploy to one VM over a key that can only run four fixed actions.

## Run it yourself

Backend (Node 24+):

```bash
cd backend
cp .env.example .env        # add ANTHROPIC_API_KEY and PayPal sandbox credentials
npm install
npm run dev                 # http://localhost:8787/health
```

Without `ANTHROPIC_API_KEY` the agent and the simulated workers fall back to rules. Without PayPal credentials
cash bookings still work. For payouts, enable Payouts on the sandbox business account.

App (Android):

```bash
cd frontend
cp .env.example .env        # EXPO_PUBLIC_API_URL=http://<your-ip>:8787 for a local backend
npm install
npx expo run:android
```

## Built with

Claude (Sonnet, Haiku) · PayPal Server SDK (Orders, Vault), Payouts REST API · APIMatic Context Plugin
(used in the editor for PayPal SDK lookups while building `paypal.ts`) · Expo, React Native, MapLibre ·
Fastify · AG Studio · GSAP · GitHub Actions · Claude Code

## Where the code came from

The app's visual shell (theme, screens for sign-in, map, tracking, worker tabs) started from the author's
earlier app, Saafify. Everything this entry is about was built for the hackathon: the backend, the agent
chat, the booking agent and simulated marketplace, the PayPal integration, the demo mode, the update server
and the deploy pipeline.

## Licence

[MIT](LICENSE)
