import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type RowClickedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { call } from "./api";

ModuleRegistry.registerModules([AllCommunityModule]);

export type Review = {
  jobId: string;
  customer: string;
  worker: string | null;
  service: string;
  detail: string;
  price: number;
  maxRefund: number;
  text: string;
  at: number;
  note: string;
  suggested: number;
  photo: string | null;
  decided?: { refund: number; at: number; by: string };
};

const pkr = (value: number) => `PKR ${value.toLocaleString("en-PK")}`;
const ago = (at: number) => {
  const minutes = Math.round((Date.now() - at) / 60_000);
  return minutes < 60 ? `${Math.max(1, minutes)}m ago` : minutes < 1440 ? `${Math.round(minutes / 60)}h ago` : `${Math.round(minutes / 1440)}d ago`;
};

// The dashboard's own colours and type, so the grid reads like the other widgets.
const gridTheme = themeQuartz.withParams({
  backgroundColor: "transparent",
  foregroundColor: "#ffffff",
  accentColor: "#00baf0",
  borderColor: "#3d3e40",
  headerBackgroundColor: "transparent",
  headerTextColor: "rgba(255,255,255,0.62)",
  headerFontWeight: 700,
  fontFamily: "Montserrat, system-ui, sans-serif",
  fontSize: 13,
  rowHoverColor: "rgba(0,186,240,0.07)",
  selectedRowBackgroundColor: "rgba(0,186,240,0.14)",
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  rowBorder: { color: "#3d3e40" },
  columnBorder: false,
  browserColorScheme: "dark",
});

const status = (review: Review) => (!review.decided ? "Waiting" : review.decided.refund ? "Refunded" : "No refund");

function Photo({ src, size }: { src: string | null; size: number }) {
  return src ? (
    <img className="rv-thumb" src={src} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="rv-thumb none" style={{ width: size, height: size }} title="No photo" />
  );
}

function Decision({ review, onDone }: { review: Review; onDone: () => void }) {
  const [amount, setAmount] = useState(review.suggested || Math.round(review.maxRefund / 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(false);
  useEffect(() => setAmount(review.suggested || Math.round(review.maxRefund / 2)), [review.jobId, review.suggested, review.maxRefund]);

  const decide = async (refund: number) => {
    setBusy(true);
    setError("");
    try {
      await call(`/api/ops/reviews/${review.jobId}`, { refund });
      onDone();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="rv-card">
      <div className="rv-scroll">
      <button type="button" className="rv-photo" onClick={() => review.photo && setZoom(true)} disabled={!review.photo} aria-label="Open photo">
        {review.photo ? (
          <>
            <img src={review.photo} alt="Photo the customer sent" />
            <span className="rv-zoom-hint">
              <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true">
                <path fill="currentColor" d="M152 112a8 8 0 0 1-8 8h-24v24a8 8 0 0 1-16 0v-24H80a8 8 0 0 1 0-16h24V80a8 8 0 0 1 16 0v24h24a8 8 0 0 1 8 8Zm77.66 117.66a8 8 0 0 1-11.32 0l-50.06-50.07a88.11 88.11 0 1 1 11.31-11.31l50.07 50.06a8 8 0 0 1 0 11.32ZM112 184a72 72 0 1 0-72-72 72.08 72.08 0 0 0 72 72Z" />
              </svg>
              Zoom
            </span>
          </>
        ) : (
          <span>No photo sent</span>
        )}
      </button>
      <div className="dw-head">
        <div>
          <b>{review.detail}</b>
          <span>
            {review.customer} · {review.worker ?? "Worker"} · {pkr(review.price)}
          </span>
        </div>
        <em className={review.decided ? "" : "live"}>{status(review)}</em>
      </div>
      <p className="rv-quote">“{review.text}”</p>
      {review.note ? (
        <p className="rv-note" title={review.note}>
          <i>Claude</i>
          <span>{review.note}</span>
        </p>
      ) : null}
      {review.decided ? (
        <div className="rv-done">{review.decided.refund ? `${pkr(review.decided.refund)} refunded by PayPal` : "Closed with no refund"}</div>
      ) : (
        <>
          <label className="rv-amount">
            <div>
              <span>Refund</span>
              <span>up to {pkr(review.maxRefund)}</span>
            </div>
            <b>{pkr(amount)}</b>
            <input type="range" min={10} max={review.maxRefund} step={1} value={amount} onChange={event => setAmount(Number(event.target.value))} />
          </label>
          <div className="rv-actions">
            <button className="btn" type="button" disabled={busy || !(amount > 0)} onClick={() => void decide(amount)}>
              Refund by PayPal
            </button>
            <button className="rv-skip" type="button" disabled={busy} onClick={() => void decide(0)}>
              No refund
            </button>
          </div>
        </>
      )}
      {error ? <p className="rv-error">{error}</p> : null}
      </div>
      {zoom && review.photo ? (
        <button type="button" className="rv-zoom" onClick={() => setZoom(false)} aria-label="Close photo">
          <img src={review.photo} alt="Photo the customer sent" />
        </button>
      ) : null}
    </aside>
  );
}

/** Complaints the agent sent to a person, in a grid; the selected one opens beside it with its photo and a refund decision. */
export function Reviews({ tick, onCount }: { tick: number; onCount: (open: number) => void }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { reviews: next } = await call<{ reviews: Review[] }>("/api/ops/reviews");
    setReviews(next);
    onCount(next.filter(review => !review.decided).length);
  }, [onCount]);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load, tick]);

  const columns = useMemo<ColDef<Review>[]>(
    () => [
      {
        headerName: "",
        field: "photo",
        width: 76,
        sortable: false,
        cellStyle: { display: "flex", alignItems: "center", textOverflow: "clip" },
        cellRenderer: ({ value }: { value: string | null }) => <Photo src={value} size={40} />,
      },
      { headerName: "Job", field: "detail", flex: 1.1, minWidth: 140 },
      { headerName: "Customer", field: "customer", width: 120 },
      { headerName: "Complaint", field: "text", flex: 2, minWidth: 200, tooltipField: "text" },
      { headerName: "Paid", field: "price", width: 110, valueFormatter: ({ value }) => pkr(value as number) },
      {
        headerName: "Status",
        colId: "status",
        width: 120,
        valueGetter: ({ data }) => (data ? status(data) : ""),
        cellRenderer: ({ value }: { value: string }) => <span className={`rv-pill ${value === "Waiting" ? "wait" : value === "Refunded" ? "paid" : ""}`}>{value}</span>,
      },
      { headerName: "When", field: "at", width: 100, sort: "desc", valueFormatter: ({ value }) => ago(value as number) },
    ],
    [],
  );

  if (!reviews) return <div className="loading">Loading reviews</div>;
  const open = reviews.filter(review => !review.decided);
  const refunded = reviews.filter(review => review.decided?.refund);
  const current = reviews.find(review => review.jobId === selected) ?? open[0] ?? reviews[0];
  const tiles = [
    { label: "Waiting for a person", value: String(open.length), accent: open.length > 0 },
    { label: "With a photo", value: String(reviews.filter(review => review.photo).length) },
    { label: "Refunded after review", value: String(refunded.length) },
    { label: "Refunded total", value: pkr(refunded.reduce((sum, review) => sum + (review.decided?.refund ?? 0), 0)) },
  ];

  return (
    <div className="rv">
      <div className="rv-tiles">
        {tiles.map(tile => (
          <div key={tile.label} className={tile.accent ? "rv-tile accent" : "rv-tile"}>
            <span>{tile.label}</span>
            <b>{tile.value}</b>
          </div>
        ))}
      </div>
      <div className="rv-main">
        <section className="rv-grid">
          <div className="dw-head rv-grid-head">
            <div>
              <b>Complaints for review</b>
              <span>Doyo refunds on its own when the photo shows the problem. These need a person.</span>
            </div>
          </div>
          <div className="rv-grid-body">
            <AgGridReact<Review>
              theme={gridTheme}
              rowData={reviews}
              columnDefs={columns}
              rowHeight={52}
              getRowId={({ data }) => data.jobId}
              rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
              onRowClicked={(event: RowClickedEvent<Review>) => event.data && setSelected(event.data.jobId)}
              overlayNoRowsTemplate="Nothing waiting."
            />
          </div>
        </section>
        {current ? <Decision review={current} onDone={() => void load()} /> : null}
      </div>
    </div>
  );
}
