import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import { getNotificationPermission, syncPushNotifications } from "../services/notifications";

/**
 * The notification switch: what it shows, and what flipping it does.
 *
 * The in-app setting and the OS permission drift apart the moment someone taps
 * "Don't allow" — the setting still reads on, the server still holds a token,
 * and not one push is ever shown. So `on` reports whether notifications will
 * actually arrive, not what the setting says.
 *
 * Both settings screens show the same row, so this lives here rather than
 * twice.
 */
export function useNotificationPermission() {
  const { settings, setNotificationsEnabled } = useSettings();

  // Optimistic, so a blocked-looking switch cannot flash before the first
  // check answers.
  const [granted, setGranted] = useState(true);

  /**
   * What the switch was just dragged to, before the OS and the server have
   * caught up.
   *
   * Asking permission and registering a token takes a round trip, and a switch
   * that sits still for it reads as a dead control — people tap again. It
   * moves now and is reconciled below.
   */
  const [pending, setPending] = useState<boolean | null>(null);

  const settled = settings.notificationsEnabled && granted;
  const on = pending ?? settled;

  // Drop the optimistic value the moment reality agrees with it, rather than
  // on a timer or in the handler — the two settle on different ticks.
  useEffect(() => {
    if (pending !== null && pending === settled) setPending(null);
  }, [pending, settled]);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      void getNotificationPermission().then(permission => {
        if (!cancelled) setGranted(permission.granted);
      });

    check();
    // Coming back from system settings is a foreground and nothing else —
    // there is no event for a permission granted outside the app.
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") check();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  /**
   * Flip the switch. Returns false when the OS refused, which is the caller's
   * cue to explain — after the first refusal Android marks it USER_FIXED and
   * stops showing the dialog at all, so nothing else would tell the user why
   * the switch bounced back.
   *
   * A refused enable leaves the stored setting alone on purpose: it stays on
   * underneath, so granting permission later recovers without another tap.
   */
  const toggle = useCallback(
    async (value: boolean): Promise<boolean> => {
      setPending(value);

      if (!value) {
        setNotificationsEnabled(false);
        return true;
      }

      await syncPushNotifications(true).catch(() => undefined);
      const permission = await getNotificationPermission();
      setGranted(permission.granted);

      if (permission.granted) {
        setNotificationsEnabled(true);
        return true;
      }

      setPending(null);
      return false;
    },
    [setNotificationsEnabled],
  );

  return { on, toggle };
}
