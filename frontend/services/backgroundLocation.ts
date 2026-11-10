import * as Location from "expo-location";
import { Linking } from "react-native";
import { getCachedAppConfig } from "./appConfig";

export async function hasBackgroundLocationPermission(): Promise<boolean> {
  // The demo places every worker at a fixed spot, so it never needs their position.
  if (getCachedAppConfig().reviewLocation) return true;
  try {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

async function requestBackgroundLocationPermission(): Promise<boolean> {
  try {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== "granted") return false;
    const background = await Location.requestBackgroundPermissionsAsync();
    return background.status === "granted";
  } catch {
    return false;
  }
}

export async function openBackgroundLocationSettings(): Promise<boolean> {
  if (await requestBackgroundLocationPermission()) return true;
  await Linking.openSettings().catch(() => undefined);
  return false;
}

// The worker's position streams over the live socket while the app is open.
export async function startWorkerLocationUpdates(_options?: { userGesture?: boolean }): Promise<void> {}

export async function stopWorkerLocationUpdates(): Promise<void> {}

export function watchAppStateForLocation(): () => void {
  return () => undefined;
}
