import { AgStudioAiModule, createAiHarness, directLlmRunner, studioTheme, type AgAiHarnessSetup, type AgDataSourcesDefinition, type AgStudioApi } from "ag-studio";
import { AgStudio, AgStudioProvider, createWidgets, type AgStudioRef } from "ag-studio-react";
import React, { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { claudeAdapter } from "./adapter";
import { call, getToken, setToken, signIn, watch, type Overview } from "./api";
import { getOverview, serviceName, statusName, toSources } from "./data";
import { MY_CHARTS, PAGES, REPORT } from "./report";

type Spot = { xTrack: number; yTrack: number; xSpan: number; ySpan: number };
type Page = { id: string; widgets?: Record<string, unknown>; widgetLayout?: Record<string, Spot> };
import "./motion";
import { Wordmark } from "./wordmark";
import { ActivityFeed, BookingSpeed, LiveNegotiation, MoneyFlow, PriceLadder, WorkerBoard } from "./widgets";

const LICENCE = import.meta.env.VITE_AG_STUDIO_LICENCE as string | undefined;

/** Doyo's dark theme: the app's greys, its blue, and Montserrat. */
const FONT = "Montserrat, system-ui, sans-serif";
const theme = studioTheme.withParams({
  backgroundColor: "#1d1d1d",
  foregroundColor: "#ffffff",
  accentColor: "#00baf0",
  borderColor: "#3d3e40",
  subtleTextColor: "rgba(255,255,255,0.62)",
  fontFamily: FONT,
  fontSize: 13,
  borderRadius: 12,
  browserColorScheme: "dark",
  studioCanvasFontFamily: FONT,
  studioWidgetBackgroundColor: "#2e2e30",
  studioWidgetBorder: "none",
  studioWidgetBorderRadius: 22,
  studioWidgetPadding: 22,
  studioWidgetTitleFontFamily: FONT,
  studioWidgetTitleFontSize: 13,
  studioWidgetTitleFontWeight: 700,
  studioWidgetTitleTextColor: "rgba(255,255,255,0.62)",
  studioValueWidgetFontSize: 34,
  gridFontFamily: FONT,
  gridHeaderFontFamily: FONT,
  gridCellFontFamily: FONT,
  gridDataBackgroundColor: "transparent",
  gridOddRowBackgroundColor: "transparent",
  gridWrapperBorder: "none",
  gridHeaderBackgroundColor: "transparent",
  gridRowHeight: 42,
  gridHeaderHeight: 38,
  gridHeaderFontSize: 11,
  gridDataFontSize: 13,
  gridCellHorizontalPadding: 14,
  gridRowBorder: "1px solid #3a3b3d",
  gridHeaderRowBorder: "1px solid #3a3b3d",
  gridPinnedRowBorder: "1px solid #4a4b4d",
  gridColumnBorder: "none",
  gridRowHoverColor: "rgba(0, 186, 240, 0.07)",
  gridScrollbarThumbColor: "#4a4b4d",
  gridHeaderTextColor: "rgba(255,255,255,0.62)",
  gridHeaderFontWeight: 700,
  chartFontFamily: FONT,
  chartAxisLabelColor: "rgba(255,255,255,0.62)",
  chartLegendLabelColor: "rgba(255,255,255,0.8)",
  chartPaletteFills1Color: "#00baf0",
  chartPaletteFills2Color: "#2fd08a",
  chartPaletteFills3Color: "#4a4b4d",
  chartPaletteFills4Color: "#ffd400",
  chartPaletteFills5Color: "#ff6b6b",
  chartPaletteFills6Color: "#b692f6",
  chartPaletteStrokes1Color: "#00baf0",
  chartPaletteStrokes2Color: "#2fd08a",
  chartPaletteStrokes3Color: "#4a4b4d",
  chartPaletteStrokes4Color: "#ffd400",
  chartPaletteStrokes5Color: "#ff6b6b",
  chartPaletteStrokes6Color: "#b692f6",
});

const LAYOUT = {
  columns: 24,
  rowHeight: 30,
  pagePadding: 4,
  maxWidth: 1240,
  backgroundColor: "#1d1d1d",
  widgetPadding: 9,
  widgetBackgroundColor: "#2e2e30",
  widgetBorderEnabled: false,
  widgetBorderRadius: 22,
};

const ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2q2 8 10 10-8 2-10 10-2-8-10-10 8-2 10-10z"/></svg>';

const doyoWidget = (id: string, label: string, comp: () => React.ReactElement, description: string) => ({
  id,
  label,
  icon: ICON,
  comp,
  form: (params: { createDefaults: (options: { dataMappingItems: never[] }) => unknown }) => params.createDefaults({ dataMappingItems: [] }),
  defaultSize: { width: 480, height: 320 },
  minSize: { width: 260, height: 200 },
  ai: { description },
});

const widgets = (defaults: { menu: unknown[] }) =>
  createWidgets({
    additionalTypes: [
      {
        id: "liveNegotiation",
        label: "Live negotiation",
        icon: ICON,
        comp: LiveNegotiation,
        form: (params: { createDefaults: (options: { dataMappingItems: never[] }) => unknown }) => params.createDefaults({ dataMappingItems: [] }),
        defaultSize: { width: 420, height: 520 },
        minSize: { width: 280, height: 260 },
        ai: { description: "Shows the chat transcript of the most recent booking Doyo negotiated: the customer's limit, each worker's offer and Doyo's counter-offers. Takes no fields." },
      },
      {
        id: "moneyFlow",
        label: "Money flow",
        icon: ICON,
        comp: MoneyFlow,
        form: (params: { createDefaults: (options: { dataMappingItems: never[] }) => unknown }) => params.createDefaults({ dataMappingItems: [] }),
        defaultSize: { width: 640, height: 200 },
        minSize: { width: 360, height: 150 },
        ai: { description: "Shows how the latest PayPal booking's money was split: what the customer was charged, Doyo's 15% commission, and the worker's PayPal payout. Takes no fields." },
      },
      doyoWidget("priceLadder", "Price ladder", PriceLadder, "Each recent booking's agreed price as a bar against the customer's limit, with how much was saved. Takes no fields."),
      doyoWidget("workerBoard", "Worker leaderboard", WorkerBoard, "Workers ranked by what they earned through Doyo, with jobs done and PayPal payouts. Takes no fields."),
      doyoWidget("activityFeed", "Activity", ActivityFeed, "A live feed of bookings, PayPal charges and payouts, newest first. Takes no fields."),
      doyoWidget("bookingSpeed", "Booking speed", BookingSpeed, "A ring showing the average seconds Doyo takes to book a worker, and the fastest. Takes no fields."),
    ],
    menu: [...defaults.menu, { label: "Doyo", widgetIds: ["liveNegotiation", "moneyFlow", "priceLadder", "workerBoard", "activityFeed", "bookingSpeed"] }],
    // The widget types are Doyo's own, so they are not in Studio's default registry type.
  } as never);

/** What add_chart can draw from. Numbers can be summed or averaged; text fields group. */
const FIELDS: Record<string, { text: string[]; numbers: string[] }> = {
  bookings: {
    text: ["day", "customer", "service", "status", "worker", "paypal", "payWith"],
    numbers: ["asked", "limit", "agreed", "underLimit", "offers", "counterOffers", "secondsToBook", "doyoCommission", "workerReceives"],
  },
  offers: { text: ["service", "customer", "worker", "result"], numbers: ["price", "rating", "minutesAway"] },
  payments: { text: ["order", "kind", "status", "paidOut"], numbers: ["amount"] },
  workers: { text: ["worker", "type"], numbers: ["jobsDone", "earned", "doyoCommission", "paidOutByPayPal", "commissionOwed"] },
};
const FIELD_LIST = Object.entries(FIELDS)
  .map(([table, { text, numbers }]) => `${table}: group by ${text.join(", ")}; numbers ${numbers.join(", ")}`)
  .join(". ");
/** Studio chart types add_chart can make. Each groups by text fields and plots number fields. */
const CHARTS: Record<string, string> = {
  bar: "bar-chart-grouped",
  "stacked-bar": "bar-chart-stacked",
  column: "column-chart-grouped",
  "stacked-column": "column-chart-stacked",
  line: "line-chart",
  area: "area-chart",
  pie: "pie-chart",
  donut: "donut-chart",
  funnel: "funnel-chart",
  "radial-bar": "radial-bar-chart",
  nightingale: "nightingale-chart",
};
/** Single-number widgets: one number field, no grouping. */
const NUMBERS: Record<string, string> = { kpi: "value", gauge: "radial-gauge", "linear-gauge": "linear-gauge" };
/** Doyo's own widgets read the live records themselves and take no fields. */
const DOYO_WIDGETS: Record<string, string> = {
  negotiation: "liveNegotiation",
  "money-flow": "moneyFlow",
  "price-ladder": "priceLadder",
  "top-workers": "workerBoard",
  activity: "activityFeed",
  "booking-speed": "bookingSpeed",
};
const KIND_LIST = [...Object.keys(CHARTS), ...Object.keys(NUMBERS), "table", ...Object.keys(DOYO_WIDGETS)].join(", ");
const SPANS: Record<string, number> = { full: 24, "two-thirds": 16, half: 12, third: 8, quarter: 6 };

/** The first free spot on a 24-column page that fits the widget, scanning top to bottom. */
function freeSpot(layout: Record<string, Spot>, xSpan: number, ySpan: number): Spot {
  const taken = Object.values(layout);
  const bottom = Math.max(0, ...taken.map(spot => spot.yTrack + spot.ySpan));
  const clashes = (x: number, y: number) => taken.some(spot => x < spot.xTrack + spot.xSpan && spot.xTrack < x + xSpan && y < spot.yTrack + spot.ySpan && spot.yTrack < y + ySpan);
  for (let y = 0; y <= bottom; y += 1) for (let x = 0; x + xSpan <= 24; x += 1) if (!clashes(x, y)) return { xTrack: x, yTrack: y, xSpan, ySpan };
  return { xTrack: 0, yTrack: bottom, xSpan, ySpan };
}

/** The assistant is Doyo, not a generic one. */
const LOCALE = {
  panelTitleAi: "Doyo",
  aiMessageInputPlaceholder: "Ask Doyo...",
  aiNotConfigured: "Doyo is not available right now.",
};

/** My charts is kept in this browser, so what you ask Doyo to build is still there next time. */
const SAVED_KEY = "doyo_my_charts";
function withSavedCharts() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null");
    if (!saved?.widgets) return REPORT;
    const report = REPORT as unknown as { pages: { id: string }[] };
    return { ...report, pages: report.pages.map(page => (page.id === MY_CHARTS ? { ...saved, id: MY_CHARTS } : page)) } as typeof REPORT;
  } catch {
    return REPORT;
  }
}
function saveCharts(state: unknown) {
  const page = (state as { pages: { id: string }[] }).pages.find(item => item.id === MY_CHARTS);
  try {
    if (page) localStorage.setItem(SAVED_KEY, JSON.stringify(page));
  } catch {
    // Storage can be blocked; the charts then last only this visit.
  }
}

const PROMPTS = [
  { label: "Why that worker?", prompt: "Explain the most recent booking: who offered what, what Doyo countered, and why that worker was booked." },
  { label: "Payouts by worker", prompt: "Add a bar chart of PayPal payouts by worker to the page I am on." },
  { label: "How much did Doyo save?", prompt: "How far under the customer's limit did Doyo book, on average and in total?" },
  { label: "Any payment problems?", prompt: "Are there any failed PayPal charges or workers who owe commission?" },
];

const pkr = (value: number | null | undefined) => `PKR ${Number(value ?? 0).toLocaleString("en-PK")}`;

/**
 * The assistant. A Doyo agent fronts the conversation: it knows the marketplace, answers from the booking
 * records with tools of its own, and hands dashboard building to AG Studio's built-in lead agent.
 */
const ai: AgAiHarnessSetup = setup => {
  const api = setup.api as unknown as AgStudioApi;
  const explainBooking = api.defineAiTool({
    name: "explain_booking",
    description: "Get one booking's full record: the customer's limit, every worker offer, Doyo's negotiation transcript, the agreed price and the PayPal payment. Returns the most recent booking, or the most recent for a named customer.",
    params: s => s.object({ customer: s.string({ description: "Customer name to look up. Omit for the most recent booking." }).optional() }),
    execute: async (args, ctx) => {
      const wanted = (args as { customer?: string }).customer?.toLowerCase();
      const job = getOverview().jobs.find(item => !item.simulatedCustomer && item.agreed != null && (!wanted || item.customer.toLowerCase().includes(wanted)));
      if (!job) return ctx.error("No matching booking. Ask which customer they mean.");
      return ctx.success(`Booking for ${job.customer}.`, {
        customer: job.customer,
        service: serviceName(job.service),
        job: job.detail,
        status: statusName(job.status),
        asked: pkr(job.ask),
        neverOver: pkr(job.limit),
        agreed: pkr(job.agreed),
        underLimitBy: pkr(job.underLimit),
        bookedWorker: job.worker,
        secondsToBook: job.secondsToBook,
        offers: job.offerList.map(offer => ({ worker: offer.name, price: pkr(offer.price), rating: offer.rating, minutesAway: offer.minutesAway, result: offer.status })),
        transcript: job.log.map(line => `${line.from === "worker" ? line.name : "Doyo"}: ${line.text}`),
        payment: { method: job.payment, status: job.paymentStatus ?? "not charged", doyoCommission: pkr(job.commission), workerReceives: pkr(job.workerShare), paypal: job.paypal },
      });
    },
  });

  const paymentProblems = api.defineAiTool({
    name: "payment_problems",
    description: "List bookings whose PayPal charge failed, and workers who owe Doyo commission from cash jobs.",
    params: s => s.object({}),
    execute: async (_args, ctx) => {
      const { jobs, workers } = getOverview();
      const failed = jobs.filter(job => job.paymentStatus === "failed").map(job => ({ customer: job.customer, amount: pkr(job.agreed), worker: job.worker }));
      const owing = workers.filter(worker => worker.commissionDue > 0).map(worker => ({ worker: worker.name, owes: pkr(worker.commissionDue) }));
      return ctx.success(`${failed.length} failed charges, ${owing.length} workers owing commission.`, { failedCharges: failed, commissionOwed: owing });
    },
  });

  // Adding a chart is one tool call, not a chain of agents: it lands full width under what is already on the page.
  const addChart = api.defineAiTool({
    name: "add_chart",
    description: `Add one widget to the page the user is looking at, in the first free spot. Kinds: ${KIND_LIST}. Charts need groupBy and values; kpi and gauges need one number in values; a table takes the fields to show in groupBy; Doyo widgets (${Object.keys(DOYO_WIDGETS).join(", ")}) take no fields. Fields by table: ${FIELD_LIST}.`,
    params: s =>
      s.object({
        title: s.string({ description: "Short title with the unit, for example 'PayPal payouts by worker (PKR)'." }),
        kind: s.string({ description: `One of: ${KIND_LIST}.` }),
        table: s.string({ description: "bookings, offers, payments or workers. Omit for Doyo widgets." }).optional(),
        groupBy: s.string({ description: "Text field to group by. For a table, the fields to show, comma-separated." }).optional(),
        values: s.string({ description: "Comma-separated number fields to plot." }).optional(),
        splitBy: s.string({ description: "Optional text field that splits each bar or line into coloured series, for example offers.result. Use it with stacked charts." }).optional(),
        aggregation: s.string({ description: "sum, avg, min, max or count. Defaults to sum." }).optional(),
        width: s.string({ description: "full, two-thirds, half, third or quarter. Defaults to half for charts, quarter for kpi and gauges, full for tables." }).optional(),
      }),
    execute: async (raw, ctx) => {
      const args = raw as { title: string; kind: string; table?: string; groupBy?: string; values?: string; splitBy?: string; aggregation?: string; width?: string };
      const list = (text = "") => text.split(",").map(field => field.trim()).filter(Boolean);
      const aggregation = ["avg", "min", "max", "count"].includes(args.aggregation ?? "") ? args.aggregation : "sum";
      let type: string;
      let dataMapping: Record<string, unknown> = {};
      let size = { width: "half", height: 11 };
      if (DOYO_WIDGETS[args.kind]) {
        type = DOYO_WIDGETS[args.kind];
        size = { width: args.kind === "money-flow" ? "full" : "half", height: args.kind === "money-flow" ? 7 : args.kind === "negotiation" ? 16 : 11 };
      } else {
        const fields = FIELDS[args.table ?? ""];
        if (!fields) return ctx.error("Name the table: bookings, offers, payments or workers.");
        const known = [...fields.text, ...fields.numbers];
        const groups = list(args.groupBy);
        const values = list(args.values);
        const split = list(args.splitBy).slice(0, 1);
        const unknown = [...groups, ...values, ...split].filter(field => !known.includes(field));
        if (unknown.length) return ctx.error(`Unknown fields ${unknown.join(", ")}. ${args.table} has ${known.join(", ")}.`);
        const ref = (field: string) => ({ id: `${args.table}.${field}`, ...(fields.numbers.includes(field) ? { aggregation } : {}) });
        if (args.kind === "table") {
          type = "grid";
          dataMapping = { cols: groups.map(field => ({ id: `${args.table}.${field}` })) };
          size = { width: "full", height: 12 };
        } else if (NUMBERS[args.kind]) {
          if (!values.length) return ctx.error("Give one number field in values.");
          type = NUMBERS[args.kind];
          dataMapping = { value: [ref(values[0])] };
          size = { width: "quarter", height: args.kind === "kpi" ? 5 : 11 };
        } else if (CHARTS[args.kind]) {
          if (!groups.length || !values.length) return ctx.error("A chart needs a text field in groupBy and a number field in values.");
          type = CHARTS[args.kind];
          dataMapping = {
            categoryKey: groups.slice(0, 1).map(field => ({ id: `${args.table}.${field}` })),
            valueKey: values.map(ref),
            ...(split.length ? { legendKey: [{ id: `${args.table}.${split[0]}` }] } : {}),
          };
        } else {
          return ctx.error(`Unknown kind. Use one of: ${KIND_LIST}.`);
        }
      }
      const state = api.getState() as unknown as { pages: Page[]; selectedPageId: string };
      const page = state.pages.find(item => item.id === state.selectedPageId) ?? state.pages[0];
      const layout = page.widgetLayout ?? {};
      const spot = freeSpot(layout, SPANS[args.width ?? ""] ?? SPANS[size.width], size.height);
      const id = `chart${Date.now()}`;
      // A single number reads like the dashboard's own KPIs: big, bold, sitting at the bottom of its card.
      const numberStyle = type === "value" ? { style: { color: "#ffffff", typography: { fontWeight: "bold", fontSize: 36 }, verticalAlign: "bottom" } } : {};
      const widget = { type, format: { title: { enabled: true, text: args.title }, ...numberStyle }, dataMapping };
      const next = { ...page, widgets: { ...page.widgets, [id]: widget }, widgetLayout: { ...layout, [id]: spot } };
      api.setState({ ...state, pages: state.pages.map(item => (item === page ? next : item)) } as never);
      return ctx.success(`Added "${args.title}" to ${page.id}.`);
    },
  });

  return createAiHarness(api, ({ builtIn, tools }) => ({
    agents: [
      ...Object.values(builtIn).map(definition => directLlmRunner({ ...definition, adapter: claudeAdapter } as never)),
      directLlmRunner({
        id: "doyo",
        adapter: claudeAdapter,
        description: "Doyo's operations analyst.",
        schema: s => s.undefined(),
        instructions: () =>
          [
            "You are the operations analyst for Doyo, a home-services marketplace in Pakistan where an AI agent negotiates with workers for the customer and PayPal takes the payment after the job.",
            "All amounts are in PKR. Doyo keeps 15% of each job; the worker gets the rest by PayPal payout.",
            `Tables: bookings (one row per request), offers (one row per worker offer), payments (PayPal orders), workers (earnings and payouts). Fields: ${FIELD_LIST}.`,
            "For a question about one booking or why a worker was chosen, call explain_booking. For money problems, call payment_problems. For totals and comparisons, run a query.",
            "To add anything to the dashboard, call add_chart once per widget. Design like a good analyst:",
            "- Two or three widgets that answer the question beat many. Never add two widgets that show the same number.",
            "- Pick the form that fits the data: a funnel or donut for how offers end, a line or area over days, a stacked column with splitBy for a breakdown inside each group, a ranked bar for comparing workers.",
            "- For booking speed, use Doyo's booking-speed widget, not a gauge: gauges and KPIs of averages show raw decimals. Prefer sums and counts for KPIs.",
            "- A stacked chart needs splitBy, otherwise use a plain bar or column. Skip a chart when a group has only one or two categories; a KPI says it better.",
            "- Lay widgets side by side: half and half, or a third plus two thirds. Titles are short and name the unit.",
            "Then say what you added in one or two sentences. Only for moving, resizing, restyling or removing existing widgets, delegate to the lead agent.",
            "Answer in two or three plain sentences with the numbers. Do not invent figures.",
          ].join("\n"),
        tools: () => [addChart, tools.studio.executeQuery(), explainBooking, paymentProblems, tools.delegateTo(["lead"])],
      }),
    ],
    primary: "doyo",
    promptStarters: PROMPTS,
  }));
};

function Gate({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("judge@letdoyo.com");
  const [code, setCode] = useState("1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email.trim(), code.trim());
      onDone();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="gate">
      <form className="gate-card" onSubmit={submit}>
        <img className="gate-logo" src="/assets/icon.png" alt="" />
        <h1>Doyo Operations</h1>
        <p>Every booking, negotiation and PayPal payment, live. Ask Doyo about any of it.</p>
        <label>
          Email
          <input type="email" value={email} onChange={event => setEmail(event.target.value)} required />
        </label>
        <label>
          Code
          <input inputMode="numeric" value={code} onChange={event => setCode(event.target.value)} required />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Logging in" : "Login"}
        </button>
        {error && (
          <p className="gate-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}

export default function App() {
  const [signedIn, setSignedIn] = useState(Boolean(getToken()));
  const [data, setData] = useState<AgDataSourcesDefinition>();
  const [live, setLive] = useState(false);
  const [page, setPage] = useState(PAGES[0]);
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState(false);
  const studio = useRef<AgStudioRef>(null);
  const initial = useMemo(withSavedCharts, []);

  const load = useCallback(async () => {
    try {
      setData(toSources(await call<Overview>("/api/ops/overview")));
    } catch (problem) {
      // Only a refused session signs out; a dropped connection just waits for the next update.
      const status = (problem as { status?: number }).status;
      if (status === 401 || status === 403) {
        setToken(null);
        setSignedIn(false);
      }
    }
  }, []);

  useEffect(() => (signedIn ? watch(() => void load(), setLive) : undefined), [signedIn, load]);

  const modules = useMemo(() => [AgStudioAiModule], []);
  // View mode is the clean dashboard. Asking opens only the assistant; customising opens the builder.
  const panels = useMemo(
    () => ({ view: { left: [], right: [] }, edit: { left: asking ? ["ai"] : [], right: editing ? ["edit", "data", "filters"] : [] } }),
    [asking, editing],
  );

  const open = (next: string) => {
    setPage(next);
    const api = studio.current?.api;
    if (api) api.setState({ ...api.getState(), selectedPageId: next });
  };

  if (!signedIn) return <Gate onDone={() => setSignedIn(true)} />;

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="../">
          <Wordmark />
          <span>Operations</span>
        </a>
        <nav className="tabs" aria-label="Pages">
          {PAGES.map(name => (
            <button key={name} type="button" className={name === page ? "tab active" : "tab"} onClick={() => open(name)}>
              {name}
            </button>
          ))}
        </nav>
        <span className="spacer" />
        <span className={live ? "live on" : "live"}>
          <i />
          {live ? "Live" : "Connecting"}
        </span>
        <button className={asking ? "btn" : "btn btn-ask"} type="button" aria-pressed={asking} onClick={() => setAsking(value => !value)}>
          Ask Doyo
        </button>
        <button className={editing ? "ghost active" : "ghost"} type="button" aria-pressed={editing} onClick={() => setEditing(value => !value)}>
          Customise
        </button>
        <button
          className="ghost"
          type="button"
          onClick={() => {
            setToken(null);
            setSignedIn(false);
          }}
        >
          Sign out
        </button>
      </header>
      <div className="studio">
        {data ? (
          <AgStudioProvider licenseKey={LICENCE} modules={modules}>
            <AgStudio
              ref={studio as never}
              data={data}
              mode={asking || editing ? "edit" : "view"}
              panels={panels as never}
              theme={theme}
              initialState={initial}
              localeText={LOCALE as never}
              onStateUpdated={event => event.durable && saveCharts(event.state)}
              layout={LAYOUT}
              widgets={widgets as never}
              ai={ai}
              style={{ height: "100%", width: "100%" }}
            />
          </AgStudioProvider>
        ) : (
          <div className="loading">Loading bookings</div>
        )}
      </div>
    </div>
  );
}
