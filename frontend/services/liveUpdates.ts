import { useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

/** The restart onto a new update shows the splash, never expo's white default. */
const RELOAD_SCREEN: Updates.ReloadScreenOptions = {
  backgroundColor: "#1f1f1f",
  image: require("../assets/splash-icon.png"),
  imageResizeMode: "contain",
  spinner: { enabled: false },
  fade: true,
};

const restart = () => Updates.reloadAsync({ reloadScreenOptions: RELOAD_SCREEN }).catch(() => undefined);

/**
 * On opening the app, a published update downloads in front of the user with its progress and the app
 * restarts onto it. An update found later, on coming back to the app, downloads quietly and applies
 * when the app is next left, so it never interrupts what someone is doing.
 */
export function useLiveUpdates(): { updating: boolean; progress: number } {
  const [updating, setUpdating] = useState(false);
  const { downloadProgress } = Updates.useUpdates();

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let ready = false;
    const latest = async () => {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      return isAvailable;
    };

    void (async () => {
      try {
        if (!(await latest())) return;
        setUpdating(true);
        await Updates.fetchUpdateAsync();
        await restart();
      } catch {
        // Offline or no update server: keep running what is installed.
        setUpdating(false);
      }
    })();

    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") {
        void (async () => {
          try {
            if (await latest()) ready = (await Updates.fetchUpdateAsync()).isNew || ready;
          } catch {
            // Try again next time the app comes back.
          }
        })();
      } else if (state === "background" && ready) {
        void restart();
      }
    });
    return () => subscription.remove();
  }, []);

  return { updating, progress: downloadProgress ?? 0 };
}
