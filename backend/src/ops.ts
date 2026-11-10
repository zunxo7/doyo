import { COMMISSION_RATE, events, type Job, type Offer, type User } from "./jobs.ts";
import { publish } from "./live.ts";
import type { Payment } from "./paypal.ts";
import * as store from "./store.ts";

/** Read-only view of the marketplace for the operations dashboard. Names only: no emails, phones or tokens. */

type LedgerDoc = { id: string; commissionDue: number; transactions: { amount: number; type: string }[] };

const admins = new Set<string>();
const isSim = (id: string | null) => Boolean(id?.startsWith("sim-"));

export const isAdmin = (userId: string) => Boolean(store.get("admins", userId));
export const makeAdmin = (userId: string) => void store.put("admins", { id: userId });

export function overview() {
  const offers = store.list<Offer>("offers");
  const payments = store.list<Payment>("payments");
  const jobs = store
    .list<Job>("jobs")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 300)
    .map(job => {
      const jobOffers = offers.filter(offer => offer.jobId === job.id);
      const accepted = jobOffers.find(offer => offer.workerId === job.acceptedWorkerId && offer.status === "accepted");
      const log = job.agent?.log ?? [];
      const agreed = job.acceptedPrice;
      const commission = agreed ? Math.round(agreed * COMMISSION_RATE) : null;
      return {
        id: job.id,
        createdAt: job.createdAt,
        customer: job.customerName || "Customer",
        simulatedCustomer: isSim(job.customerId),
        service: job.service,
        detail: job.detail,
        address: job.address,
        status: job.status,
        phase: job.workerPhase,
        booker: job.agent ? "Doyo" : "Customer",
        agentStatus: job.agent?.status ?? null,
        ask: job.price,
        limit: job.agent?.budget ?? null,
        agreed,
        underLimit: agreed && job.agent ? job.agent.budget - agreed : null,
        offers: jobOffers.length,
        counters: log.filter(line => line.from === "doyo" && /could you|can you/i.test(line.text)).length,
        secondsToBook: accepted && log.length ? Math.round((log.at(-1)!.at - job.createdAt) / 1000) : null,
        worker: accepted?.name ?? null,
        simulatedWorker: accepted ? isSim(accepted.workerId) : null,
        payment: job.payment,
        paymentStatus: job.paymentStatus ?? null,
        commission,
        workerShare: agreed && commission !== null ? agreed - commission : null,
        log,
        offerList: jobOffers.map(({ name, price, rating, minutesAway, status, workerId }) => ({ name, price, rating, minutesAway, status, simulated: isSim(workerId) })),
        paypal: payments
          .filter(payment => payment.jobId === job.id)
          .map(({ id, kind, status, amount, captureId, payoutBatchId }) => ({ id, kind, status, amount, captureId, payoutBatchId: payoutBatchId ?? null })),
      };
    });

  const names = new Map<string, string>();
  for (const offer of offers) names.set(offer.workerId, offer.name);
  for (const user of store.list<User>("users")) if (user.role === "worker") names.set(user.id, user.name);
  const workers = store.list<LedgerDoc>("ledgers").map(ledger => {
    const sum = (type: string) => ledger.transactions.filter(txn => txn.type === type).reduce((total, txn) => total + Math.abs(txn.amount), 0);
    return {
      id: ledger.id,
      name: names.get(ledger.id) ?? "Worker",
      simulated: isSim(ledger.id),
      jobs: ledger.transactions.filter(txn => txn.type === "earning").length,
      earned: sum("earning"),
      commission: sum("commission"),
      paidOut: sum("payout"),
      commissionDue: ledger.commissionDue,
    };
  });

  return {
    at: Date.now(),
    jobs,
    workers,
    payments: payments.map(({ id, kind, status, amount, jobId, captureId, payoutBatchId }) => ({ id, kind, status, amount, jobId, captureId, payoutBatchId: payoutBatchId ?? null })),
  };
}

export function watchOps(userId: string): void {
  admins.add(userId);
}

let pending: NodeJS.Timeout | null = null;

/** Tells every open dashboard to refetch, at most a few times a second. */
export function startOps(): void {
  events.on("job:changed", () => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      for (const userId of admins) publish(`ops:${userId}`, { type: "changed" });
    }, 250);
  });
}
