import type { AgDataSourcesDefinition } from "ag-studio";
import type { Booking, Overview } from "./api";

const SERVICES: Record<string, string> = { home: "Home cleaning", vehicle: "Vehicle wash", furniture: "Furniture shifting", barber: "Barber" };
const STATUSES: Record<string, string> = { open: "Negotiating", assigned: "Booked", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };
const OFFER_RESULTS: Record<string, string> = { pending: "Pending", accepted: "Accepted", declined: "Countered", rejected: "Not chosen", cancelled: "Withdrawn" };
const PAYMENT_KINDS: Record<string, string> = { charge: "Job charge", hold: "Hold", commission: "Commission" };

export const serviceName = (service: string) => SERVICES[service] ?? service;
export const statusName = (status: string) => STATUSES[status] ?? status;

/** What custom widgets and the assistant's tools read; the grids and charts go through Studio's data engine. */
let latest: Overview = { at: 0, jobs: [], workers: [], payments: [] };
const listeners = new Set<() => void>();
export const getOverview = () => latest;
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Flat tables for Studio. Requests from the simulated customer are left out: they are not real demand. */
export function toSources(overview: Overview): AgDataSourcesDefinition {
  latest = overview;
  listeners.forEach(listener => listener());
  const real = overview.jobs.filter(job => !job.simulatedCustomer);
  const bookings = real.map((job: Booking) => ({
    id: job.id,
    day: new Date(job.createdAt).toISOString().slice(0, 10),
    customer: job.customer,
    service: serviceName(job.service),
    job: job.detail,
    status: statusName(job.status),
    bookedBy: job.booker,
    payWith: job.payment,
    paypal: job.paymentStatus === "paid" ? "Paid" : job.paymentStatus === "failed" ? "Failed" : job.payment === "PayPal" ? "Not charged yet" : "Cash",
    asked: job.ask,
    limit: job.limit ?? 0,
    agreed: job.agreed ?? 0,
    underLimit: job.underLimit ?? 0,
    offers: job.offers,
    counterOffers: job.counters,
    secondsToBook: job.secondsToBook ?? 0,
    worker: job.worker ?? "None",
    workerType: job.simulatedWorker == null ? "None" : job.simulatedWorker ? "Simulated" : "Real",
    doyoCommission: job.commission ?? 0,
    workerReceives: job.workerShare ?? 0,
  }));
  const offers = real.flatMap(job =>
    job.offerList.map((offer, index) => ({
      id: `${job.id}-${index}`,
      service: serviceName(job.service),
      customer: job.customer,
      worker: offer.name,
      price: offer.price,
      rating: Number(offer.rating) || 0,
      minutesAway: offer.minutesAway,
      result: OFFER_RESULTS[offer.status] ?? offer.status,
    })),
  );
  const payments = overview.payments.map(payment => ({
    order: payment.id,
    kind: PAYMENT_KINDS[payment.kind] ?? payment.kind,
    status: payment.status,
    amount: payment.amount,
    capture: payment.captureId ?? "",
    payoutBatch: payment.payoutBatchId ?? "",
    paidOut: payment.payoutBatchId ? "Yes" : "No",
  }));
  const workers = overview.workers.map(worker => ({
    worker: worker.name,
    type: worker.simulated ? "Simulated" : "Real",
    jobsDone: worker.jobs,
    earned: worker.earned,
    doyoCommission: worker.commission,
    paidOutByPayPal: worker.paidOut,
    commissionOwed: worker.commissionDue,
  }));
  return {
    sources: [
      { id: "bookings", data: bookings },
      { id: "offers", data: offers },
      { id: "payments", data: payments },
      { id: "workers", data: workers },
    ],
  };
}
