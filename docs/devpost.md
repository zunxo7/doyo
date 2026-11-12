# Devpost submission

Paste-ready text for the PayPal AI Hackathon 2026 form. Anything in [brackets] still has to be filled in.

## Project name

Doyo

## Tagline

Agentic commerce for home services: tell Doyo what you need, and it negotiates with workers, books within your limit, and pays them through PayPal.

## Links

- Website (hosted demo): https://letdoyo.com
- Operations dashboard: https://letdoyo.com/dashboard
- Android app: https://api.letdoyo.com/ota/app.apk?v=37mb
- Repo: https://github.com/zunxo7/doyo
- Video: [YouTube url]

## Testing instructions (private field for judges)

Android APK: https://api.letdoyo.com/ota/app.apk (Android phone or arm64 emulator). Everyone is placed at G-10 Markaz, Islamabad. PayPal runs in the sandbox and is pre-linked, so there is no PayPal sign-in and no real money.

**Customer (one phone)**
1. **Continue with Email** → `judge@letdoyo.com` → code `1234`. Any `@letdoyo.com` address works with code `1234`.
2. Type "Deep clean 3 rooms" (English, Urdu or Roman Urdu) or tap a suggestion, then **Book it**.
3. Watch Doyo negotiate. Tap **Take over** to counter or accept a worker yourself, then **Let Doyo** to hand back.
4. When booked, the chat shows PayPal holding the price. Tap **Track on map**, then **Continue demo flow**: the worker drives over, arrives, starts and completes. The hold is captured and the worker is paid out.
5. Back in the chat, complain, e.g. "the windows still have streaks". Doyo asks for a photo (camera button next to the message box), checks it, and refunds the fair share through PayPal, or sends it to a person if the photo doesn't show the problem.

**Worker side**
- One phone: menu → **Worker mode** → go online. A simulated customer nearby posts a request; send your price (or accept theirs), then drive, start with code `0000` and complete. Earnings and the PayPal payout appear under Earnings.
- Two phones, real people only (the AI bidders are for demos): on the customer phone open **Settings** and turn **AI demo workers** off. On the second phone sign in with another `@letdoyo.com` address and go online in **Worker mode**. Book from the first phone: only the real worker gets the request. Doyo's counter appears on the worker's card ("Customer offers PKR …"); accept or counter, and Doyo books them. Complete the job from the worker phone and PayPal charges the customer and pays the worker.

**Operations dashboard**: https://letdoyo.com/dashboard, same email and code.
- **Overview / Bookings / PayPal**: every booking, negotiation and PayPal payment, live.
- **Reviews**: complaints Doyo sent to a person, with the customer's photo and Claude's note; refund by PayPal from there.
- **Ask Doyo**: ask about bookings or have it build a chart.

Demo note: the four workers who bid by default (Ayesha, Bilal, Sana, Usman) are AI personas standing in for real workers, so one judge sees a live market. Real workers use the same worker mode and bid alongside them, or alone with the switch off.

## Inspiration

In Pakistan you book a cleaner, a car wash or a barber by phoning around and haggling, then pay in cash. Ride-hailing apps here already let people bid on a fare, so negotiating in an app is familiar. Nobody enjoys doing the negotiating. That is agentic commerce: an agent that holds the customer's budget, talks to the other side, closes the deal and moves the money through PayPal, inside limits the customer sets.

## What it does

**Customer.** The home screen is a chat, in English, Urdu or Roman Urdu. Doyo turns "deep clean 3 rooms" into a job card with a starting price and a **Never over** limit. It posts the job, and workers' offers arrive in the chat as cards with photo, rating, distance and price, plus the customer's own history with that worker ("You rated 5★"). Doyo counters by name and books the best offer, weighing that history and what the customer paid last time. The customer can take over at any point to counter or accept, then hand back. When the deal is struck, PayPal holds the agreed price; it is captured when the job is done and released if it's cancelled. If something was wrong, the customer says so in the chat: Doyo judges the complaint against what the job included and refunds the fair share through PayPal. With no photo or inspection, a refund rests on trust: only one automatic refund per customer a month, and vague or repeat claims go to a person and the worker instead.

**Worker.** In production every bid comes from a real worker. Requests arrive live. Accept the price or send your own. A counter shows on your card as "Customer offers PKR 450". Your share is paid to your PayPal when you complete the job.

**Operations.** An AG Studio dashboard shows bookings, negotiations and PayPal money flow live, with an assistant that answers questions and builds widgets on request.

## How we built it

- **App:** Expo / React Native, MapLibre, one app for both sides. Updates ship over the air from our own expo-updates server.
- **Backend:** Node 24, TypeScript, Fastify, WebSockets, SQLite, on one VM; GitHub Actions deploy everything.
- **Booking agent:** Claude Sonnet with tools that are real marketplace actions: `wait_for_offers`, `counter_offer`, `raise_price`, `accept_offer`, `hand_back`. Each call carries the line Doyo says in the chat.
- **Planner:** Claude Haiku with structured output turns text into a plan, reads it in the context of the conversation, and answers scope questions from the same service scope the app shows.
- **Simulated workers (demo only):** four Claude Haiku personas with their own price floors stand in for real workers so the market is live for judges. Real workers bid through worker mode on the same job; the agent treats both the same. Persona messages state only true facts about the job.
- **Dashboard:** AG Studio with six custom widgets and a Claude-backed agent built on its agent framework.

## How we used PayPal

| Moment | PayPal |
|---|---|
| Customer links PayPal once | Vault: setup token → approval → payment token (Server SDK) |
| Doyo books a worker | Orders: AUTHORIZE with the saved token, so the agreed price is held (Server SDK) |
| Job completed / cancelled | Payments: capture the authorization / void it (Server SDK) |
| Customer complains | Payments: partial refund of the capture, amount decided by the agent (Server SDK) |
| Worker paid | Payouts API, batch id = job id, so a job can't pay out twice |
| Worker settles commission on cash jobs | Orders: create → approve → capture |

Vault is what makes the agent useful: the customer approves PayPal once, and Doyo can hold, settle and refund later without another checkout, inside a limit the server enforces.

## How we used AI

- It is agentic commerce end to end: it plans, negotiates, books, pays and settles disputes, and explains every action in the chat. The agent decides; the customer's mandate (budget, price rule, refund cap) bounds it, enforced on the server like the mandates in Google's AP2 and Visa Intelligent Commerce.
- It decides with the customer's history: how often they booked each worker, the stars they gave, and what they paid last time for the same job.
- The mandate is enforced in code, not just in the prompt: no booking over the customer's limit or more than 5% above the cheapest open offer, no refund over half the price, and one automatic refund per customer a month. A refusal goes back to the agent, which decides again. A turn limit, a daily call cap and a rule-based fallback keep bookings working.
- It is cheap where it can be: small talk ("hi", "salam", "thanks") is answered without a model call, and the agent only calls the model when the offers have changed.

## Challenges

- **Trusting an agent with money.** Prompts alone weren't enough: in testing the agent once picked a pricier worker. Hard rules moved into server checks.
- **Negotiating with people.** People answer in seconds, models in one; the agent waits for humans and its counter appears on the worker's own card.
- **No PKR in PayPal.** Amounts are shown in PKR and converted at a fixed demo rate in the sandbox.

## What's next

Photo evidence for complaints, standing mandates ("wash my car every Friday under PKR 600") that the agent books and pays on its own, and local payment rails next to PayPal.

## Built with

`claude` `paypal` `paypal-server-sdk` `paypal-payouts` `apimatic` `ag-grid` `ag-studio` `react-native` `expo` `typescript` `node.js` `fastify` `websockets` `sqlite` `maplibre` `github-actions`

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

The app's visual shell (theme, sign-in, map, tracking and worker screens) is based on my earlier app, Saafify. Built during the hackathon: the backend, the agent chat, the booking agent and simulated marketplace, the PayPal integration, the dashboard, the website, the update server and the deploy pipeline.
