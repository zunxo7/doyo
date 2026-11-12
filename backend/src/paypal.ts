import { randomUUID } from "node:crypto";
import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrderApplicationContextShippingPreference,
  OrdersController,
  PaymentsController,
  PaypalPaymentTokenCustomerType,
  PaypalPaymentTokenUsageType,
  UsagePattern,
  VaultController,
  VaultInstructionAction,
  VaultTokenRequestType,
} from "@paypal/paypal-server-sdk";
import { HttpError } from "./auth.ts";
import * as jobs from "./jobs.ts";
import * as store from "./store.ts";

// PayPal has no PKR, so sandbox charges run in USD at this fixed demo rate.
const PKR_PER_USD = 280;
const MIN_COMMISSION_PKR = 50;
const API_BASE = "https://api-m.sandbox.paypal.com";

type Kind = "commission" | "hold";
// The customer's saved PayPal account, keyed by user id. tokenId is null until they approve.
type Link = { id: string; setupTokenId: string; tokenId: string | null };
export type Payment = {
  id: string;
  kind: Kind | "charge";
  userId: string;
  amount: number;
  status: "created" | "succeeded" | "failed" | "captured" | "voided";
  authorizationId: string | null;
  captureId: string | null;
  jobId: string | null;
  payoutBatchId?: string;
};

const clientId = process.env.PAYPAL_CLIENT_ID ?? "";
const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? "";
const client = new Client({
  clientCredentialsAuthCredentials: { oAuthClientId: clientId, oAuthClientSecret: clientSecret },
  timeout: 15_000,
  environment: Environment.Sandbox,
});
const orders = new OrdersController(client);
const payments = new PaymentsController(client);
const vault = new VaultController(client);

// Stops a double tap running one capture twice.
const confirming = new Set<string>();

const usd = (pkr: number) => ({ currencyCode: "USD", value: Math.max(pkr / PKR_PER_USD, 0.01).toFixed(2) });

async function createOrder(kind: Kind, userId: string, amount: number, description: string, publicBase: string) {
  if (!clientId || !clientSecret) throw new HttpError(503, "PayPal is not set up.");
  const { result } = await orders.createOrder({
    prefer: "return=minimal",
    body: {
      intent: kind === "hold" ? CheckoutPaymentIntent.Authorize : CheckoutPaymentIntent.Capture,
      purchaseUnits: [{ amount: usd(amount), description }],
      applicationContext: {
        brandName: "Doyo",
        shippingPreference: OrderApplicationContextShippingPreference.NoShipping,
        returnUrl: `${publicBase}/paypal/return`,
        cancelUrl: `${publicBase}/paypal/cancel`,
      },
    },
  });
  const checkoutUrl = result.links?.find(link => link.rel === "approve" || link.rel === "payer-action")?.href;
  if (!result.id || !checkoutUrl) throw new HttpError(502, "PayPal did not return a checkout link.");
  store.put<Payment>("payments", {
    id: result.id,
    kind,
    userId,
    amount,
    status: "created",
    authorizationId: null,
    captureId: null,
    jobId: null,
  });
  return { id: result.id, checkoutUrl, amount };
}

export function startHold(userId: string, amount: number, publicBase: string) {
  if (!(amount > 0)) throw new HttpError(400, "Enter an amount above zero.");
  return createOrder("hold", userId, amount, "Doyo booking hold", publicBase);
}

export function startCommissionPayment(workerId: string, requested: number, publicBase: string) {
  const { commissionDue } = jobs.earnings(workerId);
  if (commissionDue < MIN_COMMISSION_PKR) throw new HttpError(400, `The minimum payment is PKR ${MIN_COMMISSION_PKR}.`);
  const amount = Math.min(Math.max(requested, MIN_COMMISSION_PKR), commissionDue);
  return createOrder("commission", workerId, amount, "Doyo commission", publicBase);
}

const isNotApproved = (error: unknown) =>
  error instanceof ApiError && String(error.body).includes("ORDER_NOT_APPROVED");

/** Runs after the payer returns from PayPal: authorises a hold, or captures a commission payment. */
export async function confirm(id: string, userId: string) {
  const payment = store.get<Payment>("payments", id);
  if (!payment || payment.userId !== userId) throw new HttpError(404, "This payment no longer exists.");
  if (payment.status !== "created" || confirming.has(id)) return payment;
  confirming.add(id);
  try {
    if (payment.kind === "hold") {
      const { result } = await orders.authorizeOrder({ id, prefer: "return=representation", paypalRequestId: id });
      const authorization = result.purchaseUnits?.[0]?.payments?.authorizations?.[0];
      payment.authorizationId = authorization?.id ?? null;
      payment.status = payment.authorizationId ? "succeeded" : "failed";
    } else {
      const { result } = await orders.captureOrder({ id, prefer: "return=representation", paypalRequestId: id });
      const capture = result.purchaseUnits?.[0]?.payments?.captures?.[0];
      payment.captureId = capture?.id ?? null;
      payment.status = capture?.status === "COMPLETED" ? "succeeded" : "failed";
      if (payment.status === "succeeded") jobs.settleCommission(userId, payment.amount);
    }
  } catch (error) {
    if (isNotApproved(error)) return payment;
    console.warn("paypal confirm failed:", error instanceof ApiError ? `${error.statusCode} ${String(error.body).slice(0, 300)}` : error);
    payment.status = "failed";
  } finally {
    confirming.delete(id);
  }
  return store.put("payments", payment);
}

// The demo's shared sandbox buyer, saved under this id. Anyone without their own PayPal books with it,
// so nobody has to sign in to PayPal to try Doyo; someone who links their own still uses theirs.
const DEMO_LINK = "demo";
const savedToken = (userId: string) =>
  store.get<Link>("paypalLinks", userId)?.tokenId ?? store.get<Link>("paypalLinks", DEMO_LINK)?.tokenId ?? null;

export const isLinked = (userId: string) => Boolean(savedToken(userId));

/** Saves the customer's PayPal once, charging nothing, so later bookings need no PayPal screen. */
export async function startLink(userId: string, publicBase: string) {
  if (!clientId || !clientSecret) throw new HttpError(503, "PayPal is not set up.");
  const { result } = await vault.createSetupToken({
    paypalRequestId: randomUUID(),
    body: {
      paymentSource: {
        paypal: {
          description: "Doyo bookings",
          usagePattern: UsagePattern.Immediate,
          usageType: PaypalPaymentTokenUsageType.Merchant,
          customerType: PaypalPaymentTokenCustomerType.Consumer,
          experienceContext: {
            brandName: "Doyo",
            returnUrl: `${publicBase}/paypal/return`,
            cancelUrl: `${publicBase}/paypal/cancel`,
            vaultInstruction: VaultInstructionAction.OnPayerApproval,
          },
        },
      },
    },
  });
  const checkoutUrl = result.links?.find(link => link.rel === "approve")?.href;
  if (!result.id || !checkoutUrl) throw new HttpError(502, "PayPal did not return a link page.");
  store.put<Link>("paypalLinks", { id: userId, setupTokenId: result.id, tokenId: null });
  return { id: result.id, checkoutUrl };
}

export async function confirmLink(setupTokenId: string, userId: string) {
  const link = store.get<Link>("paypalLinks", userId);
  if (!link || link.setupTokenId !== setupTokenId) throw new HttpError(404, "This PayPal link no longer exists.");
  if (link.tokenId) return { linked: true };
  try {
    const { result } = await vault.createPaymentToken({
      paypalRequestId: setupTokenId,
      body: { paymentSource: { token: { id: setupTokenId, type: VaultTokenRequestType.SetupToken } } },
    });
    if (!result.id) return { linked: false };
    store.put<Link>("paypalLinks", { ...link, tokenId: result.id });
    return { linked: true };
  } catch (error) {
    console.warn("paypal link failed:", error instanceof ApiError ? `${error.statusCode} ${String(error.body).slice(0, 300)}` : error);
    return { linked: false };
  }
}

/** Ties an authorised hold to one job; the hold is the most that job can ever charge. */
export function claimHold(id: string | undefined, userId: string, needed: number) {
  const payment = id ? store.get<Payment>("payments", id) : null;
  if (!payment || payment.userId !== userId || payment.kind !== "hold" || payment.status !== "succeeded" || payment.jobId) {
    throw new HttpError(402, "Approve the PayPal hold first.");
  }
  if (payment.amount < needed) throw new HttpError(402, "Your PayPal hold does not cover this request.");
  return { id: payment.id, amount: payment.amount };
}

export function linkHold(id: string, jobId: string): void {
  const payment = store.get<Payment>("payments", id);
  if (payment) store.put("payments", { ...payment, jobId });
}

async function accessToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`PayPal token failed: ${response.status}`);
  return ((await response.json()) as { access_token: string }).access_token;
}

/** The server SDK has no Payouts controller, so this one call goes to the REST API. */
async function payWorker(job: jobs.Job, payment: Payment | null): Promise<void> {
  const workerId = job.acceptedWorkerId!;
  const amount = jobs.workerShare(job);
  const receiver = store.get<jobs.User>("users", workerId)?.email ?? `${workerId}@letdoyo.com`;
  const { value, currencyCode: currency } = usd(amount);
  const response = await fetch(`${API_BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
    body: JSON.stringify({
      // PayPal refuses a repeated batch id, so a job can only ever pay out once.
      sender_batch_header: { sender_batch_id: job.id, email_subject: "You've been paid by Doyo" },
      items: [{ recipient_type: "EMAIL", amount: { value, currency }, receiver, note: job.detail, sender_item_id: job.id }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`PayPal payout failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
  const { batch_header: batch } = (await response.json()) as { batch_header: { payout_batch_id: string } };
  if (payment) store.put("payments", { ...payment, payoutBatchId: batch.payout_batch_id });
  jobs.recordPayout(workerId, amount, job.detail);
}

/**
 * Authorizes the agreed price on the saved PayPal account the moment a deal is struck, so the money is
 * committed at booking and only moves when the work is done. If PayPal refuses, the job is charged on completion.
 */
async function holdSaved(job: jobs.Job): Promise<void> {
  const tokenId = savedToken(job.customerId);
  const amount = job.acceptedPrice;
  if (!tokenId || !amount || job.paypalHold) return;
  const { result } = await orders.createOrder({
    paypalRequestId: `hold-${job.id}`,
    prefer: "return=representation",
    body: {
      intent: CheckoutPaymentIntent.Authorize,
      purchaseUnits: [{ amount: usd(amount), description: job.detail, customId: job.id }],
      paymentSource: { paypal: { vaultId: tokenId } },
    },
  });
  const authorization = result.purchaseUnits?.[0]?.payments?.authorizations?.[0];
  if (!result.id || !authorization?.id) throw new Error(`hold not authorized: ${result.status}`);
  store.put<Payment>("payments", {
    id: result.id,
    kind: "hold",
    userId: job.customerId,
    amount,
    status: "succeeded",
    authorizationId: authorization.id,
    captureId: null,
    jobId: job.id,
  });
  jobs.setHold(job.id, { id: result.id, amount });
  if (job.agent) jobs.updateAgent(job.id, {}, `PayPal is holding PKR ${amount}. It's charged only when the job is done.`);
}

async function settleHold(job: jobs.Job): Promise<void> {
  const payment = store.get<Payment>("payments", job.paypalHold!.id);
  if (!payment?.authorizationId || payment.status !== "succeeded") return;
  if (job.status === "completed") {
    try {
      const { result } = await payments.captureAuthorizedPayment({
        authorizationId: payment.authorizationId,
        paypalRequestId: job.id,
        prefer: "return=representation",
        body: { amount: usd(job.acceptedPrice ?? job.price), finalCapture: true },
      });
      payment.captureId = result.id ?? null;
      payment.status = "captured";
      store.put("payments", payment);
      jobs.setPaymentStatus(job.id, "paid");
    } catch (error) {
      console.warn("paypal capture failed:", error instanceof ApiError ? String(error.body).slice(0, 300) : error);
      jobs.setPaymentStatus(job.id, "failed");
    }
    await payWorker(job, payment);
    return;
  } else {
    await payments.voidPayment({ authorizationId: payment.authorizationId, paypalRequestId: job.id });
    payment.status = "voided";
  }
  store.put("payments", payment);
}

/** Charges the saved account once the job is done. The worker is paid either way: a failed charge is Doyo's to recover. */
async function chargeSaved(job: jobs.Job): Promise<void> {
  const amount = job.acceptedPrice ?? job.price;
  let payment: Payment | null = null;
  try {
    const tokenId = savedToken(job.customerId);
    if (!tokenId) throw new Error("no saved PayPal account");
    const { result } = await orders.createOrder({
      paypalRequestId: job.id,
      prefer: "return=representation",
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [{ amount: usd(amount), description: job.detail }],
        paymentSource: { paypal: { vaultId: tokenId } },
      },
    });
    const capture = result.purchaseUnits?.[0]?.payments?.captures?.[0];
    if (!result.id || capture?.status !== "COMPLETED") throw new Error(`charge not completed: ${result.status}`);
    payment = store.put<Payment>("payments", {
      id: result.id,
      kind: "charge",
      userId: job.customerId,
      amount,
      status: "captured",
      authorizationId: null,
      captureId: capture.id ?? null,
      jobId: job.id,
    });
    jobs.setPaymentStatus(job.id, "paid");
  } catch (error) {
    console.warn("paypal charge failed:", error instanceof ApiError ? String(error.body).slice(0, 300) : error);
    jobs.setPaymentStatus(job.id, "failed");
  }
  await payWorker(job, payment);
}

/** Refunds part of a job's PayPal charge to the customer. */
export async function refundJob(job: jobs.Job, amount: number, note: string): Promise<string> {
  const payment = store.list<Payment>("payments").find(item => item.jobId === job.id && item.captureId && item.status === "captured");
  if (!payment?.captureId) throw new Error("no captured PayPal payment for this job");
  const { result } = await payments.refundCapturedPayment({
    captureId: payment.captureId,
    // One refund per job: a retry of the same request cannot refund twice.
    paypalRequestId: `refund-${job.id}`,
    prefer: "return=representation",
    body: { amount: usd(amount), noteToPayer: note.slice(0, 255), invoiceId: `refund-${job.id}` },
  });
  if (!result.id) throw new Error(`refund not created: ${result.status}`);
  return result.id;
}

export function startPayments(): void {
  jobs.events.on("offer:accepted", (job: jobs.Job) => {
    if (job.payment !== "PayPal") return;
    void holdSaved(job).catch(error =>
      console.warn("paypal hold failed, charging on completion:", error instanceof ApiError ? String(error.body).slice(0, 300) : error),
    );
  });
  jobs.events.on("job:ended", (job: jobs.Job) => {
    const failed = (error: unknown) => console.warn("paypal settle failed:", error instanceof ApiError ? String(error.body).slice(0, 300) : error);
    if (job.paypalHold) void settleHold(job).catch(failed);
    else if (job.payment === "PayPal" && job.status === "completed") void chargeSaved(job).catch(failed);
  });
}
