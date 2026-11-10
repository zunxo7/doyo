import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getSettings } from "./settings";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Doyo",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#00baf0",
  });
}

// Local notifications only need the OS permission, so no push token is registered.
export async function syncPushNotifications(enabled: boolean): Promise<void> {
  if (!enabled) return;
  await ensureAndroidChannel();
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) await Notifications.requestPermissionsAsync();
}

export async function getNotificationPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  try {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    return { granted, canAskAgain };
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

// Chat alerts come only from push, which this build does not have.
export function setOpenChatJob(_jobId: string | null): void {}

// Local notifications carry no destination, so a tap only opens the app.
export function subscribeToNotificationTaps(): () => void {
  return () => undefined;
}

export async function showLocalNotification(title: string, body?: string): Promise<string | null> {
  const { notificationsEnabled } = await getSettings();
  if (!notificationsEnabled) return null;
  await ensureAndroidChannel();
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return null;
  return Notifications.scheduleNotificationAsync({ content: { title, body, sound: true }, trigger: null });
}
