import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { Asset } from "expo-asset";
import Svg, { Circle } from "react-native-svg";
import { StackNavigationProp } from "@react-navigation/stack";
import { Camera, Map } from "@maplibre/maplibre-react-native";
import FadeInView from "../components/FadeInView";
import ScreenBackground from "../components/ScreenBackground";
import AppIcon from "../components/AppIcon";
import Wordmark from "../components/Wordmark";
import { takePendingNavigation } from "../navigation/navigationRef";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useThemedStyles } from "../hooks/useColors";
import { makeSplashStyles } from "../styles/SplashScreen.styles";
import { getAppConfig } from "../services/appConfig";
import { activeMode, getStoredUser } from "../services/auth";
import { DEFAULT_LOCATION } from "../services/location";
import { MAP_STYLE_URL } from "../services/routing";
import { CURRENT_APP_VERSION, DISPLAY_APP_VERSION, isAppUpdateRequired } from "../services/appVersion";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = { navigation: StackNavigationProp<RootStackParamList, "Splash"> };

const ILLUSTRATION_ASSETS = [
  require("../assets/images/Illustration1.webp"),
  require("../assets/images/Illustration2.webp"),
  require("../assets/images/Illustration3.webp"),
  require("../assets/images/Illustration4.webp"),
];

const SPINNER_SIZE = 40;
const STROKE_WIDTH = 3;
const RADIUS = (SPINNER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MIN_SPLASH_MS = 1400;
const MAP_WARMUP_TIMEOUT_MS = 2600;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function Spinner() {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );

    return () => cancelAnimation(spin);
  }, [spin]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  return (
    <Reanimated.View style={[{ width: SPINNER_SIZE, height: SPINNER_SIZE }, spinnerStyle]}>
      <Svg
        width={SPINNER_SIZE}
        height={SPINNER_SIZE}
        viewBox={`0 0 ${SPINNER_SIZE} ${SPINNER_SIZE}`}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle cx={SPINNER_SIZE / 2} cy={SPINNER_SIZE / 2} r={RADIUS}
          stroke="white" strokeWidth={STROKE_WIDTH} fill="none" opacity={0.35} />
        <Circle cx={SPINNER_SIZE / 2} cy={SPINNER_SIZE / 2} r={RADIUS}
          stroke="#00baf0" strokeWidth={STROKE_WIDTH + 0.5} fill="none"
          strokeDasharray={`${CIRCUMFERENCE * 0.22} ${CIRCUMFERENCE * 0.78}`}
          strokeLinecap="round" />
      </Svg>
    </Reanimated.View>
  );
}

export default function SplashScreen({ navigation }: Props) {
  const fonts = useFontFamilies();
  const s = useThemedStyles(makeSplashStyles);
  const [mapReady, setMapReady] = useState(false);
  const [mapWarmupTimedOut, setMapWarmupTimedOut] = useState(false);
  const [nextRoute, setNextRoute] = useState<
    | { name: "UpdateRequired"; params: RootStackParamList["UpdateRequired"] }
    | { name: "CustomerHome"; params: RootStackParamList["CustomerHome"] }
    | { name: "WorkerHome"; params: RootStackParamList["WorkerHome"] }
    | { name: "WorkerLocked"; params: RootStackParamList["WorkerLocked"] }
    | { name: "Onboarding" }
    | null
  >(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      Asset.loadAsync(ILLUSTRATION_ASSETS),
      getStoredUser(),
      getAppConfig(),
      wait(MIN_SPLASH_MS),
    ]).then(([, user, appConfig]) => {
      if (!active) return;
      if (appConfig && isAppUpdateRequired(CURRENT_APP_VERSION, appConfig.appVersion.minSupportedVersion)) {
        setNextRoute({
          name: "UpdateRequired",
          params: {
            currentVersion: CURRENT_APP_VERSION,
            requiredVersion: appConfig.appVersion.minSupportedVersion,
            latestVersion: appConfig.appVersion.latestVersion,
            message: appConfig.appVersion.updateMessage,
            updateUrl: appConfig.appVersion.updateUrl,
          },
        });
        // Which side they were last on, NOT what they are: a verified worker
        // who switched to booking comes back to the customer screens, and
        // still returns to work with no re-verification.
      } else if (user && activeMode(user) === "customer") {
        setNextRoute({ name: "CustomerHome", params: { name: user.name ?? "" } });
      } else if (user?.role === "worker") {
        // Approved workers go straight in; anyone still pending/rejected lands
        // on the review screen, which polls and lets them in once approved.
        if ((user.onboardingStatus ?? "").toLowerCase() === "approved") {
          setNextRoute({ name: "WorkerHome", params: { name: user.name ?? "" } });
        } else {
          setNextRoute({ name: "WorkerLocked", params: { status: user.onboardingStatus ?? "submitted" } });
        }
      } else {
        setNextRoute({ name: "Onboarding" });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMapWarmupTimedOut(true), MAP_WARMUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!nextRoute || (!mapReady && !mapWarmupTimedOut)) return;

    // A notification tap that cold-started the app chose a destination before
    // the navigator existed. Honour it HERE rather than letting it navigate on
    // its own — two independent routers mounted the screen twice and the job
    // list animated in each time. Only for the signed-in home screens; a
    // pending tap must never skip onboarding, an update wall, or the locked
    // screen.
    const pendingTarget = takePendingNavigation();
    if (
      pendingTarget &&
      (nextRoute.name === "WorkerHome" || nextRoute.name === "CustomerHome") &&
      pendingTarget.name === nextRoute.name
    ) {
      navigation.replace(pendingTarget.name as any, {
        ...(nextRoute.params as object),
        ...(pendingTarget.params as object),
      });
      return;
    }

    if (nextRoute.name === "UpdateRequired") {
      navigation.replace("UpdateRequired", nextRoute.params);
    } else if (nextRoute.name === "CustomerHome") {
      navigation.replace("CustomerHome", nextRoute.params);
    } else if (nextRoute.name === "WorkerHome") {
      navigation.replace("WorkerHome", nextRoute.params);
    } else if (nextRoute.name === "WorkerLocked") {
      navigation.replace("WorkerLocked", nextRoute.params);
    } else {
      navigation.replace("Onboarding");
    }
  }, [mapReady, mapWarmupTimedOut, navigation, nextRoute]);

  return (
    <View style={styles.root}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        logo={false}
        onDidFinishRenderingMapFully={() => setMapReady(true)}
      >
        <Camera initialViewState={{ center: DEFAULT_LOCATION.coordinates, zoom: 15 }} />
      </Map>

      <ScreenBackground
        variant="sheet"
        showPattern
        patternOpacity={0.022}
        hideOrbs
      >
        <StatusBar style="light" />

        <View style={s.content}>
          <FadeInView style={s.logoSection} delay={0} duration={800}>
            <AppIcon size={80} />
            <Wordmark fontSize={46} />
          </FadeInView>

          <FadeInView delay={300} duration={700}>
            <Spinner />
          </FadeInView>
        </View>

        <FadeInView delay={550} duration={700} style={s.footer}>
          <Text style={[s.footerText, fontStyles.regular]}>
            © 2026 Doyo • v{DISPLAY_APP_VERSION} • All Rights Reserved
          </Text>
        </FadeInView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1d1d1d",
  },
});
