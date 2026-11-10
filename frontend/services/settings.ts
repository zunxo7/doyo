import * as SecureStore from "expo-secure-store";

const SETTINGS_KEY = "doyo_settings";
const LANGUAGE_CHOSEN_KEY = "doyo_language_chosen";

export type Language = "en" | "ur";
export type ThemePref = "dark";
export type PaymentPref = "PayPal" | "Cash";

export type ActiveReward = {
  key: "discount_500" | "free_2000_job" | "discount_1000";
  label: string;
  amountOff: number;
  points: number;
  id?: string;
};

export interface AppSettings {
  language: Language;
  theme: ThemePref;
  notificationsEnabled: boolean;
  defaultPayment: PaymentPref;
  activeReward: ActiveReward | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "en",
  theme: "dark",
  notificationsEnabled: true,
  defaultPayment: "PayPal",
  activeReward: null,
};

const PAYMENT_PREFS: PaymentPref[] = ["PayPal", "Cash"];

export async function getSettings(): Promise<AppSettings> {
  try {
    const stored = await SecureStore.getItemAsync(SETTINGS_KEY);
    const saved: Partial<AppSettings> = stored ? JSON.parse(stored) : {};
    return {
      ...DEFAULT_SETTINGS,
      language: "en",
      notificationsEnabled: saved.notificationsEnabled !== false,
      defaultPayment: PAYMENT_PREFS.find(payment => payment === saved.defaultPayment) ?? "PayPal",
      activeReward: saved.activeReward ?? null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings)).catch(() => undefined);
}

export async function hasChosenLanguage(): Promise<boolean> {
  const chosen = await SecureStore.getItemAsync(LANGUAGE_CHOSEN_KEY).catch(() => null);
  return chosen === "1";
}

export async function markLanguageChosen(): Promise<void> {
  await SecureStore.setItemAsync(LANGUAGE_CHOSEN_KEY, "1").catch(() => undefined);
}
