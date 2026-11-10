import { File } from "expo-file-system";
import { API_BASE_URL } from "./apiBase";

export type WorkerApplicationLookup = {
  found: boolean;
  status: string;
  application?: {
    id: string;
    fullName: string;
    phone: string;
    status: string;
  };
};

export type AccountLookup = {
  found: boolean;
  status: string;
  account?: {
    type: "customer" | "worker";
    id: string;
    name?: string;
    email?: string;
    phone: string;
    gender?: string;
    status: string;
  };
};

type SubmitWorkerApplicationInput = {
  uid?: string;
  email: string;
  phone: string;
  fullName: string;
  gender: string;
  dob: string;
  cnicNumber: string;
  services: string[];
  cnicFrontUri: string;
  cnicBackUri: string;
};

type SubmitCustomerRegistrationInput = {
  uid?: string;
  email: string;
  phone: string;
  name: string;
};

export type SubmitCustomerRegistrationResult = {
  ok: boolean;
  customerId: string;
  existing?: boolean;
};

async function readJson(response: Response, failure: string): Promise<any> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || failure);
  return data;
}

const postJson = (path: string, body: object) =>
  fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

// `expiresAt` is in seconds, which is what the sign-in screens expect.
export async function requestEmailOtp(email: string): Promise<{ challenge: string; expiresAt: number }> {
  const response = await postJson("/api/join/send-otp", { email: email.trim().toLowerCase() });
  const data = await readJson(response, "Could not send the verification code.");
  return { challenge: data.challenge, expiresAt: Math.floor(data.expiresAt / 1000) };
}

export async function verifyEmailOtp(email: string, otp: string, challenge: string): Promise<{ token: string }> {
  const response = await postJson("/api/join/verify-otp", { email: email.trim().toLowerCase(), otp, challenge });
  const { token } = await readJson(response, "Incorrect or expired code.");
  return { token };
}

async function lookUp<T extends { status: string }>(query: string, failure: string) {
  const response = await fetch(`${API_BASE_URL}/api/${query}`);
  return (await readJson(response, failure)) as { found?: boolean; status?: string; account?: T; application?: T };
}

export async function findWorkerApplicationByPhone(phone: string): Promise<WorkerApplicationLookup> {
  const data = await lookUp<NonNullable<WorkerApplicationLookup["application"]>>(
    `worker-application?phone=${encodeURIComponent(phone)}`,
    "Could not check your worker application.",
  );
  return {
    found: data.found === true,
    status: data.application?.status || data.status || "not_found",
    application: data.application,
  };
}

async function findAccount(query: string): Promise<AccountLookup> {
  const data = await lookUp<NonNullable<AccountLookup["account"]>>(query, "Could not check your account.");
  return {
    found: data.found === true,
    status: data.account?.status || data.status || "not_found",
    account: data.account,
  };
}

export function findAccountByPhone(phone: string, email: string, _uid?: string): Promise<AccountLookup> {
  return findAccount(`account-lookup?phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}`);
}

export function findAccountByAuth(email: string, _uid?: string): Promise<AccountLookup> {
  return findAccount(`auth-lookup?email=${encodeURIComponent(email)}`);
}

export async function submitInAppWorkerApplication(input: SubmitWorkerApplicationInput): Promise<void> {
  const form = new FormData();
  const fields: Record<string, string> = {
    email: input.email,
    phone: input.phone,
    full_name: input.fullName,
    gender: input.gender,
    dob: input.dob,
    cnic_number: input.cnicNumber,
  };
  Object.entries(fields).forEach(([name, value]) => form.append(name, value));
  input.services.forEach(service => form.append("services", service));
  // Expo's fetch reads an expo-file-system File as a binary part.
  form.append("cnic_front", new File(input.cnicFrontUri) as unknown as Blob);
  form.append("cnic_back", new File(input.cnicBackUri) as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/app-apply`, { method: "POST", body: form });
  await readJson(response, "Could not submit your worker application.");
}

export async function submitCustomerRegistration(input: SubmitCustomerRegistrationInput): Promise<SubmitCustomerRegistrationResult> {
  const { uid, ...registration } = input;
  const response = await postJson("/api/customer-register", registration);
  const data = await readJson(response, "Could not register customer.");
  return {
    ok: data.ok !== false,
    customerId: data.customerId || uid || input.email,
    existing: data.existing === true,
  };
}
