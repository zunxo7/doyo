import type { AgReportState } from "ag-studio";

const title = (text: string) => ({ title: { enabled: true, text } });
const kpi = (text: string, field: string, aggregation: "sum" | "avg" | "count", color = "#ffffff") => ({
  type: "value",
  format: { ...title(text), style: { color, typography: { fontWeight: "bold", fontSize: 36 }, verticalAlign: "bottom" } },
  dataMapping: { value: [{ id: field, aggregation }] },
});
const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number) => ({ xTrack, yTrack, xSpan, ySpan });

/** The dashboard a judge lands on. Everything on it can be rearranged in Edit mode or rebuilt by the assistant. */
export const MY_CHARTS = "My charts";
export const PAGES = ["Overview", "Bookings", "PayPal", MY_CHARTS];

export const REPORT = {
  pages: [
    {
      id: "Overview",
      widgets: {
        bookings: kpi("Bookings", "bookings.id", "count"),
        value: kpi("Value booked (PKR)", "bookings.agreed", "sum"),
        saved: kpi("Saved for customers (PKR)", "bookings.underLimit", "sum", "#00baf0"),
        paidOut: kpi("Paid to workers by PayPal (PKR)", "workers.paidOutByPayPal", "sum", "#2fd08a"),
        live: { type: "liveNegotiation", format: title("Latest negotiation"), dataMapping: {} },
        money: { type: "moneyFlow", format: title("Where the money went"), dataMapping: {} },
        ladder: { type: "priceLadder", format: title("Under the customer's limit"), dataMapping: {} },
        board: { type: "workerBoard", format: title("Top workers"), dataMapping: {} },
        feed: { type: "activityFeed", format: title("Activity"), dataMapping: {} },
        speed: { type: "bookingSpeed", format: title("Booking speed"), dataMapping: {} },
      },
      widgetLayout: {
        bookings: at(0, 0, 6, 5),
        value: at(6, 0, 6, 5),
        saved: at(12, 0, 6, 5),
        paidOut: at(18, 0, 6, 5),
        live: at(0, 5, 10, 18),
        money: at(10, 5, 14, 7),
        ladder: at(10, 12, 14, 11),
        board: at(0, 23, 9, 12),
        feed: at(9, 23, 9, 12),
        speed: at(18, 23, 6, 12),
      },
    },
    {
      id: "Bookings",
      widgets: {
        table: {
          type: "grid",
          format: title("Every booking"),
          dataMapping: {
            cols: [
              { id: "bookings.day" },
              { id: "bookings.customer" },
              { id: "bookings.service" },
              { id: "bookings.worker" },
              { id: "bookings.agreed" },
              { id: "bookings.underLimit" },
              { id: "bookings.paypal" },
            ],
          },
        },
      },
      widgetLayout: { table: at(0, 0, 24, 21) },
    },
    {
      id: "PayPal",
      widgets: {
        charged: kpi("Charged by PayPal (PKR)", "payments.amount", "sum"),
        paidOut: kpi("Paid out to workers (PKR)", "workers.paidOutByPayPal", "sum", "#2fd08a"),
        commission: kpi("Doyo commission (PKR)", "workers.doyoCommission", "sum", "#00baf0"),
        orders: {
          type: "grid",
          format: title("PayPal orders"),
          dataMapping: {
            cols: [{ id: "payments.order" }, { id: "payments.kind" }, { id: "payments.status" }, { id: "payments.amount" }, { id: "payments.payoutBatch" }],
          },
        },
      },
      widgetLayout: { charged: at(0, 0, 8, 5), paidOut: at(8, 0, 8, 5), commission: at(16, 0, 8, 5), orders: at(0, 5, 24, 11) },
    },
    { id: "My charts" },
  ],
  selectedPageId: "Overview",
  panels: { filters: { collapsed: true }, data: { collapsed: true } },
} as unknown as AgReportState;
