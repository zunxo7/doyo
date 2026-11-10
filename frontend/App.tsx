import React from "react";
import { AppState, Text, TextInput } from "react-native";
import { reconcilePendingCommands } from "./services/commands";
import { hydrateSheetState } from "./services/sheetState";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createStackNavigator, StackCardInterpolationProps } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from "@expo-google-fonts/montserrat";

import SplashScreen from "./screens/SplashScreen";
import UpdateRequiredScreen from "./screens/UpdateRequiredScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import PhoneNumberScreen from "./screens/PhoneNumberScreen";
import EmailScreen from "./screens/EmailScreen";
import OTPScreen from "./screens/OTPScreen";
import RoleScreen from "./screens/RoleScreen";
import CustomerNameScreen from "./screens/CustomerNameScreen";
import CustomerHomeScreen from "./screens/CustomerHomeScreen";
import WorkerHomeScreen from "./screens/WorkerHomeScreen";
import ChatScreen from "./screens/ChatScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LoyaltyScreen from "./screens/LoyaltyScreen";
import BookingHistoryScreen from "./screens/BookingHistoryScreen";
import BookingDetailsScreen from "./screens/BookingDetailsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import SupportScreen from "./screens/SupportScreen";
import ServicesInfoScreen from "./screens/ServicesInfoScreen";
import LinkPayPalScreen from "./screens/LinkPayPalScreen";
import WorkerTrackingScreen from "./screens/WorkerTrackingScreen";
import WorkerLockedScreen from "./screens/WorkerLockedScreen";
import WorkerPersonalInfoScreen from "./screens/WorkerPersonalInfoScreen";
import CnicCaptureScreen from "./screens/CnicCaptureScreen";
import { LogManager } from "@maplibre/maplibre-react-native";
import { RootStackParamList } from "./navigation/types";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";
import ThemeTransitionOverlay from "./components/ThemeTransitionOverlay";
import OfflineOverlay from "./components/OfflineOverlay";
import { subscribeToNotificationTaps, syncPushNotifications } from "./services/notifications";
import { refreshSessionToken } from "./services/bidding";
import { flushClientErrors, installGlobalErrorHandler, reportAbandonedWork } from "./services/clientErrors";
import { getAppConfig } from "./services/appConfig";
import { getStoredSessionToken, getStoredUser, onUserChanged } from "./services/auth";
import { navigationRef, resetToSignIn } from "./navigation/navigationRef";
import ErrorBoundary from "./components/ErrorBoundary";
import { useLiveUpdates } from "./services/liveUpdates";
import UpdateOverlay from "./components/UpdateOverlay";
// Imported for its side effect: the background location task must be defined
// at module scope before the OS can revive it into a headless JS context.
import "./services/backgroundLocation";

const DEFAULT_APP_FONT = "Montserrat_400Regular";

function forceAppTypography() {
  const text = Text as typeof Text & { defaultProps?: Record<string, unknown> };
  const textInput = TextInput as typeof TextInput & { defaultProps?: Record<string, unknown> };

  text.defaultProps = {
    ...text.defaultProps,
    allowFontScaling: false,
    style: [{ fontFamily: DEFAULT_APP_FONT }, text.defaultProps?.style],
  };

  textInput.defaultProps = {
    ...textInput.defaultProps,
    allowFontScaling: false,
    style: [{ fontFamily: DEFAULT_APP_FONT }, textInput.defaultProps?.style],
  };
}

forceAppTypography();

// Silence MapLibre's noisy cancelled-request warnings. These fire whenever the
// map aborts an in-flight tile/style/route fetch (camera moves, map unmounts,
// a request is superseded) — they're routine, not real failures. The library
// only downgrades the literal "Canceled" message; the HTTP/2 path logs
// "stream was reset: CANCEL" instead, which slips through. Suppress both.
LogManager.onLog(({ level, tag, message }) => {
  if (
    level === "warn" &&
    tag === "Mbgl-HttpRequest" &&
    /cancel/i.test(message)
  ) {
    return true; // handled — skip default logging
  }
  return false; // fall through to default logging
});

const Stack = createStackNavigator<RootStackParamList>();

// Pure cross-fade — no slide, no white, works on both forward and back
const FadeTransition = {
  cardStyleInterpolator: ({ current }: StackCardInterpolationProps) => ({
    cardStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    },
  }),
  transitionSpec: {
    open: {
      animation: "timing" as const,
      config: { duration: 220 },
    },
    close: {
      animation: "timing" as const,
      config: { duration: 180 },
    },
  },
};

function AppShell() {
  const appBackground = "#0b0b0c";

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: appBackground,
      card: appBackground,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: appBackground }}>
      <StatusBar style="light" />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: appBackground },
            ...FadeTransition,
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen
            name="UpdateRequired"
            component={UpdateRequiredScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
          <Stack.Screen name="Email" component={EmailScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
          <Stack.Screen name="Role" component={RoleScreen} />
          <Stack.Screen name="CustomerName" component={CustomerNameScreen} />
          <Stack.Screen name="LinkPayPal" component={LinkPayPalScreen} />
          <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
          <Stack.Screen name="WorkerHome" component={WorkerHomeScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Loyalty" component={LoyaltyScreen} />
          <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
          <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="ServicesInfo" component={ServicesInfoScreen} />
          <Stack.Screen
            name="WorkerTracking"
            component={WorkerTrackingScreen}
            options={{
              gestureEnabled: false,
              cardStyle: { backgroundColor: appBackground },
              cardStyleInterpolator: () => ({ cardStyle: {} }),
              transitionSpec: {
                open: {
                  animation: "timing",
                  config: { duration: 0 },
                },
                close: {
                  animation: "timing",
                  config: { duration: 0 },
                },
              },
            }}
          />
          <Stack.Screen name="WorkerLocked" component={WorkerLockedScreen} />
          <Stack.Screen name="WorkerPersonalInfo" component={WorkerPersonalInfoScreen} />
          <Stack.Screen name="CnicCapture" component={CnicCaptureScreen} />
        </Stack.Navigator>
        <ThemeTransitionOverlay />
        <OfflineOverlay />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

function NotificationBootstrap() {
  const { settings, ready } = useSettings();

  // Keep the session credential alive. It expires, nothing else renews it, and
  // the failure is invisible: every call 401s while the app still looks signed
  // in. Refreshing on launch and on foreground means it never gets that far.
  React.useEffect(() => {
    if (!ready) return;
    const refresh = () => void refreshSessionToken();
    refresh();
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [ready]);

  React.useEffect(() => {
    if (!ready) return;
    const sync = () =>
      syncPushNotifications(settings.notificationsEnabled).catch(err =>
        console.warn("push token sync failed:", err),
      );
    sync();
    // Re-register on login: at first launch of a fresh install there is no
    // stored user yet, so the boot-time sync alone can never register a token.
    return onUserChanged(sync);
  }, [ready, settings.notificationsEnabled]);

  // Separate from the token sync above: taps must be handled regardless of
  // whether notifications are currently enabled in settings, and this must not
  // be torn down and re-subscribed every time that toggle changes.
  React.useEffect(() => subscribeToNotificationTaps(), []);

  return null;
}

export default function App() {
  const update = useLiveUpdates();
  useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
  });

  // Say something when the session dies: clear the stored user and send them
  // back to sign in, rather than leaving every screen rendering a signed-in
  // person whose every call fails.
  React.useEffect(() => {
    return onUserChanged(() => {
      // Re-read the config as the NEW identity. Splash fetches it before
      // anyone has signed in, so the cached copy is the anonymous one — and
      // the per-caller parts (a reviewer's relaxations and the place we stand
      // them) would never arrive without this.
      void getAppConfig();

      void (async () => {
        const user = await getStoredUser().catch(() => null);
        const token = await getStoredSessionToken().catch(() => null);
        if (!user || token) return;
        resetToSignIn();
      })();
    });
  }, []);

  // Report what the app could not report while it was dying.
  //
  // A breadcrumb left on disk means the process was killed mid-action — most
  // often behind the photo picker, which produces no crash, no ANR and no
  // server request, and so appears in no crash reporter at all. This is the
  // only place that failure is ever visible, so it runs first, before the
  // queue flush that carries it to the server.
  React.useEffect(() => {
    installGlobalErrorHandler();
    reportAbandonedWork();
    void flushClientErrors();
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") void flushClientErrors();
    });
    return () => sub.remove();
  }, []);

  // Resolve leftover outbox commands (crash/kill mid-action) on launch and on
  // each return to foreground — after snapshots, per the reconciliation rules.
  React.useEffect(() => {
    // Bottom-sheet positions are read synchronously when a sheet lays out;
    // touching the module here starts the read well before any sheet mounts.
    void hydrateSheetState;
    void reconcilePendingCommands();
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") void reconcilePendingCommands();
    });
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <NotificationBootstrap />
        <AppShell />
      </SettingsProvider>
      <UpdateOverlay visible={update.updating} progress={update.progress} />
    </ErrorBoundary>
  );
}
