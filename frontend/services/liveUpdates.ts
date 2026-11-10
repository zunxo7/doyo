import { useEffect } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

/**
 * Downloads a published update while the app is open and applies it when the app goes to the
 * background, so the restart never lands in the middle of what someone is doing.
 */
export function useLiveUpdates(): void {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let ready = false;
    const fetchLatest = async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        const { isNew } = await Updates.fetchUpdateAsync();
        if (isNew) ready = true;
      } catch {
        // Offline or no update server: keep running what is installed.
      }
    };
    void fetchLatest();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void fetchLatest();
      else if (state === "background" && ready) void Updates.reloadAsync().catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);
}
