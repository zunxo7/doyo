# Devpost submission

Paste-ready text for the PayPal AI Hackathon 2026 form. Anything in [brackets] still has to be filled in.

## Project name

Doyo

## Tagline

Tell Doyo what you need. It negotiates with workers, books within your limit, and settles through PayPal.

## Links

- Repo: https://github.com/zunxo7/doyo
- Android app: https://api.letdoyo.com/ota/app.apk?v=37mb
- Website: [url]
- Video: [YouTube url]

## Testing instructions (private field for judges)

1. Install the Android APK from the link above, or run it on an emulator.
2. Tap **Continue with Email**, enter `judge@letdoyo.com`, then the code `1234`.
3. Choose **Customer**. On the PayPal step, tap **Link PayPal** and sign in with this sandbox buyer:
   `[sandbox personal email]` / `[sandbox personal password]`. Nothing is charged.
4. In the chat, type "Deep clean 2 rooms" (or tap a suggestion), then **Book it**.
5. Watch Doyo negotiate. When it books a worker, tap **Track on map**, then tap **Continue demo flow**
   three times: the worker arrives, starts, and completes. The start code is `0000`.
6. Back in the chat you get the receipt. The charge is on the sandbox buyer account, and the payout is on the
   sandbox business account.
7. Worker side: sign out, sign in with any other email and code `1234`, choose **Worker**, tap through
   **Continue demo flow**, and go online. A request arrives within a few seconds; send an offer.

The app is in a demo mode for the whole of judging: everyone starts in G-10, Islamabad, four AI workers
answer every request, and no documents are checked.

## Inspiration

In Pakistan you book a cleaner, a car wash or a barber by calling around, and the price is whatever you
manage to haggle. Customers don't know what is fair, workers lose time on calls that go nowhere, and it is
all settled in cash. Ride-hailing apps here already let people bid on a fare, so the habit of negotiating in
an app exists. What nobody enjoys is doing the negotiating.

That is a job for an agent. Not a chatbot that answers questions, but one that holds a budget, talks to the
other side, closes the deal, and moves the money.

## What it does

Doyo is a two-sided marketplace where an AI agent runs the transaction.

**For the customer**
- The home screen is a conversation. Say what you need in English, Urdu or Roman Urdu.
- Doyo replies with a plan: the job, the address, a starting price, and a **Never over** limit. Change it,
  switch to a different job, or cancel, just by typing.
- Doyo posts the job and negotiates in a group chat you can watch. Workers reply with offers, Doyo counters
  by name ("Sana, could you do PKR 450?"), raises the price if nobody bites, and books the best offer,
  trading price against rating and arrival time.
- You can take over at any moment and pick an offer yourself.
- You link PayPal once. Nothing is charged at booking. When the job is done, PayPal is charged the agreed
  price and the chat shows a receipt with what Doyo saved you.

**For the worker**
- Requests arrive live as job cards. Accept the price or send your own.
- When Doyo counters, your card updates to "Customer offers PKR 950". To you it is a normal price change;
  you never have to know an agent is on the other side.
- When you complete the job, your share lands in your PayPal automatically.

**The part that makes it safe to hand over**
- The limit is enforced by the server. The model can ask for anything; an offer above the limit cannot be
  accepted, by the agent or by anyone.
- Workers never see the limit.

## How we built it

- **App:** Expo / React Native. One codebase, customer and worker modes, live map tracking with MapLibre.
- **Backend:** Node 24, TypeScript, Fastify, WebSockets, SQLite.
- **Agent:** Claude Sonnet with tool use. Its tools are real marketplace actions: `wait_for_offers`,
  `counter_offer`, `raise_price`, `accept_offer`, `hand_back`. Each call carries the line Doyo says in the
  chat, so what the customer reads is what the agent did.
- **Understanding requests:** Claude Haiku with structured output turns free text into a booking plan and
  applies follow-up edits to it.
- **PayPal:** the PayPal Server SDK for Vault (save the customer's PayPal with a setup token, exchange it for
  a payment token) and Orders (charge that token when the job completes), plus the Payouts API to pay the
  worker. A job's id is the payout batch id, so a job can never pay out twice.
- **Demo marketplace:** four simulated workers, each a Claude Haiku persona with its own price floor and
  style, so judges can complete a booking alone. Real workers bid alongside them.
- **Shipping:** GitHub Actions deploy the backend and publish app updates to our own server, which speaks
  the expo-updates protocol, so installed apps pick up changes when they are next opened.

## How we used PayPal

| Moment | PayPal API |
|---|---|
| Customer links PayPal once | Vault: setup token → approval → payment token |
| Job completed | Orders: create and capture with the saved payment token |
| Worker paid | Payouts: one item per job, idempotent on the job id |
| Worker settles commission on cash jobs | Orders: create → approve → capture |

The agent is what makes the vault matter. The customer approves PayPal once, and from then on Doyo can book,
agree a price and take payment without another checkout screen, inside a limit the customer set and the
server enforces.

## How we used AI

AI is not a feature on the side; it is the counterparty.

- It plans: free text in three languages becomes a priced, editable booking.
- It negotiates: a tool-using agent bargains with several people at once and decides when to stop.
- It explains itself: every action is a line in the chat.
- It is constrained: budget checks, price clamps, a turn limit, a daily call cap and a rule-based fallback
  all live on the server.

## Challenges

- **Trusting an agent with money.** Published tests of buyer agents show they overspend. We stopped trying
  to prompt our way out of it and made the server the authority.
- **Negotiating with people, not APIs.** A person takes 20 seconds to answer; a model takes one. The agent
  waits longer when a real worker is online, and its counter shows up on the worker's own card.
- **Paying after the job without a checkout.** Moving from a hold at booking to a saved PayPal account made
  the flow one tap shorter and the chat uninterrupted.
- **No PKR in PayPal.** Amounts are shown in PKR and converted at a fixed demo rate for the sandbox.

## Accomplishments

- A full booking, from a typed sentence to a paid worker, with the customer tapping twice.
- A worker can bargain against the agent on a phone, in real time.
- Our own over-the-air update server, in about 120 lines.

## What we learned

- Agentic commerce is mostly about limits. Deciding what the agent may never do came before deciding what
  it should do.
- Showing the negotiation builds more trust than hiding it.

## What's next

- Local payment rails next to PayPal.
- A hold at booking time for larger jobs.
- Ratings and history as inputs to the agent's choice.
- An operations dashboard for disputes and payouts.

## Built with

`claude` `paypal` `paypal-server-sdk` `paypal-payouts` `apimatic` `react-native` `expo` `typescript`
`node.js` `fastify` `websockets` `sqlite` `maplibre` `remotion` `github-actions`

## Tools and how they were used

| Tool | Use |
|---|---|
| PayPal Server SDK (APIMatic-generated) | Vault setup and payment tokens, Orders create and capture |
| PayPal Payouts REST API | Worker payouts when a job completes |
| PayPal sandbox | Buyer and business test accounts for the whole flow |
| APIMatic Context Plugin (context-matic) | In-editor lookups of the PayPal SDK's endpoints and models while writing the integration |
| Claude Sonnet | The booking agent (tool use) |
| Claude Haiku | Request parsing and the simulated workers |
| Claude Code | Pair-programming across the app, backend and pipeline |
| Expo, React Native, MapLibre | The mobile app and live map |
| Fastify, WebSockets, node:sqlite, zod | The API and realtime layer |
| Remotion, ffmpeg | The demo video |
| GitHub Actions | Backend deploys, app updates, APK builds |

## Disclosure: prior work

The app's visual shell (theme, sign-in, map, tracking and worker screens) is based on my earlier app,
Saafify. Built during the hackathon period: the entire backend, the agent chat that is now the customer's
home, the booking agent and simulated marketplace, counter-offers on worker cards, the PayPal integration
(Vault, Orders, Payouts), the demo mode, the update server and the deploy pipeline.
