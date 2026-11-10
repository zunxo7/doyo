import React, { useEffect, useState, useSyncExternalStore } from "react";
import type { Booking } from "./api";
import { getOverview, serviceName, subscribe } from "./data";

const pkr = (value: number | null | undefined) => `PKR ${Number(value ?? 0).toLocaleString("en-PK")}`;
const useOverview = () => useSyncExternalStore(subscribe, getOverview);

/** Counts up to a number once, easing out. */
function CountUp({ to }: { to: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(to);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      setShown(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return <>{shown}</>;
}

/** The most recent booking Doyo negotiated, shown the way the customer saw it. */
export function LiveNegotiation() {
  const { jobs } = useOverview();
  const job = jobs.find((item: Booking) => item.log.length > 0 && !item.simulatedCustomer);
  if (!job) return <div className="dw dw-empty">No negotiation yet. Book something in the app.</div>;
  return (
    <div className="dw">
      <header className="dw-head">
        <div>
          <b>{serviceName(job.service)}</b>
          <span>
            {job.customer} · {job.detail}
          </span>
        </div>
        <em className={job.status === "open" ? "live" : ""}>{job.status === "open" ? "Negotiating now" : job.agreed ? `Booked at ${pkr(job.agreed)}` : "Ended"}</em>
      </header>
      <div className="dw-limit">
        <span>Asked {pkr(job.ask)}</span>
        <span>
          Never over <b>{pkr(job.limit)}</b>
        </span>
      </div>
      <div className="dw-thread">
        {job.log.map((line, index) => (
          <div key={`${line.at}${line.text}`} className={line.from === "worker" ? "msg" : "msg doyo"} style={{ "--i": index } as React.CSSProperties}>
            <small>{line.from === "worker" ? line.name : "Doyo"}</small>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Where the money of the latest PayPal booking went: customer, Doyo, worker. */
export function MoneyFlow() {
  const { jobs } = useOverview();
  const job = jobs.find((item: Booking) => item.paymentStatus === "paid") ?? jobs.find((item: Booking) => item.agreed != null && !item.simulatedCustomer);
  if (!job || job.agreed == null) return <div className="dw dw-empty">No completed booking yet.</div>;
  const paid = job.paymentStatus === "paid";
  const charge = job.paypal.find(item => item.kind === "charge");
  const steps = [
    { label: paid ? "Customer charged" : "Customer pays", who: job.customer, amount: job.agreed, note: paid ? `PayPal order ${charge?.id ?? ""}` : job.payment === "PayPal" ? "PayPal, after the job" : "Cash" },
    { label: "Doyo keeps 15%", who: "Doyo", amount: job.commission, note: "Commission" },
    { label: paid ? "Worker paid out" : "Worker receives", who: job.worker ?? "Worker", amount: job.workerShare, note: charge?.payoutBatchId ? `PayPal payout ${charge.payoutBatchId}` : paid ? "PayPal payout" : "On completion" },
  ];
  return (
    <div className="dw dw-flow">
      {steps.map((step, index) => (
        <div key={step.label} className={`flow-step${index === 2 ? " accent" : ""}`} style={{ "--i": index } as React.CSSProperties}>
          <span>{step.label}</span>
          <b>{pkr(step.amount)}</b>
          <i>{step.who}</i>
          <small>{step.note}</small>
        </div>
      ))}
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function ago(at: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

/** Each recent booking's agreed price against the customer's limit. */
export function PriceLadder() {
  const { jobs } = useOverview();
  const rows = jobs.filter(job => !job.simulatedCustomer && job.agreed && job.limit).slice(0, 5);
  if (!rows.length) return <div className="dw dw-empty">No bookings yet.</div>;
  return (
    <div className="dw ladder">
      {rows.map((job, index) => {
        const paid = Math.min(100, ((job.agreed ?? 0) / (job.limit ?? 1)) * 100);
        return (
          <div className="rung" key={job.id} style={{ "--i": index } as React.CSSProperties}>
            <div className="rung-top">
              <b>{job.customer}</b>
              <span>{serviceName(job.service)}</span>
              <em>{pkr(job.underLimit)} under</em>
            </div>
            <div className="track" title={`Paid ${pkr(job.agreed)} of ${pkr(job.limit)}`}>
              <i style={{ width: `${paid}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Workers ranked by what they earned through Doyo. */
export function WorkerBoard() {
  const { workers } = useOverview();
  const ranked = workers.filter(worker => worker.jobs > 0).sort((a, b) => b.earned - a.earned).slice(0, 5);
  if (!ranked.length) return <div className="dw dw-empty">No completed jobs yet.</div>;
  const top = ranked[0].earned || 1;
  return (
    <div className="dw board">
      {ranked.map((worker, index) => (
        <div className="board-row" key={worker.id} style={{ "--i": index } as React.CSSProperties}>
          <span className={index === 0 ? "avatar first" : "avatar"}>{initials(worker.name)}</span>
          <div className="board-main">
            <div className="board-line">
              <b>{worker.name}</b>
              <strong>{pkr(worker.earned)}</strong>
            </div>
            <div className="board-line">
              <small>
                {worker.jobs} {worker.jobs === 1 ? "job" : "jobs"}
                {worker.paidOut > 0 ? ` · ${pkr(worker.paidOut)} by PayPal` : ""}
              </small>
            </div>
            <div className="bar">
              <i style={{ width: `${(worker.earned / top) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type Event = { key: string; at: number; kind: "booked" | "paid" | "payout" | "open"; text: string };

/** What just happened: bookings, PayPal charges and payouts, newest first. */
export function ActivityFeed() {
  const { jobs } = useOverview();
  const events: Event[] = [];
  for (const job of jobs) {
    if (job.simulatedCustomer) continue;
    const at = job.log.at(-1)?.at ?? job.createdAt;
    if (job.status === "open") events.push({ key: `${job.id}o`, at, kind: "open", text: `Doyo is negotiating for ${job.customer}` });
    if (job.agreed && job.worker) events.push({ key: `${job.id}b`, at, kind: "booked", text: `${job.customer} booked ${job.worker} at ${pkr(job.agreed)}` });
    const charge = job.paypal.find(item => item.kind === "charge" && item.status !== "failed");
    if (job.paymentStatus === "paid") events.push({ key: `${job.id}p`, at: at + 1, kind: "paid", text: `PayPal charged ${pkr(charge?.amount ?? job.agreed)}` });
    if (charge?.payoutBatchId) events.push({ key: `${job.id}w`, at: at + 2, kind: "payout", text: `${job.worker} paid ${pkr(job.workerShare)} by PayPal` });
  }
  events.sort((a, b) => b.at - a.at);
  if (!events.length) return <div className="dw dw-empty">Nothing yet.</div>;
  return (
    <ol className="dw feed">
      {events.slice(0, 6).map((event, index) => (
        <li key={event.key} className={event.kind} style={{ "--i": index } as React.CSSProperties}>
          <i />
          <span>{event.text}</span>
          <time>{ago(event.at)}</time>
        </li>
      ))}
    </ol>
  );
}

/** How fast Doyo books, against a one-minute mark. */
export function BookingSpeed() {
  const { jobs } = useOverview();
  const times = jobs.filter(job => !job.simulatedCustomer && job.secondsToBook != null && job.secondsToBook > 0).map(job => job.secondsToBook as number);
  if (!times.length) return <div className="dw dw-empty">No bookings yet.</div>;
  const average = Math.round(times.reduce((sum, value) => sum + value, 0) / times.length);
  const fastest = Math.min(...times);
  const share = Math.min(1, average / 60);
  const length = 2 * Math.PI * 52;
  return (
    <div className="dw speed">
      <div className="speed-dial">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" className="ring-bg" />
          <circle cx="60" cy="60" r="52" className="ring" style={{ "--arc": `${length * share}px`, "--len": `${length}px` } as React.CSSProperties} />
        </svg>
        <div className="speed-mid">
          <b>
            <CountUp to={average} />s
          </b>
          <span>to book</span>
        </div>
      </div>
      <p>
        Fastest <b>{fastest}s</b> · {times.length} bookings
      </p>
    </div>
  );
}
