import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Linking,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Reanimated, {
  cancelAnimation,
  FadeIn,
  LinearTransition,
  runOnJS,
  SlideInUp,
  SlideOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import {
  Broom,
  Check,
  CheckCircle,
  House,
  NavigationArrow,
  PhoneCall,
  Star,
  UserCircle,
  WarningCircle,
} from "phosphor-react-native";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  ViewAnnotation,
} from "@maplibre/maplibre-react-native";
import SmoothedMarker from "../SmoothedMarker";
import { getCachedAppConfig } from "../../services/appConfig";
import { useFontFamilies } from "../../hooks/useFontFamilies";
import { useT } from "../../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../../hooks/useColors";
import { makeWorkerStyles } from "../../styles/WorkerHomeScreen.styles";
import { makeTrackingStyles } from "../../styles/WorkerTrackingScreen.styles";
import {
  MAP_STYLE_URL,
  formatEta,
  getRoute,
  type LngLat,
  type Route as TrackingRoute,
} from "../../services/routing";
import { getCurrentPosition, watchPositionNavigation, type PositionSubscription } from "../../services/location";
import { saveWorkerActiveJob } from "../../services/workerPresence";
import {
  cancelBiddingJob,
  completeBiddingJob,
  openJobRoomSocket,
  sendWorkerLocation,
  startBiddingJob,
  summarizeJobDetails,
  submitJobRating,
  updateWorkerPhase,
} from "../../services/bidding";
import type { LiveSocket } from "../../services/liveSocket";
import { getSheetExpanded, setSheetExpanded } from "../../services/sheetState";
import { useUnreadChat } from "../../hooks/useUnreadChat";
import UnreadBadge from "../UnreadBadge";
import { type WorkerJob } from "../../services/workerJobs";
import CustomAlert from "../CustomAlert";
import JobCompletedContent from "../JobCompletedContent";
import RateWorkerContent from "../RateWorkerContent";
import SlideToComplete from "../SlideToComplete";
import VehicleScopeSheet from "../VehicleScopeSheet";
import { fontStyles } from "../../styles/fonts";

type Phase = "enroute" | "arrived" | "working" | "done";


const CANCEL_REASONS = [
  "Customer not responding",
  "Address is wrong or incomplete",
  "Customer asked to cancel",
  "Job is different than described",
  "Customer wants extra unpaid work",
  "I can't reach the location",
  "Safety concern",
];

const SPRING = { damping: 26, stiffness: 240, mass: 0.9 };
// Penalty charged to the worker for cancelling an accepted job
const CANCEL_PENALTY = 100;
const AnimatedTouchableOpacity = Reanimated.createAnimatedComponent(TouchableOpacity);

type Props = {
  job: WorkerJob;
  workerId: string;
  paymentLabel: string;
  onContact: () => void;
  onExit: () => void;
};

export default function ActiveJobView({ job, workerId, paymentLabel, onContact, onExit }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);
  const ts = useThemedStyles(makeTrackingStyles);
  const { height: SCREEN_H } = useWindowDimensions();
  const cameraRef = useRef<CameraRef>(null);

  const [route, setRoute] = useState<TrackingRoute | null>(null);
  const [routeStartPosition, setRouteStartPosition] = useState<LngLat | null>(null);
  const routeLockedRef = useRef(false);
  // Seeded from the server when the job is restored mid-flight, so a relaunch
  // resumes on the work timer instead of asking for the start code again.
  const [phase, setPhase] = useState<Phase>(
    job.workerPhase === "working" ? "working" : job.workerPhase === "arrived" ? "arrived" : "enroute",
  );
  const [workerPosition, setWorkerPosition] = useState<LngLat | null>(null);
  // Server clock, so the work timer resumes where it was rather than at 00:00.
  const [startedAt, setStartedAt] = useState<number | null>(
    job.workerPhase === "working" ? job.startedAt ?? Date.now() : null,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [codeOpen, setCodeOpen] = useState(false);
  // Prefilled for review accounts: the code is fixed at 0000 for demo jobs, and
  // making a reviewer find and type it is a step with nothing to demonstrate.
  // They still tap "Start cleaning" themselves.
  const [startCode, setStartCode] = useState(getCachedAppConfig().reviewLocation ? "0000" : "");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [doneStage, setDoneStage] = useState<"completed" | "rating">("completed");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<"confirm" | "reason">("confirm");
  const [vehicleScopeOpen, setVehicleScopeOpen] = useState(false);
  // Set (with the reason) when the customer cancels the job out from under us.
  const [cancelledNotice, setCancelledNotice] = useState<{ reason?: string | null } | null>(null);

  const unreadChat = useUnreadChat(job.id, workerId, "worker");

  const mapOpacity = useSharedValue(0);
  const mapFadeStyle = useAnimatedStyle(() => ({ opacity: mapOpacity.value }));

  const MAX_PANEL_H = SCREEN_H - 120;
  const scopeType =
    job.service === "Vehicle Cleaning" || job.details?.service === "vehicle"
      ? "vehicle"
      : job.service === "Furniture Shifting" || job.details?.service === "furniture"
        ? "furniture"
        : job.service === "Barber" || job.details?.service === "barber"
          ? "barber"
          : "home";

  // ---- Main draggable sheet (measured-peek, like CustomerHome) ----
  const [panelH, setPanelH] = useState(0);
  const [peekH, setPeekH] = useState(0);
  const COLLAPSED_Y = Math.max(0, panelH - peekH);
  const translateY = useSharedValue(SCREEN_H);
  // Restored from the last session. Only the work phase defaults to maximised —
  // that's where the timer and the finish slider live. En route and arrived
  // start at their peek so the route to the customer stays visible.
  const expandedRef = useRef(
    getSheetExpanded("worker-active-job", job.workerPhase === "working"),
  );
  const initialized = useRef(false);
  const collapsedYRef = useRef(0);
  collapsedYRef.current = COLLAPSED_Y;

  useEffect(() => {
    if (panelH === 0 || peekH === 0) return;
    if (!initialized.current) {
      initialized.current = true;
      translateY.value = SCREEN_H;
      translateY.value = withSpring(expandedRef.current ? 0 : COLLAPSED_Y, SPRING);
    } else if (!expandedRef.current) {
      translateY.value = withSpring(COLLAPSED_Y, { damping: 28, stiffness: 220, mass: 0.9 });
    }
  }, [COLLAPSED_Y, panelH, peekH, SCREEN_H, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => cancelAnimation(translateY),
      onPanResponderMove: (_, g) => {
        const collapsedY = collapsedYRef.current;
        const base = expandedRef.current ? 0 : collapsedY;
        translateY.value = Math.max(0, Math.min(collapsedY, base + g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const collapsedY = collapsedYRef.current;
        const base = expandedRef.current ? 0 : collapsedY;
        const final = base + g.dy;
        const expandIt = g.vy < -0.6 || (g.vy <= 0.6 && final < collapsedY / 2);
        expandedRef.current = expandIt;
        setSheetExpanded("worker-active-job", expandIt);
        translateY.value = withSpring(expandIt ? 0 : collapsedY, SPRING);
      },
    }),
  ).current;
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const mapsButtonStyle = useAnimatedStyle(() => ({
    bottom: Math.max(16, panelH - translateY.value + 14),
  }));

  // ---- Cancel draggable sheet ----
  const [cancelPanelH, setCancelPanelH] = useState(0);
  const [cancelPeekH, setCancelPeekH] = useState(0);
  const CANCEL_COLLAPSED_Y = Math.max(0, cancelPanelH - cancelPeekH);
  const cancelTranslateY = useSharedValue(SCREEN_H);
  const cancelScrim = useSharedValue(0);
  const cancelExpandedRef = useRef(false);
  const cancelInitialized = useRef(false);
  const cancelCollapsedYRef = useRef(0);
  cancelCollapsedYRef.current = CANCEL_COLLAPSED_Y;

  useEffect(() => {
    if (!cancelOpen || cancelPanelH === 0 || cancelPeekH === 0) return;
    if (!cancelInitialized.current) {
      cancelInitialized.current = true;
      // Open fully so all reasons are visible right away
      cancelTranslateY.value = SCREEN_H;
      cancelTranslateY.value = withSpring(0, SPRING);
    }
  }, [cancelOpen, cancelPanelH, cancelPeekH, cancelTranslateY]);

  const cancelPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => cancelAnimation(cancelTranslateY),
      onPanResponderMove: (_, g) => {
        const collapsedY = cancelCollapsedYRef.current;
        const base = cancelExpandedRef.current ? 0 : collapsedY;
        cancelTranslateY.value = Math.max(0, base + g.dy);
      },
      onPanResponderRelease: (_, g) => {
        const collapsedY = cancelCollapsedYRef.current;
        const base = cancelExpandedRef.current ? 0 : collapsedY;
        const final = base + g.dy;
        if (g.vy > 0.85 || final > collapsedY + 120) {
          closeCancel();
          return;
        }
        const expandIt = g.vy < -0.6 || (g.vy <= 0.6 && final < collapsedY / 2);
        cancelExpandedRef.current = expandIt;
        cancelTranslateY.value = withSpring(expandIt ? 0 : collapsedY, SPRING);
      },
    }),
  ).current;
  const cancelScrimStyle = useAnimatedStyle(() => ({ opacity: cancelScrim.value }));
  const cancelSheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cancelTranslateY.value }] }));

  const openCancel = () => {
    cancelInitialized.current = false;
    cancelExpandedRef.current = true;
    setCancelStep("confirm");
    setCancelOpen(true);
    cancelScrim.value = withTiming(1, { duration: 220 });
  };
  const closeCancel = () => {
    cancelScrim.value = withTiming(0, { duration: 200 });
    cancelTranslateY.value = withTiming(SCREEN_H, { duration: 220 }, finished => {
      if (finished) runOnJS(setCancelOpen)(false);
    });
  };

  // Going back never silently abandons the job — it opens the cancel flow
  const handleBack = () => {
    if (cancelOpen) {
      if (cancelStep === "reason") setCancelStep("confirm");
      else closeCancel();
    } else if (phase === "done") {
      onExit();
    } else if (phase === "working") {
      return;
    } else {
      openCancel();
    }
  };

  // Hardware back routes through the cancel flow instead of exiting the job
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelOpen, cancelStep, phase]);

  // One live job-room socket for the whole active job: it pushes a customer
  // cancellation the instant it happens and carries our GPS upstream — replacing
  // the old 4s status poll and the per-tick location POSTs.
  const jobSocketRef = useRef<LiveSocket | null>(null);
  useEffect(() => {
    const socket = openJobRoomSocket(job.id, "worker", workerId, {
      onState: snap => {
        if (!snap) return;
        if (snap.status === "cancelled" && snap.cancelledBy === "customer") {
          setCancelledNotice({ reason: snap.cancelReason });
          return;
        }
        // The server owns the phase. Entering the start code moved us to
        // "working" server-side, but the screen only tracked it in local state,
        // so reopening the app dropped the worker back to "I have arrived"
        // with the work timer gone. Never move BACKWARDS on a stale snapshot.
        const remote = snap.workerPhase;
        if (remote === "working") {
          setStartedAt(current => current ?? snap.startedAt ?? Date.now());
          setPhase(current => (current === "done" ? current : "working"));
        } else if (remote === "arrived") {
          setPhase(current => (current === "enroute" ? "arrived" : current));
        }
      },
    });
    jobSocketRef.current = socket;
    return () => {
      socket.close();
      jobSocketRef.current = null;
    };
  }, [job.id, workerId]);

  // Tell the background task which job to publish to. It runs with no React
  // tree, so this is the only way it can know — and without it the customer's
  // marker froze the moment this screen stopped being in front.
  useEffect(() => {
    const live = phase !== "done" && !cancelledNotice;
    void saveWorkerActiveJob(live ? job.id : null);
    return () => {
      void saveWorkerActiveJob(null);
    };
  }, [job.id, phase, cancelledNotice]);

  useEffect(() => {
    // Stop the moment the job is dead. Publishing GPS for a cancelled job kept
    // the worker "en route" on the customer's map while the alert sat unread.
    if (phase === "done" || cancelledNotice) return;
    let active = true;
    let sub: PositionSubscription | null = null;

    const publish = (position: LngLat) => {
      if (!active) return;
      setWorkerPosition(position);
      setRouteStartPosition(current => current ?? position);
      if (jobSocketRef.current) sendWorkerLocation(jobSocketRef.current, position);
    };

    (async () => {
      // Quick first paint from the cached fix, then stream live positions.
      const initial = await getCurrentPosition();
      if (initial) publish(initial);
      // Navigation-grade watcher (≈3s/5m): the active job is exactly when
      // fine tracking matters — browse mode keeps the coarse watcher.
      sub = await watchPositionNavigation(publish);
    })();

    return () => {
      active = false;
      sub?.remove();
    };
  }, [cancelledNotice, job.id, phase, workerId]);

  // Draw the worker map route once from the first real device position, then
  // leave that line alone. Live location still publishes for the customer app.
  useEffect(() => {
    if (!routeStartPosition || routeLockedRef.current) return;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    // The start position never changes after the first fix, so a single failed
    // fetch here used to mean no route line for the whole job — keep retrying
    // until it lands.
    const attempt = () => {
      getRoute(routeStartPosition, job.coordinates)
        .then(r => {
          if (!active) return;
          routeLockedRef.current = true;
          setRoute(r);
        })
        .catch(() => {
          if (active) retryTimer = setTimeout(attempt, 3000);
        });
    };
    attempt();
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [job.coordinates, routeStartPosition]);

  useEffect(() => {
    if (!route) return;
    const lngs = route.coordinates.map(c => c[0]);
    const lats = route.coordinates.map(c => c[1]);
    cameraRef.current?.fitBounds(
      [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
      { padding: { top: 130, bottom: 360, left: 50, right: 50 }, duration: 800, easing: "ease" },
    );
  }, [route]);

  useEffect(() => {
    if (phase !== "working" || !startedAt) return;
    const updateElapsed = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [phase, startedAt]);

  // Live self-marker: glides between GPS fixes instead of teleporting. The
  // old marker was pinned to routeStartPosition — the FIRST fix — so the
  // worker never saw himself move at all.
  const selfMarkerTarget = workerPosition ?? routeStartPosition;

  const remainingRoute = useMemo(() => {
    if (!route) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: route.coordinates },
    };
  }, [route]);

  const etaSeconds = route ? route.durationSeconds : 0;
  const elapsedLabel = formatElapsed(elapsedSeconds);
  const jobDetailLabel = summarizeJobDetails(job.details, job.detail, t);

  const handleMapReady = () => {
    mapOpacity.value = withTiming(1, { duration: 500 });
  };

  const openGoogleMaps = () => {
    const [lng, lat] = job.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => undefined);
  };

  const titleByPhase: Record<Phase, string> = {
    enroute: t("On the way to {name}", { name: job.customerName.split(" ")[0] }),
    arrived: t("You've arrived"),
    working: t("Work in Progress"),
    done: "",
  };
  const subtitleByPhase: Record<Phase, string> = {
    enroute: route ? t("~{eta} to the customer's place", { eta: formatEta(etaSeconds, t) }) : t("Loading route…"),
    arrived: t("Confirm you're at the customer's place"),
    working: t("Tap below when the job is finished"),
    done: "",
  };

  const advance = async () => {
    try {
      if (phase === "enroute") {
        // First "I've arrived" tap: report arrival once, then open the code
        // sheet straight away (no intermediate "Start cleaning" button state).
        setPhase("arrived");
        setCodeError(null);
        setCodeOpen(true);
        updateWorkerPhase(job.id, workerId, "arrived").catch(() => undefined);
      } else if (phase === "arrived") {
        // Already arrived — just reopen the code sheet (no second server call).
        setCodeError(null);
        setCodeOpen(true);
      } else if (phase === "working") {
        // The server credits the worker + accrues the 15% commission on
        // completion (authoritative) — nothing to record on-device.
        await completeBiddingJob(job.id, workerId);
        setPhase("done");
      }
    } catch {
      // Stay on the current phase if Cloudflare did not save the transition.
    }
  };

  const submitStartCode = async () => {
    const code = startCode.trim();
    if (code.length !== 4) {
      setCodeError(t("Enter the 4-digit customer code."));
      return;
    }
    try {
      const snapshot = await startBiddingJob(job.id, workerId, code);
      setStartedAt(snapshot.startedAt ?? Date.now());
      setPhase("working");
      setCodeOpen(false);
      setStartCode("");
      setCodeError(null);
    } catch {
      setCodeError(t("That code is not correct."));
    }
  };

  return (
    <View style={s.activeRoot}>
      <StatusBar style="light" />

      <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navy }, mapFadeStyle]}>
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={MAP_STYLE_URL}
          androidView="texture"
          logo={false}
          onDidFinishRenderingMapFully={handleMapReady}
          attributionPosition={{ bottom: 8, left: 8 }}
          // Keep the live route interactive: workers can inspect the area and
          // use pinch/double-tap zoom without leaving the active job.
          dragPan
          touchZoom
          touchRotate={false}
          touchPitch={false}
        >
          <Camera ref={cameraRef} initialViewState={{ center: job.coordinates, zoom: 13 }} />
          {remainingRoute ? (
            <GeoJSONSource id="job-route" data={remainingRoute}>
              <Layer
                id="job-route-line"
                type="line"
                beforeId="place-suburb"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": colors.accent, "line-width": 4.5 }}
              />
            </GeoJSONSource>
          ) : null}
          <ViewAnnotation id="job-customer" lngLat={job.coordinates}>
            <View style={s.homeMarker}>
              <House size={18} color={colors.paper} weight="fill" />
            </View>
          </ViewAnnotation>
          {selfMarkerTarget && phase !== "working" && phase !== "done" ? (
            <SmoothedMarker id="job-worker" target={selfMarkerTarget}>
              <View style={s.workerMarker}>
                <Broom size={18} color={colors.paper} weight="fill" />
              </View>
            </SmoothedMarker>
          ) : null}
        </Map>
      </Reanimated.View>

      <View style={[s.mapLighten, { pointerEvents: "none" }]} />

      {/* Navigation is only useful on the way there. Once the worker has
          arrived and is cleaning, directions to a place they're standing in
          are just clutter. */}
      {phase === "enroute" || phase === "arrived" ? (
        <AnimatedTouchableOpacity
          style={[s.mapsButton, mapsButtonStyle]}
          activeOpacity={0.9}
          onPress={openGoogleMaps}
        >
          <NavigationArrow size={18} color={colors.white} weight="fill" />
          <Text style={[s.mapsButtonText, fontStyles.semiBold]}>{t("Use Google Maps")}</Text>
        </AnimatedTouchableOpacity>
      ) : null}

      {/* Bottom sheet */}
      {phase === "done" ? (
        <Reanimated.View entering={FadeIn.duration(260)} style={s.sheet}>
          {doneStage === "completed" ? (
            <JobCompletedContent
              subtitle={t("Nice work — the job is complete.")}
              rows={[
                { label: t("Customer"), value: job.customerName },
                { label: t("Service"), value: t(job.service) },
                { label: t("Payment"), value: paymentLabel },
                { label: t("You earned"), value: `PKR${job.price}`, highlight: true },
              ]}
              rateLabel={t("Rate {name}", { name: job.customerName.split(" ")[0] })}
              onRate={() => setDoneStage("rating")}
            />
          ) : (
            <RateWorkerContent
              name={job.customerName}
              gender={job.avatar}
              onSend={async (rating) => {
                if (rating > 0) {
                  await submitJobRating(job.id, workerId, "worker", rating, []).catch(() => undefined);
                }
                onExit();
              }}
            />
          )}
        </Reanimated.View>
      ) : (
        <>
        <Reanimated.View
          onLayout={e => setPanelH(e.nativeEvent.layout.height)}
          {...panResponder.panHandlers}
          style={[ts.sheet, { maxHeight: MAX_PANEL_H }, panelStyle]}
        >
          {/* Peek - customer tracking layout, without the customer's start code */}
          <View onLayout={e => setPeekH(Math.ceil(e.nativeEvent.layout.height))}>
            <View style={ts.handleArea}>
              <View style={ts.handle} />
            </View>

            <View style={ts.trackingTitleRow}>
              <Text style={[ts.title, ts.trackingTitleInline, fontStyles.bold]} numberOfLines={1}>
                {titleByPhase[phase]}
              </Text>
            </View>
            <View style={ts.liveRow}>
              <View style={ts.liveDot} />
              <Text style={[ts.liveSubText, fontStyles.medium]} numberOfLines={1}>
                {subtitleByPhase[phase]}
              </Text>
            </View>

            {phase !== "working" ? (
              <>
                <View style={ts.divider} />
                <View style={ts.actionsRow}>
                  <View style={ts.actionItem}>
                    <View>
                      <ActiveJobAvatar photo={job.customerPhoto} gender={job.avatar} />
                      <View style={ts.ratingBadge}>
                        <Star size={10} color="#ffd400" weight="fill" />
                        <Text style={[ts.ratingBadgeText, fontStyles.semiBold]}>
                          {job.customerRating}
                        </Text>
                      </View>
                    </View>
                    <Text style={[ts.actionLabel, fontStyles.semiBold]} numberOfLines={1}>
                      {job.customerName.split(" ")[0]}
                    </Text>
                  </View>

                  <TouchableOpacity style={ts.actionItem} activeOpacity={0.85} onPress={onContact}>
                    <View style={ts.actionCircle}>
                      <PhoneCall size={24} color={colors.white} weight="fill" />
                      <UnreadBadge count={unreadChat} />
                    </View>
                    <Text style={[ts.actionLabel, fontStyles.semiBold]}>
                      {t("Contact customer")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={ts.actionItem}
                    activeOpacity={0.85}
                    onPress={() => setVehicleScopeOpen(true)}
                  >
                    <View style={ts.actionCircle}>
                      <Broom size={24} color={colors.white} weight="fill" />
                    </View>
                    <Text style={[ts.actionLabel, fontStyles.semiBold]}>{t("Scope")}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>

          {/* Below the fold — revealed by dragging up */}
          <View>
            <View style={ts.divider} />
            {phase === "working" ? (
              <View style={s.workProgressWrap}>
                <View style={s.elapsedScopeRow}>
                  <View style={s.elapsedBlock}>
                    <Text style={[s.elapsedLabel, fontStyles.medium]}>{t("Time elapsed")}</Text>
                    <Text style={[s.elapsedValue, fontStyles.bold]}>{elapsedLabel}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.elapsedScopeAction}
                    activeOpacity={0.86}
                    onPress={() => setVehicleScopeOpen(true)}
                  >
                    <View style={ts.actionCircle}>
                      <Broom size={24} color={colors.white} weight="fill" />
                    </View>
                    <Text style={[ts.actionLabel, fontStyles.semiBold]}>{t("Scope")}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[s.workProgressText, fontStyles.medium]}>
                  {t("Only mark complete when the job is actually finished.")}
                </Text>
              </View>
            ) : (
              <>
                <View style={ts.summaryTitlePill}>
                  <Text style={[ts.summaryTitleInside, fontStyles.bold]}>{t("Job Summary")}</Text>
                </View>
                <View style={ts.summaryCard}>
                  <TrackingSummaryRow label={t("Customer")} value={job.customerName} fonts={fonts} />
                  <TrackingSummaryRow label={t("Service")} value={t(job.service)} fonts={fonts} />
                  <TrackingSummaryRow label={t("Details")} value={jobDetailLabel} fonts={fonts} />
                  <TrackingSummaryRow label={t("Payment")} value={paymentLabel} fonts={fonts} />
                  <TrackingSummaryRow label={t("You'll earn")} value={`PKR${job.price}`} fonts={fonts} />
                </View>
              </>
            )}

            <PrimaryCta phase={phase} onPress={advance} />

            {phase === "enroute" || phase === "arrived" ? (
              <TouchableOpacity style={ts.cancelJobButton} activeOpacity={0.88} onPress={openCancel}>
                <Text style={[ts.cancelJobText, fontStyles.semiBold]}>{t("Cancel job")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Reanimated.View>
        </>
      )}

      {/* Cancel-reason draggable sheet */}
      {cancelOpen ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
          <Reanimated.View style={[s.modalScrim, cancelScrimStyle]} />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeCancel} />
          <Reanimated.View
            onLayout={e => setCancelPanelH(e.nativeEvent.layout.height)}
            {...cancelPan.panHandlers}
            layout={LinearTransition.duration(240)}
            style={[s.sheet, { maxHeight: MAX_PANEL_H }, cancelSheetStyle]}
          >
            <View onLayout={e => setCancelPeekH(Math.ceil(e.nativeEvent.layout.height))}>
              <View style={s.dragHandleArea} />
              <Text style={[s.cancelTitle, fontStyles.bold]} numberOfLines={2}>
                {cancelStep === "confirm" ? t("Cancel this job?") : t("Why do you want to cancel?")}
              </Text>
            </View>

            {cancelStep === "confirm" ? (
              <Reanimated.View entering={FadeIn.duration(180)}>
                <View style={s.cancelWarnBox}>
                  <WarningCircle size={22} color="#ff5a5f" weight="fill" />
                  <Text style={[s.cancelWarnText, fontStyles.medium]}>
                    {t("Cancelling an accepted job adds a PKR{penalty} penalty and lowers your acceptance rate.", {
                      penalty: CANCEL_PENALTY,
                    })}
                  </Text>
                </View>

                <TouchableOpacity style={s.keepButton} activeOpacity={0.9} onPress={closeCancel}>
                  <Text style={[s.keepButtonText, fontStyles.semiBold]}>{t("Keep the job")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cancelAnywayButton}
                  activeOpacity={0.85}
                  onPress={() => setCancelStep("reason")}
                >
                  <Text style={[s.cancelAnywayText, fontStyles.semiBold]}>{t("Cancel anyway")}</Text>
                </TouchableOpacity>
              </Reanimated.View>
            ) : (
              <Reanimated.View entering={FadeIn.duration(180)}>
                <View style={s.reasonList}>
                  {CANCEL_REASONS.map((reason, index) => (
                    <TouchableOpacity
                      key={reason}
                      style={[s.reasonRow, index > 0 && s.reasonRowDivider]}
                      activeOpacity={0.8}
                      onPress={() => {
                        cancelBiddingJob(job.id, workerId, "worker", reason).finally(onExit);
                      }}
                    >
                      <Text style={[s.reasonText, fontStyles.medium]} numberOfLines={1}>
                        {t(reason)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={s.keepButton} activeOpacity={0.9} onPress={closeCancel}>
                  <Text style={[s.keepButtonText, fontStyles.semiBold]}>{t("Keep the job")}</Text>
                </TouchableOpacity>
              </Reanimated.View>
            )}
          </Reanimated.View>
        </View>
      ) : null}

      <CustomAlert
        visible={!!cancelledNotice}
        title={t("Customer cancelled the job")}
        message={
          cancelledNotice?.reason
            ? t("Reason: {reason}", { reason: t(cancelledNotice.reason) })
            : t("No penalty to you — you're back online for new jobs.")
        }
        onClose={() => {
          setCancelledNotice(null);
          onExit();
        }}
      />

      <VehicleScopeSheet
        visible={vehicleScopeOpen}
        scopeType={scopeType}
        cleaningType={job.details?.service === "home" ? job.details.cleaningType : undefined}
        onClose={() => setVehicleScopeOpen(false)}
      />

      {codeOpen ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
          <View style={s.modalScrim} />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCodeOpen(false)} />
          <Reanimated.View entering={SlideInUp.duration(260)} exiting={SlideOutUp.duration(200)} style={s.codeSheet}>
            <Text style={[s.codeTitle, fontStyles.bold]}>{t("Enter customer code")}</Text>
            <Text style={[s.codeSub, fontStyles.medium]}>
              {t("Ask the customer for the 4-digit code shown on their screen.")}
            </Text>
            <TextInput
              style={[s.codeInput, fontStyles.medium]}
              placeholder="0000"
              placeholderTextColor={colors.ink + "88"}
              value={startCode}
              onChangeText={text => {
                setCodeError(null);
                setStartCode(text.replace(/[^0-9]/g, "").slice(0, 4));
              }}
              keyboardType="number-pad"
              maxLength={4}
            />
            {codeError ? (
              <Text style={[s.codeError, fontStyles.medium]}>{codeError}</Text>
            ) : null}
            <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={submitStartCode}>
              <Check size={20} color={colors.white} weight="bold" />
              <Text style={[s.ctaText, fontStyles.semiBold]}>{t("Start cleaning")}</Text>
            </TouchableOpacity>
          </Reanimated.View>
        </View>
      ) : null}
    </View>
  );
}

function TrackingSummaryRow({
  label,
  value,
  fonts,
}: {
  label: string;
  value: string;
  fonts: ReturnType<typeof useFontFamilies>;
}) {
  const ts = useThemedStyles(makeTrackingStyles);
  return (
    <View style={ts.summaryRow}>
      <Text style={[ts.summaryLabel, fontStyles.medium]}>{label}</Text>
      <Text style={[ts.summaryValue, fontStyles.semiBold]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActiveJobAvatar({
  photo,
  gender,
}: {
  photo?: string | null;
  gender: "male" | "female";
}) {
  const [failed, setFailed] = useState(false);
  const colors = useColors();
  const ts = useThemedStyles(makeTrackingStyles);
  if (photo && !failed) {
    return <Image source={{ uri: photo }} style={ts.avatarCircle} resizeMode="cover" onError={() => setFailed(true)} />;
  }
  return (
    <View style={ts.avatarCircle}>
      <UserCircle size={42} color={gender === "female" ? colors.accent : colors.ink} weight="fill" />
    </View>
  );
}

function PrimaryCta({ phase, onPress }: { phase: Phase; onPress: () => void }) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const ts = useThemedStyles(makeTrackingStyles);

  // Completing a job is irreversible, so it's a slide-to-confirm to guard against
  // accidental taps. Arriving stays a normal button (re-opens the code sheet).
  if (phase === "working") {
    return <SlideToComplete label={t("Slide to complete")} onComplete={onPress} />;
  }

  return (
    <TouchableOpacity style={ts.completeJobButton} activeOpacity={0.9} onPress={onPress}>
      <Check size={20} color={colors.white} weight="bold" />
      <Text style={[ts.completeJobText, fontStyles.semiBold]}>{t("I've arrived")}</Text>
    </TouchableOpacity>
  );
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

