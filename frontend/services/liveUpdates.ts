import { useEffect } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

/** Applies a published update whenever the app opens or comes back, not on the launch after. */
export function useLiveUpdates(): void {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const apply = async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch {
        // Offline or no update server: keep running what is installed.
      }
    };
    void apply();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void apply();
    });
    return () => subscription.remove();
  }, []);
}
