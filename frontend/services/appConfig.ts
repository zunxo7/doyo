import { API_BASE_URL } from "./apiBase";
import type { LngLat } from "./routing";

export type LaunchCampaignConfig = {
  enabled: boolean;
  startsAt: string;
  durationDays: number;
  workerCommissionDuring: number;
  workerCommissionAfter: number;
  customerFirstBookingDiscountPct: number;
  workerMessage: string;
  customerMessage: string;
};

export type CommissionPaymentsConfig = {
  mode: "auto" | "locked" | "unlocked";
};

type RoomPricing = { base: number; perExtraRoom: number };

export type AppPricingConfig = {
  home: { regular: RoomPricing; deep: RoomPricing };
  vehicle: { bike: number; car: number; van: number };
  furniture: { small: number; big: number };
  barber: { haircut: number; beard: number; haircutBeard: number };
};

export type OperatingHoursConfig = {
  open: string;
  close: string;
  timezoneOffsetMinutes: number;
};

export type ServiceAreaCircle = {
  center: LngLat;
  radiusKm: number;
};

export type ServiceAreaConfig = {
  enabled: boolean;
  label: string;
  unavailableMessage: string;
  requiredAddressPatterns: string[];
  allowedAddressPatterns: string[];
  blockedAddressPatterns: string[];
  circle: ServiceAreaCircle | null;
  polygons: LngLat[][];
};

export type RunningNoticeConfig = {
  enabled: boolean;
  message: string;
};

export type WorkerPreferenceConfig = {
  femaleLocked: boolean;
  femaleLockedMessage: string;
};

export type RewardOptionConfig = {
  key: "discount_500" | "free_2000_job" | "discount_1000";
  label: string;
  amountOff: number;
  points: number;
};

export type AppConfig = {
  workerAppUnlocked: boolean;
  releaseInstallInstructionsEnabled: boolean;
  appVersion: {
    minSupportedVersion: string;
    latestVersion: string;
    updateMessage: string;
    updateUrl: string;
  };
  launchCampaign: LaunchCampaignConfig;
  commissionPayments: CommissionPaymentsConfig;
  pricing: AppPricingConfig;
  operatingHours: OperatingHoursConfig;
  serviceArea: ServiceAreaConfig;
  reviewLocation: { coordinates: LngLat; address: string } | null;
  workerPreference: WorkerPreferenceConfig;
  runningNotice: RunningNoticeConfig;
  rewards: RewardOptionConfig[];
  lockedScreen: {
    release: {
      title: string;
      accentText: string;
      status: string;
      cardTitle: string;
      steps: string[];
    };
    waiting: {
      title: string;
      accentText: string;
      customerStatus: string;
      workerStatus: string;
    };
  };
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  workerAppUnlocked: true,
  releaseInstallInstructionsEnabled: false,
  appVersion: {
    minSupportedVersion: "1.0.0",
    latestVersion: "1.0.0",
    updateMessage: "Please update your app to continue using Doyo.",
    updateUrl: "",
  },
  launchCampaign: {
    enabled: true,
    startsAt: "2026-08-06T00:00:00+05:00",
    durationDays: 40,
    workerCommissionDuring: 0,
    workerCommissionAfter: 0.15,
    customerFirstBookingDiscountPct: 50,
    workerMessage: "Workers pay 0% commission for the first month.",
    customerMessage: "Customers receive 50% launch discount for the whole launch month.",
  },
  commissionPayments: {
    mode: "auto",
  },
  pricing: {
    home: {
      regular: { base: 120, perExtraRoom: 120 },
      deep: { base: 169, perExtraRoom: 169 },
    },
    vehicle: { bike: 149, car: 249, van: 349 },
    furniture: { small: 249, big: 499 },
    barber: { haircut: 499, beard: 299, haircutBeard: 699 },
  },
  operatingHours: {
    open: "00:00",
    close: "23:59",
    timezoneOffsetMinutes: 300,
  },
  serviceArea: {
    enabled: false,
    label: "Pakistan",
    unavailableMessage: "Doyo is currently available only in Pakistan.",
    requiredAddressPatterns: [],
    allowedAddressPatterns: [],
    blockedAddressPatterns: [],
    circle: null,
    polygons: [],
  },
  reviewLocation: { coordinates: [73.0169, 33.675], address: "G-10 Markaz, Islamabad" },
  runningNotice: {
    enabled: true,
    message:
      "Please do not cancel your booking if a service provider requests you to do so. If you experience any issue, contact our support team and we will assist you immediately.",
  },
  workerPreference: {
    femaleLocked: true,
    femaleLockedMessage: "Female workers will be onboarded soon.",
  },
  rewards: [
    { key: "discount_500", label: "PKR100 discount", amountOff: 100, points: 100 },
    { key: "free_2000_job", label: "PKR250 discount", amountOff: 250, points: 250 },
    { key: "discount_1000", label: "PKR500 discount", amountOff: 500, points: 500 },
  ],
  lockedScreen: {
    release: {
      title: "Doyo\nis Live",
      accentText: "Doyo",
      status: "Install the store app",
      cardTitle: "Move to the official app",
      steps: [
        "Uninstall this early access app.",
        "Open Google Play Store or the App Store and search for Doyo.",
        "Install Doyo, then log back in with the same email and phone number.",
      ],
    },
    waiting: {
      title: "Doyo\nComing Soon",
      accentText: "Doyo",
      customerStatus: "Customer app locked",
      workerStatus: "Application in review",
    },
  },
};

const DAY_MS = 86_400_000;

let currentConfig = DEFAULT_APP_CONFIG;

export const getCachedAppConfig = (): AppConfig => currentConfig;

// The backend sends a subset, so anything it omits keeps its default.
export async function getAppConfig(): Promise<AppConfig> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/app-config`);
    if (response.ok) {
      const served: Partial<AppConfig> | null = await response.json();
      currentConfig = { ...DEFAULT_APP_CONFIG, ...served, workerAppUnlocked: served?.workerAppUnlocked !== false };
    }
  } catch (error) {
    console.warn("using cached app config", error);
  }
  return currentConfig;
}

export function getLaunchWindow(config: AppConfig, now = Date.now()) {
  const { enabled, durationDays, startsAt: start } = config.launchCampaign;
  const startsAt = Date.parse(start);
  const endsAt = Number.isNaN(startsAt) ? 0 : startsAt + Math.max(1, durationDays) * DAY_MS;
  const active = enabled && now >= startsAt && now < endsAt;
  return { startsAt, endsAt, active, remainingMs: active ? endsAt - now : 0 };
}

export function formatLaunchCountdown(ms: number, includeSeconds = false, translate: (key: string) => string = key => key): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const dayHour = `${days} ${translate("Days")} ${hours} ${translate("Hours")}`;
  return includeSeconds
    ? `${dayHour} ${minutes} ${translate("Min")} ${seconds % 60} ${translate("Sec")}`
    : `${dayHour} ${minutes} ${translate("Minutes")}`;
}

export function isCommissionPaymentsLocked(config: AppConfig, now = Date.now()): boolean {
  const { mode } = config.commissionPayments;
  return mode === "auto" ? getLaunchWindow(config, now).active : mode === "locked";
}

const clockParts = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return { hour: hour || 0, minute: minute || 0 };
};

const minutesOfDay = (time: string) => {
  const { hour, minute } = clockParts(time);
  return hour * 60 + minute;
};

export function isWithinOperatingHours(config: AppConfig, date = new Date()): boolean {
  const { open, close, timezoneOffsetMinutes } = config.operatingHours;
  const shifted = new Date(date.getTime() + timezoneOffsetMinutes * 60_000);
  const now = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  const opensAt = minutesOfDay(open);
  const closesAt = minutesOfDay(close);
  if (opensAt <= closesAt) return now >= opensAt && now < closesAt;
  return now >= opensAt || now < closesAt;
}

export function formatOperatingHours(config: AppConfig): string {
  const twelveHour = (time: string) => {
    const { hour, minute } = clockParts(time);
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  };
  return `Open: ${twelveHour(config.operatingHours.open)}  Close: ${twelveHour(config.operatingHours.close)}`;
}
