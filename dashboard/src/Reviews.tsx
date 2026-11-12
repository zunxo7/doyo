import { useCallback, useEffect, useState } from "react";
import { call } from "./api";

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

const pkr = (value: number) => `PKR ${value.toLocaleString()}`;
const when = (at: number) => new Date(at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function ReviewCard({ review, onDone }: { review: Review; onDone: () => void }) {
  const [amount, setAmount] = useState(String(review.suggested || Math.round(review.maxRefund / 2)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(false);

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

  const value = Math.round(Number(amount));
  const valid = Number.isFinite(value) && value > 0 && value <= review.maxRefund;

  return (
    <article className={review.decided ? "review settled" : "review"}>
      {review.photo ? (
        <button type="button" className="review-photo" onClick={() => setZoom(true)} aria-label="Open photo">
          <img src={review.photo} alt="Photo the customer sent" />
        </button>
      ) : (
        <div className="review-photo empty">No photo</div>
      )}
      <div className="review-body">
        <div className="review-head">
          <b>{review.detail}</b>
          <time>{when(review.at)}</time>
        </div>
        <p className="review-meta">
          {review.customer} · {review.worker ?? "Worker"} · paid {pkr(review.price)}
        </p>
        <blockquote>“{review.text}”</blockquote>
        {review.note ? (
          <p className="review-note">
            <span>Claude</span>
            {review.note}
          </p>
        ) : null}
        {review.decided ? (
          <p className="review-outcome">{review.decided.refund ? `Refunded ${pkr(review.decided.refund)} by PayPal` : "Closed with no refund"}</p>
        ) : (
          <div className="review-actions">
            <label>
              PKR
              <input inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} />
            </label>
            <button className="btn" type="button" disabled={busy || !valid} onClick={() => void decide(value)}>
              Refund by PayPal
            </button>
            <button className="ghost" type="button" disabled={busy} onClick={() => void decide(0)}>
              No refund
            </button>
            <small>Up to {pkr(review.maxRefund)}</small>
          </div>
        )}
        {error ? (
          <p className="review-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {zoom && review.photo ? (
        <button type="button" className="review-zoom" onClick={() => setZoom(false)} aria-label="Close photo">
          <img src={review.photo} alt="Photo the customer sent" />
        </button>
      ) : null}
    </article>
  );
}

/** Complaints the agent sent to a person: the customer's words and photo, Claude's note, and a refund decision. */
export function Reviews({ tick, onCount }: { tick: number; onCount: (open: number) => void }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);

  const load = useCallback(async () => {
    const { reviews: next } = await call<{ reviews: Review[] }>("/api/ops/reviews");
    setReviews(next);
    onCount(next.filter(review => !review.decided).length);
  }, [onCount]);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load, tick]);

  if (!reviews) return <div className="loading">Loading reviews</div>;
  const open = reviews.filter(review => !review.decided);
  const settled = reviews.filter(review => review.decided);
  return (
    <div className="reviews">
      <header>
        <h2>Complaints for review</h2>
        <p>Doyo refunds a complaint itself when the photo shows the problem. The rest come here, with Claude's note, for a person to decide.</p>
      </header>
      {open.length ? open.map(review => <ReviewCard key={review.jobId} review={review} onDone={() => void load()} />) : <p className="reviews-empty">Nothing waiting.</p>}
      {settled.length ? (
        <>
          <h3>Settled</h3>
          {settled.slice(0, 10).map(review => (
            <ReviewCard key={review.jobId} review={review} onDone={() => void load()} />
          ))}
        </>
      ) : null}
    </div>
  );
}
