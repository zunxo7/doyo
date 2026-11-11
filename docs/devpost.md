# Devpost submission

Paste-ready text for the PayPal AI Hackathon 2026 form. Anything in [brackets] still has to be filled in.

## Project name

Doyo

## Tagline

Tell Doyo what you need. It negotiates with workers, books within your limit, and pays them through PayPal.

## Links

- Website (hosted demo): https://letdoyo.com
- Operations dashboard: https://letdoyo.com/dashboard
- Android app: https://api.letdoyo.com/ota/app.apk?v=37mb
- Repo: https://github.com/zunxo7/doyo
- Video: [YouTube url]

## Testing instructions (private field for judges)

1. Install the APK (Android phone or arm64 emulator).
2. **Continue with Email** → `judge@letdoyo.com` → code `1234`. Any `@letdoyo.com` address works with `1234`.
3. Type "Deep clean 3 rooms" or tap a suggestion, then **Book it**. PayPal is pre-linked to a sandbox account,
   so there is no PayPal sign-in and no real money.
4. Watch Doyo negotiate. Tap **Take over** to counter or accept a worker yourself, or **Let Doyo** to hand back.
5. When booked, tap **Track on map**, then **Continue demo flow**: the worker drives the route, arrives, starts
   (code `0000`) and completes. PayPal is charged and the worker is paid out; the receipt appears in the chat.
6. Dashboard: open https://letdoyo.com/dashboard with the same email and code. Tap **Ask Doyo** to ask about
   bookings or have it build a chart.
7. Worker side: in the menu, tap **Worker mode**, go online, and send an offer on the request that arrives.

Demo mode: everyone is placed at G-10 Markaz, Islamabad, and four AI workers answer every request.

## Inspiration

In Pakistan you book a cleaner, a car wash or a barber by phoning around and haggling, then pay in cash.
Ride-hailing apps here already let people bid on a fare, so negotiating in an app is familiar. Nobody enjoys
doing the negotiating. That is a job for an agent that holds a budget, talks to the other side, closes the deal
and moves the money.

## What it does

**Customer.** The home screen is a chat, in English, Urdu or Roman Urdu. Doyo turns "deep clean 3 rooms" into
a job card with a starting price and a **Never over** limit. It posts the job, and workers' offers arrive in the
chat as cards with photo, rating, distance and price. Doyo counters by name and books the best offer. The
customer can take over at any point to counter or accept, then hand back. Nothing is charged at booking: PayPal
is charged the agreed price when the job is done.

**Worker.** Requests arrive live. Accept the price or send your own. A counter shows on your card as
"Customer offers PKR 450". Your share is paid to your PayPal when you complete the job.

**Operations.** An AG Studio dashboard shows bookings, negotiations and PayPal money flow live, with an
assistant that answers questions and builds widgets on request.

## How we built it

- **App:** Expo / React Native, MapLibre, one app for both sides. Updates ship over the air from our own
  expo-updates server.
- **Backend:** Node 24, TypeScript, Fastify, WebSockets, SQLite, on one VM; GitHub Actions deploy everything.
- **Booking agent:** Claude Sonnet with tools that are real marketplace actions: `wait_for_offers`,
  `counter_offer`, `raise_price`, `accept_offer`, `hand_back`. Each call carries the line Doyo says in the chat.
- **Planner:** Claude Haiku with structured output turns text into a plan, reads it in the context of the
  conversation, and answers scope questions from the same service scope the app shows.
- **Workers:** four Claude Haiku personas with their own price floors; they and real workers bid together.
  Their messages state only true facts about the job.
- **Dashboard:** AG Studio with six custom widgets and a Claude-backed agent built on its agent framework.

## How we used PayPal

| Moment | PayPal |
|---|---|
| Customer links PayPal once | Vault: setup token → approval → payment token (Server SDK) |
| Job completed | Orders: create and capture with the saved token (Server SDK) |
| Worker paid | Payouts API, batch id = job id, so a job can't pay out twice |
| Worker settles commission on cash jobs | Orders: create → approve → capture |

Vault is what makes the agent useful: the customer approves PayPal once, and Doyo can book and settle later
without another checkout, inside a limit the server enforces.

## How we used AI

- It plans, negotiates, and explains every action in the chat.
- It is constrained in code, not just in the prompt. The server refuses any booking over the customer's limit,
  and any booking more than 5% above the cheapest open offer; the refusal goes back to the agent, which
  decides again. A turn limit, a daily call cap and a rule-based fallback keep bookings working.
- It is cheap where it can be: small talk ("hi", "salam", "thanks") is answered without a model call, and the
  agent only calls the model when the offers have changed.

## Challenges

- **Trusting an agent with money.** Prompts alone weren't enough: in testing the agent once picked a pricier
  worker. Hard rules moved into server checks.
- **Negotiating with people.** People answer in seconds, models in one; the agent waits for humans and its
  counter appears on the worker's own card.
- **No PKR in PayPal.** Amounts are shown in PKR and converted at a fixed demo rate in the sandbox.

## What's next

Local payment rails next to PayPal, holds for large jobs, and ratings and history as inputs to the agent.

## Built with

`claude` `paypal` `paypal-server-sdk` `paypal-payouts` `apimatic` `ag-grid` `ag-studio` `react-native` `expo`
`typescript` `node.js` `fastify` `websockets` `sqlite` `maplibre` `github-actions`

## Tools and how they were used

| Tool | Use |
|---|---|
| PayPal Server SDK (APIMatic-generated) | Vault tokens, Orders create and capture |
| PayPal Payouts API, sandbox | Worker payouts; buyer and business test accounts |
| APIMatic Context Plugin | In-editor lookups of the SDK's endpoints and models while writing the integration |
| AG Studio (AG Grid) | Operations dashboard, custom widgets, agent framework |
| Claude Sonnet / Haiku | Booking agent; planner, simulated workers, dashboard assistant |
| Claude Code | Pair-programming across app, backend, dashboard and pipeline |

## Disclosure: prior work

The app's visual shell (theme, sign-in, map, tracking and worker screens) is based on my earlier app, Saafify.
Built during the hackathon: the backend, the agent chat, the booking agent and simulated marketplace, the
PayPal integration, the dashboard, the website, the update server and the deploy pipeline.
