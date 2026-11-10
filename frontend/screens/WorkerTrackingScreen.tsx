import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Reanimated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  interpolate,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  ViewAnnotation,
} from "@maplibre/maplibre-react-native";
import {
  Broom,
  House,
  PhoneCall,
  ShieldCheck,
  Star,
  UserCircle,
  X,
} from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeTrackingStyles } from "../styles/WorkerTrackingScreen.styles";
import { MAP_STYLE_URL, formatEta, getRoute, type LngLat, type Route } from "../services/routing";
import { getSheetExpanded, setSheetExpanded } from "../services/sheetState";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "WorkerTracking">;
  route: RouteProp<RootStackParamList, "WorkerTracking">;
};

// Mock locations until live worker GPS lands — G-10/2 Islamabad (customer) and I-8 (worker)
const CUSTOMER_LOCATION: LngLat = [73.0136, 33.6791];
const WORKER_START: LngLat = [73.0653, 33.6664];

// DEV ONLY — worker moves along the route this many times faster than real time
const CANCEL_REASONS = [
  "I don't need the service anymore",
  "Need changes in my job",
  "Worker not moving or off route",
  "Worker is late",
  "Worker asked to cancel",
  "Worker asks for extra payment",
  "App issue",
];

export default function WorkerTrackingScreen({ navigation, route }: Props) {
  const { workerName, price, rating } = route.params;
  const fonts = useFontFamilies();
  const { settings } = useSettings();
  const colors = useColors();
  const s = useThemedStyles(makeTrackingStyles);
  const { height: SCREEN_H } = useWindowDimensions();
  const cameraRef = useRef<CameraRef>(null);

  const [routeInfo, setRouteInfo] = useState<Route | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [progress, setProgress] = useState(0); // 0 → 1 along the route
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);

  // ---- Cancel flow (confirm → pick a reason) ----
  const [cancelStep, setCancelStep] = useState<"confirm" | "reason" | null>(null);
  const cancelStepRef = useRef<typeof cancelStep>(null);
  const cancelAnim = useSharedValue(0);

  cancelStepRef.current = cancelStep;

  const openCancelFlow = () => {
    setCancelStep("confirm");
    cancelAnim.value = 0;
    cancelAnim.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  };

  const closeCancelFlow = () => {
    cancelAnim.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }, finished => {
      if (finished) runOnJS(setCancelStep)(null);
    });
  };

  const cancelOverlayStyle = useAnimatedStyle(() => ({
    opacity: cancelAnim.value,
  }));
  const cancelSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - cancelAnim.value) * 420 }],
  }));

  // An active job shouldn't be dismissible by back — back closes the cancel
  // sheet if open, otherwise does nothing; only picking a reason exits
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (cancelStepRef.current) closeCancelFlow();
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    setRouteInfo(null);
    setMapReady(false);
    setProgress(0);
    getRoute(WORKER_START, CUSTOMER_LOCATION)
      .then(result => {
        if (active) {
          setProgress(0);
          setRouteInfo(result);
        }
      })
      .catch(() => {
        if (active) {
          setAlert({
            title: "Couldn't load route",
            message: "Check your internet connection and try again.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Fit the camera to the whole route once it arrives
  useEffect(() => {
    if (!routeInfo) return;
    const lngs = routeInfo.coordinates.map(c => c[0]);
    const lats = routeInfo.coordinates.map(c => c[1]);
    cameraRef.current?.fitBounds(
      [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
      { padding: { top: 120, bottom: 330, left: 60, right: 60 }, duration: 800 },
    );
  }, [routeInfo]);

  // Simulate the worker driving along the route
  // ---- Draggable bottom sheet (same pattern as CustomerHome's panel) ----
  const MAX_PANEL_H = Math.max(320, SCREEN_H - 105);
  const [panelHeight, setPanelHeight] = useState(0);
  // Measured height of the always-visible part (handle + title + actions) —
  // the fold lands exactly under it, hiding the job summary until dragged up
  const [peekHeight, setPeekHeight] = useState(0);
  const COLLAPSED_Y = Math.max(0, panelHeight - peekHeight);

  const translateY = useSharedValue(MAX_PANEL_H);
  const expandedRef = useRef(getSheetExpanded("worker-tracking", false));
  const initialized = useRef(false);
  const collapsedYRef = useRef(0);

  collapsedYRef.current = COLLAPSED_Y;

  useEffect(() => {
    if (panelHeight === 0 || peekHeight === 0) return;
    // Re-sync whenever measurements settle — panel and peek heights arrive in
    // separate layout passes, so the first collapsed position can be stale
    if (!initialized.current) {
      initialized.current = true;
      translateY.value = expandedRef.current ? 0 : COLLAPSED_Y;
    } else if (!expandedRef.current) {
      translateY.value = COLLAPSED_Y;
    }
  }, [COLLAPSED_Y, panelHeight, peekHeight, translateY]);

  const animateTo = (toValue: number) => {
    translateY.value = withSpring(toValue, {
      damping: 26,
      stiffness: 240,
      mass: 0.9,
    });
  };
  const expand = () => {
    expandedRef.current = true;
    setSheetExpanded("worker-tracking", true);
    animateTo(0);
  };
  const collapse = () => {
    expandedRef.current = false;
    setSheetExpanded("worker-tracking", false);
    animateTo(collapsedYRef.current);
  };

  const panResponder = useRef(
    PanResponder.create({
      // Let children receive taps; we only steal on actual drag movement
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        cancelAnimation(translateY);
      },
      onPanResponderMove: (_, g) => {
        const collapsedY = collapsedYRef.current;
        const base = expandedRef.current ? 0 : collapsedY;
        const next = Math.max(0, Math.min(collapsedY, base + g.dy));
        translateY.value = next;
      },
      onPanResponderRelease: (_, g) => {
        const collapsedY = collapsedYRef.current;
        const base = expandedRef.current ? 0 : collapsedY;
        const final = base + g.dy;
        if (g.vy > 0.6) collapse();
        else if (g.vy < -0.6) expand();
        else if (final < collapsedY / 2) expand();
        else collapse();
      },
    })
  ).current;

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const arrived = false;
  const remainingSeconds = routeInfo ? routeInfo.durationSeconds : 0;
  const firstName = workerName.split(" ")[0];
  const liveDistance = routeInfo ? formatDistance(routeInfo.distanceMeters) : "";
  const trackingTitle = arrived ? "Worker has arrived" : `Worker arriving in ~${formatEta(remainingSeconds)}`;
  const trackingSubtitle = arrived ? "Worker at your location" : `Live tracking - ${liveDistance} away`;

  const workerIndex = 0;
  const workerPosition: LngLat = routeInfo?.coordinates[workerIndex] ?? WORKER_START;

  // Only draw the part of the route the worker hasn't covered yet
  const remainingRoute = useMemo(() => {
    if (!routeInfo) return null;
    const coordinates = routeInfo.coordinates;
    if (coordinates.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates },
    };
  }, [routeInfo]);

  const title = routeInfo ? trackingTitle : "Connecting to worker...";
  const subtitle = routeInfo ? trackingSubtitle : "Loading live route...";

  return (
    <View style={s.root}>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <Map
        style={[s.map, !mapReady && s.mapHidden]}
        mapStyle={MAP_STYLE_URL}
        logo={false}
        attributionPosition={{ bottom: 8, left: 8 }}
        onDidFinishRenderingMapFully={() => setMapReady(true)}
        // Explicitly enable map gestures so the route can be inspected.
        dragPan
        touchZoom
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: CUSTOMER_LOCATION, zoom: 14.8 }}
        />

        {remainingRoute ? (
          <GeoJSONSource id="route" data={remainingRoute}>
            <Layer
              id="route-line"
              type="line"
              beforeId="place-suburb"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": colors.accent, "line-width": 4.5 }}
            />
          </GeoJSONSource>
        ) : null}

        <ViewAnnotation id="customer" lngLat={CUSTOMER_LOCATION}>
          <View style={s.homeMarker}>
            <House size={18} color={colors.paper} weight="fill" />
          </View>
        </ViewAnnotation>

        {routeInfo ? (
          <ViewAnnotation id="worker" lngLat={workerPosition}>
            <View style={s.workerMarker}>
              <Broom size={18} color={colors.paper} weight="fill" />
            </View>
          </ViewAnnotation>
        ) : null}
      </Map>

      {/* Subtle veil to lift the dark map */}
      {mapReady ? <View style={[s.mapLighten, { pointerEvents: "none" }]} /> : null}

      {/* Draggable bottom sheet — drag up for job summary */}
      <Reanimated.View
        onLayout={e => setPanelHeight(e.nativeEvent.layout.height)}
        {...panResponder.panHandlers}
        style={[s.sheet, { maxHeight: MAX_PANEL_H }, panelAnimatedStyle]}
      >
        <View
          onLayout={e => setPeekHeight(Math.ceil(e.nativeEvent.layout.height))}
        >
        <View style={s.handleArea}>
          <View style={s.handle} />
        </View>

        <Text style={[s.title, fontStyles.bold]} numberOfLines={1}>
          {title}
        </Text>

        <View style={s.liveRow}>
          <LiveDot />
          <Text style={[s.liveSubText, fontStyles.medium]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View style={s.divider} />

        <View style={s.actionsRow}>
          <View style={s.actionItem}>
            <View>
              <View style={s.avatarCircle}>
                <UserCircle size={42} color={colors.ink} weight="fill" />
              </View>
              {rating ? (
                <View style={s.ratingBadge}>
                  <Star size={10} color="#ffd400" weight="fill" />
                  <Text style={[s.ratingBadgeText, fontStyles.semiBold]}>{rating}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[s.actionLabel, fontStyles.semiBold]} numberOfLines={1}>
              {firstName}
            </Text>
          </View>

          <TouchableOpacity
            style={s.actionItem}
            activeOpacity={0.85}
            onPress={() => setAlert({ title: "Contact worker", message: "In-app calls and chat are coming soon." })}
          >
            <View style={s.actionCircle}>
              <PhoneCall size={24} color={colors.white} weight="fill" />
            </View>
            <Text style={[s.actionLabel, fontStyles.semiBold]}>Contact worker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionItem}
            activeOpacity={0.85}
            onPress={() => setAlert({ title: "Safety", message: "Safety tools are coming soon." })}
          >
            <View style={s.actionCircle}>
              <ShieldCheck size={24} color={colors.white} weight="fill" />
            </View>
            <Text style={[s.actionLabel, fontStyles.semiBold]}>Safety</Text>
          </TouchableOpacity>
        </View>
        </View>

        {/* Hidden below the fold — revealed by dragging up */}
        <View style={s.divider} />

        <View style={s.summaryTitlePill}>
          <Text style={[s.summaryTitleInside, fontStyles.bold]}>Job Summary</Text>
        </View>

        <View style={s.summaryCard}>
          <SummaryRow label="Worker" value={workerName} fonts={fonts} />
          <SummaryRow label="Service" value="Home Cleaning" fonts={fonts} />
          <SummaryRow label="Payment" value="Cash" fonts={fonts} />
          <SummaryRow label="Price" value={`PKR${price}`} fonts={fonts} />
        </View>

        <TouchableOpacity
          style={s.cancelJobButton}
          activeOpacity={0.88}
          onPress={openCancelFlow}
        >
          <Text style={[s.cancelJobText, fontStyles.semiBold]}>Cancel request</Text>
        </TouchableOpacity>
      </Reanimated.View>

      {/* Cancel flow — confirm, then pick a reason */}
      {cancelStep ? (
        <View style={s.cancelOverlay}>
          <Reanimated.View style={[s.cancelScrim, cancelOverlayStyle]} />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeCancelFlow}
          />
          <Reanimated.View
            // Rasterize while sliding — the sheet is heavy (pattern image +
            // many children) and Android stutters re-compositing it per frame
            renderToHardwareTextureAndroid
            layout={LinearTransition.duration(240)}
            style={[s.cancelSheet, cancelSheetStyle]}
          >
            {cancelStep === "confirm" ? (
              <Reanimated.View key="confirm" entering={FadeInDown.duration(220)}>
                <View style={s.cancelAvatarWrap}>
                  <View style={s.avatarCircle}>
                    <UserCircle size={42} color={colors.ink} weight="fill" />
                  </View>
                  {rating ? (
                    <View style={s.ratingBadge}>
                      <Star size={10} color="#ffd400" weight="fill" />
                      <Text style={[s.ratingBadgeText, fontStyles.semiBold]}>{rating}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[s.cancelTitle, fontStyles.bold]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[s.cancelSubtitle, fontStyles.medium]}>
                  Sure you want to cancel?
                </Text>

                <View style={s.cancelActionsRow}>
                  <TouchableOpacity
                    style={s.actionItem}
                    activeOpacity={0.85}
                    onPress={() => {
                      closeCancelFlow();
                      setAlert({ title: "Contact worker", message: "In-app calls and chat are coming soon." });
                    }}
                  >
                    <View style={s.actionCircle}>
                      <PhoneCall size={24} color={colors.white} weight="fill" />
                    </View>
                    <Text style={[s.actionLabel, fontStyles.semiBold]}>Contact worker</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.actionItem}
                    activeOpacity={0.85}
                    onPress={() => setCancelStep("reason")}
                  >
                    <View style={s.cancelCircle}>
                      <X size={24} color={colors.ink} weight="bold" />
                    </View>
                    <Text style={[s.actionLabel, fontStyles.semiBold]}>Cancel job</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={s.waitButton}
                  activeOpacity={0.9}
                  onPress={closeCancelFlow}
                >
                  <Text style={[s.waitButtonText, fontStyles.semiBold]}>
                    Wait for worker
                  </Text>
                </TouchableOpacity>
              </Reanimated.View>
            ) : (
              <Reanimated.View key="reason" entering={FadeInDown.duration(220)}>
                <Text style={[s.cancelTitle, fontStyles.bold]}>
                  Why do you want to cancel?
                </Text>

                <View style={s.reasonList}>
                  {CANCEL_REASONS.map((reason, index) => (
                    <TouchableOpacity
                      key={reason}
                      style={[s.reasonRow, index > 0 && s.reasonDivider]}
                      activeOpacity={0.8}
                      onPress={() => navigation.goBack()}
                    >
                      <Text style={[s.reasonText, fontStyles.medium]}>{reason}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={s.waitButton}
                  activeOpacity={0.9}
                  onPress={closeCancelFlow}
                >
                  <Text style={[s.waitButtonText, fontStyles.semiBold]}>
                    Continue job
                  </Text>
                </TouchableOpacity>
              </Reanimated.View>
            )}
          </Reanimated.View>
        </View>
      ) : null}

      <CustomAlert
        visible={!!alert}
        title={alert?.title ?? ""}
        message={alert?.message}
        onClose={() => setAlert(null)}
      />
    </View>
  );
}

function formatDistance(meters: number): string {
  return meters < 950 ? `${Math.max(50, Math.round(meters / 50) * 50)} m` : `${(meters / 1000).toFixed(1)} km`;
}

// Softly pulsing dot for the live-tracking pill
function LiveDot() {
  const s = useThemedStyles(makeTrackingStyles);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [1, 0.35]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 0.78]) }],
  }));

  return <Reanimated.View style={[s.liveDot, dotStyle]} />;
}

function SummaryRow({
  label,
  value,
  fonts,
}: {
  label: string;
  value: string;
  fonts: ReturnType<typeof useFontFamilies>;
}) {
  const s = useThemedStyles(makeTrackingStyles);
  return (
    <View style={s.summaryRow}>
      <Text style={[s.summaryLabel, fontStyles.medium]}>{label}</Text>
      <Text style={[s.summaryValue, fontStyles.semiBold]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
