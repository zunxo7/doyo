import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  type AppSettings,
  type ActiveReward,
  type Language,
  type PaymentPref,
  type ThemePref,
} from "../services/settings";
import { translations } from "../i18n/translations";

interface SettingsContextValue {
  settings: AppSettings;
  ready: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePref) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDefaultPayment: (payment: PaymentPref) => void;
  setActiveReward: (reward: ActiveReward | null) => void;
  /**
   * Translate an English source string to the active language. Supports
   * `{token}` interpolation, e.g. t("PKR{price}", { price: 700 }).
   */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSettings().then(loaded => {
      setSettings(loaded);
      setReady(true);
    });
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const persist = (patch: Partial<AppSettings>) => {
      setSettings(current => {
        const next = { ...current, ...patch };
        void saveSettings(next);
        return next;
      });
    };
    const dict = translations[settings.language] ?? {};
    return {
      settings,
      ready,
      setLanguage: language => persist({ language }),
      setTheme: theme => persist({ theme }),
      setNotificationsEnabled: notificationsEnabled => persist({ notificationsEnabled }),
      setDefaultPayment: defaultPayment => persist({ defaultPayment }),
      setActiveReward: activeReward => persist({ activeReward }),
      t: (key, params) => {
        let result = dict[key] ?? key;
        if (params) {
          for (const [token, value] of Object.entries(params)) {
            result = result.replace(new RegExp(`\\{${token}\\}`, "g"), String(value));
          }
        }
        return result;
      },
    };
  }, [settings, ready]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}

/** Convenience hook for components that only need the translator. */
export function useT(): (key: string, params?: Record<string, string | number>) => string {
  return useSettings().t;
}
