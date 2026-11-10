import { requestJson } from "./bidding";

export type PayPalSession = { id: string; checkoutUrl: string; amount: number };
export type PayPalResult = {
  id: string;
  status: "created" | "succeeded" | "failed" | "captured" | "voided";
  amount: number;
  captureId: string | null;
};

const post = <T,>(path: string, body: object = {}) => requestJson<T>(path, { method: "POST", body: JSON.stringify(body) });

export const getPayPalLink = () => requestJson<{ linked: boolean }>("/api/paypal/link");
export const startPayPalLink = () => post<{ id: string; checkoutUrl: string }>("/api/paypal/link");
export const confirmPayPalLink = (id: string) => post<{ linked: boolean }>(`/api/paypal/link/${encodeURIComponent(id)}/confirm`);
export const startPayPalHold = (amount: number) => post<PayPalSession>("/api/paypal/hold", { amount });
export const startCommissionPayment = (amount: number) => post<PayPalSession>("/api/paypal/commission", { amount });
export const confirmPayPal = (id: string) => post<PayPalResult>(`/api/paypal/${encodeURIComponent(id)}/confirm`);
