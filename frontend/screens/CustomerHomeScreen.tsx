import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  TextInput,
  View,
  AppState,
  Text,
  TouchableOpacity,
  Image,
  ImageStyle,
  ImageSourcePropType,
  type NativeSyntheticEvent,
  PanResponder,
  StyleSheet,
  StyleProp,
  type ViewStyle,
  useWindowDimensions,
} from "react-native";
import Reanimated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  interpolate,
  interpolateColor,
  LinearTransition,
  runOnJS,
  useAnimatedReaction,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  ArrowRight,
  List,
  GpsFix,
  MagnifyingGlass,
  MapPin,
  Info,
  Plus,
  Minus,
  Check,
  PaypalLogo,
  PencilSimple,
  HandGrabbing,
  Broom,
  House,
  PhoneCall,
  ShieldCheck,
  Star,
  UserCircle,
  MoneyWavy,
  ExclamationMark,
  CaretDown,
  Sparkle,
  Ticket,
  X,
  Gift,
  Clock,
  CaretRight,
} from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  type ViewStateChangeEvent,
  ViewAnnotation,
} from "@maplibre/maplibre-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Circle, Rect, SvgXml } from "react-native-svg";
import CardPatches from "../components/CardPatches";
import FadeInView from "../components/FadeInView";
import DemoFlowBar, { DEMO_BAR_HEIGHT } from "../components/DemoFlowBar";
import LaunchCountdown from "../components/LaunchCountdown";
import SmoothedMarker from "../components/SmoothedMarker";
import MenuDrawer from "../components/MenuDrawer";
import AgentChat from "../components/AgentChat";
import PayPalCheckout from "../components/PayPalCheckout";
import { confirmPayPal, startPayPalHold } from "../services/payments";
import OffersOverlay, { type Offer } from "../components/OffersOverlay";
import PriceInputAlert from "../components/PriceInputAlert";
import SafetySheet from "../components/SafetySheet";
import VehicleScopeSheet from "../components/VehicleScopeSheet";
import WorkerProfileSheet from "../components/WorkerProfileSheet";
import JobCompletedContent from "../components/JobCompletedContent";
import RateWorkerContent from "../components/RateWorkerContent";
import LocationPin from "../components/LocationPin";
import RadarPulse from "../components/RadarPulse";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeHomeStyles } from "../styles/CustomerHomeScreen.styles";
import { makeTrackingStyles } from "../styles/WorkerTrackingScreen.styles";
import { clearUser, getStoredUser, setActiveMode } from "../services/auth";
import { MAP_STYLE_URL, formatEta, getRoute, type LngLat, type Route as TrackingRoute } from "../services/routing";
import {
  cancelBiddingJob,
  createBiddingJob,
  getCurrentUserId,
  openJobRoomSocket,
  submitJobRating,
  summarizeJobDetails,
  uploadCustomerPhoto,
  type JobDetails,
  type JobSnapshot,
} from "../services/bidding";
import { avatarOwnerKeyFor, getAvatar } from "../services/avatar";
import { syncPushNotifications } from "../services/notifications";
import {
  DEFAULT_LOCATION,
  createPlacesSessionToken,
  detectCurrentLocation,
  getCurrentPosition,
  distanceMeters,
  distanceToPolylineMeters,
  reverseGeocode,
  resolvePlace,
  saveLastLocation,
  searchPlaces,
  type PlaceResult,
  type SelectedLocation,
} from "../services/location";
import { fetchLiveRequest, loadActiveRequest, saveActiveRequest } from "../services/activeRequest";
import { readChat } from "../services/chatDraft";
import { getSheetExpanded, setSheetExpanded } from "../services/sheetState";
import { useUnreadChat } from "../hooks/useUnreadChat";
import UnreadBadge from "../components/UnreadBadge";
import { DEV_CLEAR_CHOOSE_SCREENSHOT_UI } from "../services/devFlags";
import { showLocalNotification } from "../services/notifications";
import { isWithinServiceArea, isWithinServiceAreaCoordinates } from "../services/serviceArea";
import {
  DEFAULT_APP_CONFIG,
  formatOperatingHours,
  getAppConfig,
  getCachedAppConfig,
  getLaunchWindow,
  isWithinOperatingHours,
  type AppConfig,
} from "../services/appConfig";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

const AnimatedRect = Reanimated.createAnimatedComponent(Rect);

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "CustomerHome">;
  route: RouteProp<RootStackParamList, "CustomerHome">;
};

// Google wordmark, solid white with a dark outline. Drawn in two layers: a fat
// dark silhouette (fill + stroke) behind, then the white letters on top at full
// thickness — so the stroke sits purely OUTSIDE and never thins the letters
// (react-native-svg ignores paint-order, so a single stroked path eats the fill).
const GOOGLE_MARK_PATHS =
  `<path d="M115.39 46.71c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.86 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>` +
  `<path d="M163.39 46.71c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>` +
  `<path d="M209.39 25.87v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z"/>` +
  `<path d="M224.64 2.53v65h-9.5v-65z"/>` +
  `<path d="M261.66 54.01l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z"/>` +
  `<path d="M34.93 40.94v-9.41h31.71c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C15.96 68.88 0 53.42 0 34.44 0 15.46 15.96 0 34.94 0c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65z"/>`;

const GOOGLE_MARK_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40.446 -22.19 350.532 133.14">` +
  `<g fill="#101012" stroke="#101012" stroke-width="16" stroke-linejoin="round">${GOOGLE_MARK_PATHS}</g>` +
  `<g fill="#ffffff">${GOOGLE_MARK_PATHS}</g>` +
  `</svg>`;

type Service = "home" | "vehicle" | "furniture" | "barber";
type Gender = "Male" | "Female" | "Any";
type CleaningType = "Regular" | "Deep";
type VehicleType = "Car" | "Bike" | "Van";
type PaymentMethod = "PayPal" | "Cash";

const PAYMENT_METHODS: PaymentMethod[] = ["PayPal", "Cash"];

// Singular/plural unit keys per vehicle type — translated at use
const VEHICLE_UNIT_KEY: Record<VehicleType, { one: string; many: string }> = {
  Car: { one: "car", many: "cars" },
  Bike: { one: "bike", many: "bikes" },
  Van: { one: "van", many: "vans" },
};

const INITIAL_VEHICLE_COUNTS: Record<VehicleType, number> = {
  Car: 1,
  Bike: 0,
  Van: 0,
};
const HOME_MIN_ROOMS = 1;

type FurnitureSize = "Small" | "Big";
const INITIAL_FURNITURE_COUNTS: Record<FurnitureSize, number> = { Small: 0, Big: 1 };
// Matches the server's clamp on smallItems / bigItems.
const FURNITURE_MAX_ITEMS = 30;

type BarberCut = "haircut" | "beard" | "haircutBeard";
const BARBER_CUTS: { key: BarberCut; label: string }[] = [
  { key: "haircut", label: "Haircut" },
  { key: "beard", label: "Beard" },
  { key: "haircutBeard", label: "Haircut + Beard" },
];
const INITIAL_BARBER_COUNTS: Record<BarberCut, number> = { haircut: 1, beard: 0, haircutBeard: 0 };
// Matches the server's clamp on each cut.
const BARBER_MAX_PEOPLE = 10;

type Translate = (key: string, params?: Record<string, string | number>) => string;

const formatVehicleCount = (type: VehicleType, count: number, t: Translate) =>
  `${count} ${t(count === 1 ? VEHICLE_UNIT_KEY[type].one : VEHICLE_UNIT_KEY[type].many)}`;

const formatVehicleSummary = (counts: Record<VehicleType, number>, t: Translate) => {
  const selected = (Object.keys(counts) as VehicleType[])
    .filter(type => counts[type] > 0)
    .map(type => formatVehicleCount(type, counts[type], t));

  return selected.length > 0 ? selected.join(" + ") : t("No vehicles selected yet");
};

// Sheet geometry
const HEADER_AREA = 150;       // top space reserved for floating header
const ACTION_BAR_AREA = 194;   // bottom space covered by action bar (auto-accept row + coupon + buttons)
const FLOATING_BACK_SIZE = 48;
const FLOATING_BACK_GAP = 6;
const PERSONALIZE_PREF_BOTTOM = 44 + 50 + 10 + 42;
const BACK_HIDE_CLEARANCE = 48;
const BACK_HIDE_DISTANCE = 34;
const FORCE_CLOSED_HOURS_PREVIEW = false;
const DEV_CHOOSE_SCREENSHOT_LOCATION: SelectedLocation = {
  coordinates: [73.1193632, 33.5311665],
  address: "Bahria Ave, Phase 7 Islamabad, Pakistan",
};
const CANCEL_REASONS = [
  "I don't need the service anymore",
  "Need changes in my job",
  "Worker not moving or off route",
  "Worker is late",
  "Worker asked to cancel",
  "Worker asks for extra payment",
  "App issue",
];

function formatDistance(meters: number, t: (k: string, p?: Record<string, string | number>) => string): string {
  if (meters >= 1000) return t("{n} km", { n: (meters / 1000).toFixed(1) });
  return t("{n} m", { n: Math.max(0, Math.round(meters)) });
}

export default function CustomerHomeScreen({ navigation, route }: Props) {
  const { name } = route.params;
  const fonts = useFontFamilies();
  const t = useT();
  const { settings, setActiveReward } = useSettings();
  const isUrdu = settings.language === "ur";
  const colors = useColors();
  const s = useThemedStyles(makeHomeStyles);
  const ts = useThemedStyles(makeTrackingStyles);
  const { height: SCREEN_H, width: SCREEN_W } = useWindowDimensions();

  // The sheet may expand up over the worker-preference row, stopping just below
  // the menu/location row — gives tall content (e.g. vehicles) room for the price.
  const MAX_PANEL_H = Math.max(320, SCREEN_H - 96);
  const TRACKING_MAX_PANEL_H = Math.max(320, SCREEN_H - 32);
  // Inset the map's logical viewport by the header (top) and bottom sheet
  // (bottom) so the camera center (and the pin) sits in the middle of the
  // actually visible map area between them
  const MAP_BOTTOM_INSET = Math.round(SCREEN_H / 2);
  const PIN_POINT_Y = Math.round((HEADER_AREA + (SCREEN_H - MAP_BOTTOM_INSET)) / 2);
  // Collapsed peek = roughly the bottom half of the screen (panel top ˜ screen center)
  const PEEK_H = Math.max(220, Math.round(SCREEN_H / 2) - ACTION_BAR_AREA);
  const [panelHeight, setPanelHeight] = useState(0);
  // On the service picker the peek shows three quarters of the last card, so
  // the cut-off card shows there is more below.
  // A ref as well as state: the panel's own onLayout can run before this
  // re-renders, and the entrance must already aim at the right height.
  const choosePeekRef = useRef(0);
  const [choosePeekH, setChoosePeekH] = useState(0);
  const peekVisibleH = (forStep: "choose" | "personalize") =>
    forStep === "choose" && choosePeekRef.current > 0 ? choosePeekRef.current : PEEK_H + ACTION_BAR_AREA;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [location, setLocation] = useState<SelectedLocation>(DEFAULT_LOCATION);
  // Set once a saved booking restores its address, so GPS auto-detect backs off.
  const restoredLocationRef = useRef(false);
  // Structured details of the in-flight request, shown in the offers Job Summary
  const [requestDetails, setRequestDetails] = useState<JobDetails | null>(null);
  const [trackingOffer, setTrackingOffer] = useState<Offer | null>(null);
  const [activeJobRequest, setActiveJobRequest] = useState<{ jobId: string; customerId: string } | null>(null);
  const [trackingJob, setTrackingJob] = useState<JobSnapshot | null>(null);
  const [trackingWorkerLocation, setTrackingWorkerLocation] = useState<LngLat | null>(null);
  const [trackingRoute, setTrackingRoute] = useState<TrackingRoute | null>(null);
  const [completion, setCompletion] = useState<"none" | "completed" | "rating">("none");
  const notifiedTrackingJobRef = useRef<string | null>(null);
  const unreadChat = useUnreadChat(activeJobRequest?.jobId, activeJobRequest?.customerId, "customer");
  // Read inside the live-socket handler without re-subscribing on every change.
  const completionRef = useRef(completion);
  completionRef.current = completion;

  // ---- Screen modes (one persistent map, only the UI swaps out) ----
  type Mode = "view" | "edit" | "offers" | "tracking";
  const [mode, setMode] = useState<Mode>("view");
  // Coming back from a finished job, the chat replaces the tracking screen at once rather than fading in over the map.
  const [chatInstant, setChatInstant] = useState(false);
  const [viewUiVisible, setViewUiVisible] = useState(true);
  // Within "view" mode: pick a service first, then personalize it.
  const [step, setStep] = useState<"choose" | "personalize">("choose");
  const COLLAPSED_Y = Math.max(0, panelHeight - peekVisibleH(step));
  const [editAddress, setEditAddress] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const modeRef = useRef<Mode>("view");
  const editCenterRef = useRef<LngLat>(DEFAULT_LOCATION.coordinates);
  // Place picked from search, held until the camera finishes easing to it —
  // its name is better than anything reverse geocoding will give us back.
  const pickedPlaceRef = useRef<{ coordinates: LngLat; label: string } | null>(null);
  const geocodeRequestId = useRef(0);
  const cameraRef = useRef<CameraRef>(null);

  modeRef.current = mode;
  const clearChooseScreenshotUi = DEV_CLEAR_CHOOSE_SCREENSHOT_UI && mode === "view" && step === "choose";
  const showViewUi = mode === "view" && viewUiVisible && !clearChooseScreenshotUi;
  const showViewTopUi = mode === "view" && viewUiVisible && !clearChooseScreenshotUi;
  const mapCameraCenter = clearChooseScreenshotUi ? DEV_CHOOSE_SCREENSHOT_LOCATION.coordinates : location.coordinates;

  // Auto-detect GPS position + address on first load.
  useEffect(() => {
    // A repeat request already provides the exact saved booking address. Do
    // not let the asynchronous GPS lookup overwrite it after the form opens.
    if (route.params.repeatJob) return;
    let active = true;
    detectCurrentLocation().then(detected => {
      if (!active || !detected) return;
      // A restored booking owns the pin — never overwrite its address with
      // wherever the phone is sitting now.
      if (restoredLocationRef.current) return;
      // Re-read the config HERE, not where the lookup started.
      //
      // On a fresh install the config is fetched signed-out at Splash, so it
      // has no reviewLocation when detectCurrentLocation() begins and the
      // lookup falls through to real GPS. The signed-in config then lands
      // mid-flight and snaps the pin to Bahria — and this late fix used to
      // land after it and put the reviewer straight back on their own street.
      if (getCachedAppConfig().reviewLocation) return;
      setLocation(detected);
    });
    return () => {
      active = false;
    };
  }, [route.params.repeatJob]);

  // Restore an in-flight booking after an app restart. The job lives on the
  // server for 15 minutes; losing it from the UI on close made it look as if
  // closing the app cancelled the booking.
  useEffect(() => {
    let active = true;
    void (async () => {
      const remembered = await loadActiveRequest();
      if (!active || !remembered) return;
      let live = await fetchLiveRequest(remembered);
      // "unknown" = we could not reach the server (cold start, no network yet).
      // Retry a few times before giving up; NEVER erase the booking on it, or
      // the whole tracking UI vanishes on reopen and can't be recovered.
      for (let attempt = 0; live === "unknown" && attempt < 4; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
        if (!active) return;
        live = await fetchLiveRequest(remembered);
      }
      if (!active) return;
      if (live === "gone") {
        void saveActiveRequest(null);
        return;
      }
      if (live === "unknown") return; // keep it saved; next launch/foreground retries
      setActiveJobRequest(live.request);
      setTrackingJob(live.job);
      if (live.job.details) setRequestDetails(live.job.details);
      // Restore the booking's OWN address/pin. Without this the destination
      // silently became wherever the phone happens to be right now, because
      // the GPS auto-detect below owns `location` on every launch.
      if (live.job.coordinates) {
        restoredLocationRef.current = true;
        setLocation({ coordinates: live.job.coordinates, address: live.job.address });
      }
      if (live.job.workerLocation) setTrackingWorkerLocation(live.job.workerLocation);
      // The tracking sheet is gated on the accepted offer (worker name, photo,
      // rating). A relaunch has no in-memory offer, so the whole panel silently
      // vanished and left a bare map.
      if (live.acceptedOffer) setTrackingOffer(live.acceptedOffer);
      // Open = still collecting offers; assigned/in_progress = worker on the way.
      const inChat = readChat()?.request?.jobId === live.request.jobId;
      if (live.job.status !== "open") setMode("tracking");
      else if (!inChat) setMode("offers");
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== "tracking" || !activeJobRequest) return;
    const mergeWorkerLocation = (next: LngLat) =>
      setTrackingWorkerLocation(current =>
        current && current[0] === next[0] && current[1] === next[1] ? current : next,
      );

    const applyJob = (job: JobSnapshot) => {
      setTrackingJob(job);
      if (job.workerLocation) mergeWorkerLocation(job.workerLocation);
      if (job.status === "completed" && completionRef.current === "none") {
        setCompletion("completed");
      }
      // Worker cancelled out from under us — surface the white alert (with the
      // reason) and drop the tracking view.
      if (job.status === "cancelled" && job.cancelledBy === "worker") {
        const reason = job.cancelReason;
        setAlert({
          title: t("Worker cancelled the job"),
          message: reason
            ? t("Reason: {reason}", { reason: t(reason) })
            : t("Your request has been cancelled. You can request again anytime."),
        });
        exitTracking();
      }
    };

    const socket = openJobRoomSocket(activeJobRequest.jobId, "customer", activeJobRequest.customerId, {
      onState: job => {
        if (job) applyJob(job);
      },
      onWorkerLocation: mergeWorkerLocation,
    });
    return () => socket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeJobRequest, trackingOffer]);

  // Route policy: fetch once, then refetch ONLY when the worker strays off
  // the drawn line (took a different street) or the ETA is stale (60s).
  // Refetching per GPS tick hammered the routing server and made the whole
  // screen feel chunky.
  const trackingRouteMetaRef = useRef<{ fetchedAt: number; coordinates: LngLat[] } | null>(null);
  useEffect(() => {
    if (mode !== "tracking" || !trackingWorkerLocation) return;

    const meta = trackingRouteMetaRef.current;
    if (meta) {
      const offRoute = distanceToPolylineMeters(trackingWorkerLocation, meta.coordinates) > 80;
      const stale = Date.now() - meta.fetchedAt > 60_000;
      if (!offRoute && !stale) return;
    }

    let active = true;
    getRoute(trackingWorkerLocation, location.coordinates)
      .then(result => {
        if (!active) return;
        trackingRouteMetaRef.current = { fetchedAt: Date.now(), coordinates: result.coordinates };
        setTrackingRoute(result);
      })
      .catch(() => {
        // Only alert when we have no route at all — a failed refresh of an
        // existing line is invisible and self-heals on the next pass.
        if (active && !trackingRouteMetaRef.current) {
          setAlert({
            title: t("Couldn't load route"),
            message: t("Check your internet connection and try again."),
          });
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, trackingWorkerLocation, location.coordinates]);

  // Auto-fit the camera to the route ONCE per tracking session — the route
  // refreshes on every worker GPS tick, and re-fitting each time would yank
  // the camera back while the customer is panning/zooming around.
  const trackingFittedRef = useRef(false);

  useEffect(() => {
    if (mode !== "tracking") {
      trackingFittedRef.current = false;
      return;
    }
    if (!trackingRoute || trackingFittedRef.current) return;
    trackingFittedRef.current = true;
    const lngs = trackingRoute.coordinates.map(c => c[0]);
    const lats = trackingRoute.coordinates.map(c => c[1]);
    cameraRef.current?.fitBounds(
      [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
      // Small padding only — the map's contentInset already reserves the
      // header and the bottom half of the screen; stacking large padding on
      // top of it collapses the viewport and zooms out to the whole country
      { padding: { top: 16, bottom: 24, left: 40, right: 40 }, duration: 800, easing: "ease" },
    );
  }, [mode, trackingRoute]);

  // ---- Map fade-in (hide the blank first frames, keep the pan) ----
  const mapOpacity = useSharedValue(0);
  const mapLoadedRef = useRef(false);
  const mapFadeStyle = useAnimatedStyle(() => ({ opacity: mapOpacity.value }));

  const handleMapFullyRendered = () => {
    if (mapLoadedRef.current) return;
    mapLoadedRef.current = true;
    mapOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
  };

  const geocodeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Place search (edit mode) ----
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const searchRequestId = useRef(0);
  const searchSessionToken = useRef(createPlacesSessionToken());

  useEffect(() => {
    // Start early enough for Places Autocomplete to feel responsive.
    if (mode !== "edit" || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const requestId = ++searchRequestId.current;
      searchPlaces(searchQuery.trim(), location.coordinates, searchSessionToken.current)
        .then(results => {
          if (searchRequestId.current === requestId) setSearchResults(results);
        })
        .catch(() => undefined);
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, mode]);

  const clearSearch = () => {
    searchRequestId.current++;
    setSearchQuery("");
    setSearchResults([]);
  };

  const selectSearchResult = async (result: PlaceResult) => {
    const sessionToken = searchSessionToken.current;
    Keyboard.dismiss();
    clearSearch();
    const resolved = await resolvePlace(result, sessionToken).catch(() => null);
    searchSessionToken.current = createPlacesSessionToken();
    if (!resolved?.coordinates) return;
    // Remember it: easing the camera fires the region-change handlers, which
    // would otherwise reverse-geocode the destination and overwrite this name
    // — and where Google has no street data that came back as raw lat/lng, so
    // picking "Bahria Town Phase 8 Sector B" showed "33.49488, 73.06857".
    pickedPlaceRef.current = { coordinates: resolved.coordinates, label: resolved.label };
    setEditAddress(resolved.label);
    cameraRef.current?.easeTo({ center: resolved.coordinates, zoom: 18, duration: 600 });
  };

  const resolveEditAddress = (coordinates: LngLat) => {
    const requestId = ++geocodeRequestId.current;

    // Settled on the place the user just picked from search → keep its name
    // (and skip a paid geocoding request). Anything further than a few metres
    // means they dragged afterwards, so the pin wins.
    const picked = pickedPlaceRef.current;
    if (picked && distanceMeters(coordinates, picked.coordinates) < 40) {
      pickedPlaceRef.current = null;
      setEditAddress(picked.label);
      return;
    }
    pickedPlaceRef.current = null;

    setEditAddress(null);
    if (geocodeDebounce.current) clearTimeout(geocodeDebounce.current);
    geocodeDebounce.current = null;
    if (!isWithinServiceAreaCoordinates(coordinates, appConfig)) {
      setEditAddress(t("Area not available yet"));
      return;
    }
    // Wait for the map to actually settle before spending a geocoding request
    // Longer debounce so a drag that crosses several map tiles only resolves
    // once it settles — every settle is a paid Google request.
    geocodeDebounce.current = setTimeout(() => {
      reverseGeocode(coordinates)
        .catch(() => `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`)
        .then(label => {
          if (geocodeRequestId.current === requestId) setEditAddress(label);
        });
    }, 600);
  };

  // Choose a service → smoothly zoom/pan in and reveal the personalize sheet.
  const chooseService = (svc: Service) => {
    hidePanelImmediately();
    setPanelHeight(0);
    setService(svc);
    setStep("personalize");
    // Re-run the initial positioning for the new (taller) content → starts at
    // the collapsed peek instead of fully expanded.
    initialized.current = false;
    // Drop the sheet off-screen immediately so the new content doesn't flash at
    // the old raised position for a frame before the slide-up plays.
    cancelAnimation(translateY);
    translateY.value = MAX_PANEL_H;
    cameraRef.current?.easeTo({ center: location.coordinates, zoom: 18.6, duration: 650 });
  };

  // Back out of personalize → zoom back out to the service picker.
  const backToChoose = () => {
    hidePanelImmediately();
    setPanelHeight(0);
    setStep("choose");
    initialized.current = false;
    cancelAnimation(translateY);
    translateY.value = MAX_PANEL_H;
    cameraRef.current?.easeTo({ center: location.coordinates, zoom: 17.8, duration: 650 });
  };

  const enterEditMode = () => {
    setChatInstant(false);
    searchSessionToken.current = createPlacesSessionToken();
    pickedPlaceRef.current = null;
    editCenterRef.current = location.coordinates;
    setEditAddress(location.address);
    setPrefOpen(false);
    expandedRef.current = false;
    initialized.current = false;
    cancelAnimation(translateY);
    translateY.value = withTiming(MAX_PANEL_H, {
      duration: 240,
      easing: Easing.in(Easing.cubic),
    });
    setTimeout(() => {
      setViewUiVisible(false);
      setMode("edit");
    }, 210);
    // Subtle zoom-in as the picker unlocks — same center, pin stays put
    cameraRef.current?.easeTo({ center: location.coordinates, zoom: 18.2, duration: 500 });
  };

  const cancelEditMode = () => {
    clearSearch();
    setViewUiVisible(true);
    setMode("view");
    // Glide back to the confirmed location
    cameraRef.current?.easeTo({ center: location.coordinates, zoom: 18, duration: 600 });
  };

  const confirmEditLocation = () => {
    if (!editAddress) return;
    clearSearch();
    const next = { coordinates: editCenterRef.current, address: editAddress };
    setLocation(next);
    saveLastLocation(next);
    setViewUiVisible(true);
    setMode("view");
  };

  // Hardware back exits edit/offers mode instead of leaving the screen.
  // Tracking can't be backed out of — back only closes the cancel sheet.
  useEffect(() => {
    if (mode === "view") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      // BackHandler is app-global — when another screen (e.g. Chat) is on
      // top, let IT handle back (default pop) instead of swallowing it
      if (!navigation.isFocused()) return false;
      // Offers mode handles its own back (opens the cancel-request confirm).
      if (mode === "offers") return false;
      if (mode === "edit") cancelEditMode();
      else if (mode === "tracking" && cancelStepRef.current) closeCancelFlow();
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleRegionChanging = () => {
    if (modeRef.current !== "edit") return;
    // Invalidate any in-flight geocode while the user is dragging
    geocodeRequestId.current++;
    setEditAddress(null);
  };

  const handleRegionChanged = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (modeRef.current !== "edit") return;
    editCenterRef.current = event.nativeEvent.center;
    resolveEditAddress(event.nativeEvent.center);
  };

  const locateMe = async () => {
    setLocating(true);
    const position = await getCurrentPosition();
    setLocating(false);
    if (position) {
      cameraRef.current?.easeTo({ center: position, zoom: 18, duration: 600 });
    }
  };

  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const [service, setService] = useState<Service>("home");
  const [gender, setGender] = useState<Gender>("Male");
  const [cleaningType, setCleaningType] = useState<CleaningType>("Regular");
  const [rooms, setRooms] = useState(HOME_MIN_ROOMS);
  const [furnitureCounts, setFurnitureCounts] = useState<Record<FurnitureSize, number>>(INITIAL_FURNITURE_COUNTS);
  const [barberCounts, setBarberCounts] = useState<Record<BarberCut, number>>(INITIAL_BARBER_COUNTS);
  const [vehicleCounts, setVehicleCounts] = useState<Record<VehicleType, number>>(INITIAL_VEHICLE_COUNTS);
  const [price, setPrice] = useState(DEFAULT_APP_CONFIG.pricing.home.regular.base);
  const [priceInputVisible, setPriceInputVisible] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [vehicleScopeOpen, setVehicleScopeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(settings.defaultPayment);
  const [paymentOptionsOpen, setPaymentOptionsOpen] = useState(false);
  // Driven by hand, not by Reanimated's entering/exiting: a layout animation
  // on a child mounting in the same commit as its parent does not reliably
  // run, and an exit never plays because the tree is already unmounted. Like
  // every other sheet here, this drives a shared value and stays mounted until
  // the close finishes.
  const [paymentSheetMounted, setPaymentSheetMounted] = useState(false);
  const [paymentSheetHeight, setPaymentSheetHeight] = useState(0);
  const paymentAnim = useSharedValue(0);

  useEffect(() => {
    if (paymentOptionsOpen) {
      setPaymentSheetMounted(true);
      paymentAnim.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else if (paymentSheetMounted) {
      paymentAnim.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, finished => {
        if (finished) runOnJS(setPaymentSheetMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentOptionsOpen]);

  const paymentScrimStyle = useAnimatedStyle(() => ({ opacity: paymentAnim.value }));
  // Falls back to a sensible travel until the first layout measures the sheet.
  const paymentSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - paymentAnim.value) * (paymentSheetHeight || 320) }],
  }));
  const [agentOn, setAgentOn] = useState(false);
  const [repeatChat, setRepeatChat] = useState<React.ComponentProps<typeof AgentChat>["repeat"]>(null);
  const [paypalUrl, setPaypalUrl] = useState<string | null>(null);
  const [paypalBusy, setPaypalBusy] = useState(false);
  const pendingHoldRef = useRef<string | null>(null);
  const approvedHoldRef = useRef<string | null>(null);
  const [customAgentBudget, setCustomAgentBudget] = useState<number | null>(null);
  const [agentBudgetInputVisible, setAgentBudgetInputVisible] = useState(false);
  const [prefOpen, setPrefOpen] = useState(false);
  // Seeded from the cache, NOT from the bundled defaults. The splash screen
  // awaits getAppConfig() before it routes anywhere, so by the time this mounts
  // the server's answer is already in memory. Starting from DEFAULT_APP_CONFIG
  // meant a guaranteed wrong first paint — bundled hours are 07:00-23:00 where
  // the server says 00:00-23:59, and the bundled launch campaign is still
  // "on" — so the hours text swapped and the gift pill unmounted a moment
  // after mount, while <FadeInView> still holds this whole top area as an
  // Android hardware texture.
  const [appConfig, setAppConfig] = useState<AppConfig>(getCachedAppConfig);
  const [nowTick, setNowTick] = useState(Date.now());
  // Holds a repeated booking's saved offer through the recalculation caused by
  // restoring its service choices.
  const repeatPriceRef = useRef<number | null>(null);
  const vehicleSummary = formatVehicleSummary(vehicleCounts, t);
  const activeReward = settings.activeReward;
  const recommendedPrice = useMemo(() => {
    if (service === "home") {
      const tier = cleaningType === "Deep" ? appConfig.pricing.home.deep : appConfig.pricing.home.regular;
      const extraRooms = Math.max(0, rooms - HOME_MIN_ROOMS);
      return tier.base + extraRooms * tier.perExtraRoom;
    }
    if (service === "furniture") {
      return (
        furnitureCounts.Small * appConfig.pricing.furniture.small +
        furnitureCounts.Big * appConfig.pricing.furniture.big
      );
    }
    if (service === "barber") {
      return BARBER_CUTS.reduce((sum, cut) => sum + barberCounts[cut.key] * appConfig.pricing.barber[cut.key], 0);
    }
    return (
      vehicleCounts.Bike * appConfig.pricing.vehicle.bike +
      vehicleCounts.Car * appConfig.pricing.vehicle.car +
      vehicleCounts.Van * appConfig.pricing.vehicle.van
    );
  }, [appConfig.pricing, barberCounts, cleaningType, furnitureCounts, rooms, service, vehicleCounts]);
  // Customers may offer up to PKR 50 below the calculated recommendation,
  // but never less than PKR 50 for any service.
  const minimumOfferPrice = Math.max(50, recommendedPrice - 50);
  const launchWindow = getLaunchWindow(appConfig, nowTick);
  const launchDiscountActive = launchWindow.active;
  const rewardAdjustedPrice = Math.max(
    minimumOfferPrice,
    activeReward ? price - activeReward.amountOff : price,
  );
  // The default leaves the agent a fifth of the price as room to close.
  const agentBudget = Math.max(customAgentBudget ?? Math.ceil((rewardAdjustedPrice * 1.2) / 50) * 50, rewardAdjustedPrice);
  const bookingOpen = FORCE_CLOSED_HOURS_PREVIEW ? false : isWithinOperatingHours(appConfig, new Date(nowTick));
  const serviceAreaOpen = isWithinServiceArea(location, appConfig);
  const operatingHoursText = formatOperatingHours(appConfig);
  const operatingHoursMatch = operatingHoursText.match(/^Open: (.+?)\s+Close: (.+)$/);
  const operatingOpenText = operatingHoursMatch?.[1] ?? "7:00 AM";
  const operatingCloseText = operatingHoursMatch?.[2] ?? "11:00 PM";

  useEffect(() => {
    setPaymentMethod(settings.defaultPayment);
  }, [settings.defaultPayment]);

  useEffect(() => {
    let active = true;
    const load = () =>
      getAppConfig()
        .then(config => {
          if (!active) return;
          setAppConfig(config);
          // A store reviewer is stood in Bahria Town. The pin is resolved on
          // mount, before this config has landed, so it has to be corrected
          // once the answer arrives — otherwise they sit wherever they really
          // are, with no address, no tiles and no route.
          if (config.reviewLocation && !restoredLocationRef.current) {
            setLocation({
              coordinates: config.reviewLocation.coordinates,
              address: config.reviewLocation.address,
            });
            editCenterRef.current = config.reviewLocation.coordinates;
          }
        })
        .catch(() => undefined);

    load();
    // Config is fetched once per mount, and every screen starts from the
    // hardcoded defaults until it lands — so a server-side change (operating
    // hours, pricing, service area) was invisible until the app was killed and
    // relaunched. Re-read on foreground instead.
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") load();
    });
    // 60s, not 1s. This tick now only feeds the operating-hours pill and the
    // launch banner, both of which change on a minute or day boundary. The
    // launch countdown does show seconds, but it owns its own ticker
    // (<LaunchCountdown/>) so the whole screen no longer re-renders once a
    // second — and no longer ticks at all when nothing time-based is visible.
    const timer = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => {
      active = false;
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (repeatPriceRef.current !== null) {
      setPrice(Math.max(minimumOfferPrice, repeatPriceRef.current));
      repeatPriceRef.current = null;
      return;
    }
    setPrice(Math.max(minimumOfferPrice, recommendedPrice));
  }, [minimumOfferPrice, recommendedPrice]);

  useEffect(() => {
    const repeat = route.params.repeatJob;
    if (!repeat) return;

    setLocation(repeat.location);
    editCenterRef.current = repeat.location.coordinates;
    setMode("view");
    setViewUiVisible(true);
    setRepeatChat({
      service: repeat.service,
      details: repeat.details,
      workerPreference: repeat.workerPreference,
      payment: repeat.paymentMethod,
    });
    cameraRef.current?.easeTo({ center: repeat.location.coordinates, zoom: 18, duration: 0 });
  }, [route.params.repeatJob]);

  const updateFurnitureCount = (size: FurnitureSize, nextCount: number) => {
    setFurnitureCounts(counts => ({
      ...counts,
      [size]: Math.min(FURNITURE_MAX_ITEMS, Math.max(0, nextCount)),
    }));
  };

  const updateBarberCount = (cut: BarberCut, nextCount: number) => {
    setBarberCounts(counts => ({
      ...counts,
      [cut]: Math.min(BARBER_MAX_PEOPLE, Math.max(0, nextCount)),
    }));
  };

  const updateVehicleCount = (type: VehicleType, nextCount: number) => {
    setVehicleCounts(counts => ({
      ...counts,
      [type]: Math.max(0, nextCount),
    }));
  };

  // A manual booking can take offers up to the most a worker may bid over the asking price.
  const paypalHoldAmount = agentOn ? agentBudget : Math.ceil((rewardAdjustedPrice * 1.5) / 50) * 50;

  const openPayPalHold = async () => {
    setPaypalBusy(true);
    try {
      const session = await startPayPalHold(paypalHoldAmount);
      pendingHoldRef.current = session.id;
      setPaypalUrl(session.checkoutUrl);
    } catch (err) {
      setAlert({
        title: t("Couldn't open PayPal"),
        message: err instanceof Error && err.message ? err.message : t("Please check your connection and try again."),
      });
    } finally {
      setPaypalBusy(false);
    }
  };

  const finishPayPalHold = async () => {
    setPaypalUrl(null);
    const holdId = pendingHoldRef.current;
    if (!holdId) return;
    setPaypalBusy(true);
    try {
      const result = await confirmPayPal(holdId);
      if (result.status !== "succeeded") throw new Error(t("PayPal didn't approve the hold."));
      approvedHoldRef.current = holdId;
      beginOfferSearch();
    } catch (err) {
      setAlert({
        title: t("Couldn't open PayPal"),
        message: err instanceof Error && err.message ? err.message : t("Please check your connection and try again."),
      });
    } finally {
      setPaypalBusy(false);
    }
  };

  const beginOfferSearch = () => {
    if (!serviceAreaOpen) {
      setAlert({
        title: t("Area not available yet"),
        message: t(appConfig.serviceArea.unavailableMessage),
      });
      return;
    }
    // Read fresh rather than from render state: the screen only re-reads the
    // clock once a minute now, and this gate has to be exact at the boundary.
    if (FORCE_CLOSED_HOURS_PREVIEW || !isWithinOperatingHours(appConfig)) {
      setAlert({
        title: t("Bookings are closed"),
        message: t(`Operating Hours\n${formatOperatingHours(appConfig)}`),
      });
      return;
    }
    const selectedVehicleTotal = Object.values(vehicleCounts).reduce((sum, count) => sum + count, 0);
    if (service === "vehicle" && selectedVehicleTotal <= 0) {
      setAlert({
        title: t("Select a vehicle"),
        message: t("Choose at least one vehicle before finding offers."),
      });
      return;
    }
    if (service === "furniture" && furnitureCounts.Small + furnitureCounts.Big <= 0) {
      setAlert({
        title: t("Select an item"),
        message: t("Choose at least one item before finding offers."),
      });
      return;
    }
    if (service === "barber" && BARBER_CUTS.every(cut => barberCounts[cut.key] <= 0)) {
      setAlert({
        title: t("Select a service"),
        message: t("Choose at least one service before finding offers."),
      });
      return;
    }
    setPaymentOptionsOpen(false);
    if (paymentMethod === "PayPal" && !approvedHoldRef.current) {
      void openPayPalHold();
      return;
    }
    const paypalHoldId = paymentMethod === "PayPal" ? approvedHoldRef.current ?? undefined : undefined;
    approvedHoldRef.current = null;

    // Structured request data — fed to the backend as a single JSON blob so the
    // worker sees an accurate summary (rooms, cleaning type, vehicle counts).
    const details: JobDetails =
      service === "home"
        ? { service: "home", rooms, cleaningType }
        : service === "furniture"
          ? { service: "furniture", smallItems: furnitureCounts.Small, bigItems: furnitureCounts.Big }
          : service === "barber"
            ? { service: "barber", ...barberCounts }
            : {
              service: "vehicle",
              vehicles: (Object.keys(vehicleCounts) as VehicleType[])
                .filter(type => vehicleCounts[type] > 0)
                .map(type => ({ type, count: vehicleCounts[type] })),
            };
    const detail = summarizeJobDetails(
      details,
      service === "home"
        ? "Home cleaning"
        : service === "furniture"
          ? "Furniture shifting"
          : service === "barber"
            ? "Barber"
            : vehicleSummary,
      t,
    );

    // Switch to the offers screen optimistically; the job is created in the
    // background and the overlay shows the waiting UI until the id arrives.
    // Slide the booking sheet out first: switching mode unmounts it outright,
    // so without this it disappears mid-screen instead of leaving.
    setRequestDetails(details);
    setActiveJobRequest(null);
    if (activeReward) setActiveReward(null);
    expandedRef.current = false;
    initialized.current = false;
    cancelAnimation(translateY);
    translateY.value = withTiming(MAX_PANEL_H, {
      duration: 240,
      easing: Easing.in(Easing.cubic),
    });
    setTimeout(() => setMode("offers"), 210);

    // Every offer, and the acceptance that follows, reaches the customer as a
    // push. Registration otherwise only happens at launch and on login, so
    // someone who dismissed the prompt on day one waits on a screen that can
    // never update. Fired alongside creation, not after, so the token is in
    // place before the first worker can offer.
    void syncPushNotifications(settings.notificationsEnabled).catch(() => undefined);

    void (async () => {
      try {
        const customerId = await getCurrentUserId(name);
        const stored = await getStoredUser();
        const localAvatar = await getAvatar(avatarOwnerKeyFor(stored));
        const uploadedCustomerPhoto = localAvatar ? await uploadCustomerPhoto(customerId, localAvatar) : null;
        const customerPhoto = uploadedCustomerPhoto || stored?.photoUrl || null;
        const created = await createBiddingJob({
          customerId,
          customerName: name,
          customerPhoto,
          service,
          detail,
          address: location.address,
          city: "islamabad",
          coordinates: location.coordinates,
          price: rewardAdjustedPrice,
          payment: paymentMethod,
          workerPreference: gender,
          notes: "",
          details,
          rewardId: activeReward?.id,
          agentBudget: agentOn ? agentBudget : undefined,
          paypalHoldId,
        });
        setActiveJobRequest({ jobId: created.job.id, customerId });
        void saveActiveRequest({ jobId: created.job.id, customerId });
      } catch (err) {
        // Creation failed — drop back and tell the customer.
        setMode("view");
        setActiveJobRequest(null);
        setAlert({
          title: t("Couldn't post your request"),
          message:
            err instanceof Error && err.message
              ? err.message
              : t("Please check your connection and try again."),
        });
      }
    })();
  };

  // Bottom-sheet drag state — start off-screen until we know panel height
  const translateY = useSharedValue(MAX_PANEL_H);
  const panelOpacity = useSharedValue(0);
  const expandedRef = useRef(false);
  const initialized = useRef(false);
  const collapsedYRef = useRef(0);

  collapsedYRef.current = COLLAPSED_Y;

  const animateTo = (toValue: number) => {
    translateY.value = withSpring(toValue, {
      damping: 26,
      stiffness: 240,
      mass: 0.9,
    });
  };
  // Slide the sheet up from fully off-screen into its collapsed peek with a
  // soft springy bounce — played on first load and on every step switch.
  const playEntrance = (h: number, delay = 0, expanded = false) => {
    const collapsed = Math.max(0, h - peekVisibleH(step));
    expandedRef.current = expanded;
    cancelAnimation(panelOpacity);
    panelOpacity.value = 0;
    translateY.value = h; // start fully below the screen
    panelOpacity.value = withDelay(delay, withTiming(1, { duration: 120 }));
    translateY.value = withDelay(
      delay,
      withTiming(expanded ? 0 : collapsed, {
        duration: 620,
        easing: Easing.out(Easing.cubic),
      }),
    );
  };
  function hidePanelImmediately() {
    cancelAnimation(panelOpacity);
    panelOpacity.value = 0;
  }
  useEffect(() => {
    if (mode !== "view" || panelHeight <= 0 || initialized.current) return;
    initialized.current = true;
    playEntrance(panelHeight, step === "personalize" ? 450 : 0, getSheetExpanded("customer-booking", false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, panelHeight, step]);
  // The picker measures its peek after the sheet has started sliding in; aim
  // the collapsed sheet at it once it is known.
  useEffect(() => {
    if (step !== "choose" || choosePeekH <= 0 || !initialized.current || expandedRef.current) return;
    animateTo(collapsedYRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choosePeekH]);

  const expand = () => {
    expandedRef.current = true;
    setSheetExpanded("customer-booking", true);
    animateTo(0);
  };
  const collapse = () => {
    expandedRef.current = false;
    setSheetExpanded("customer-booking", false);
    animateTo(collapsedYRef.current);
  };

  const panResponder = useRef(
    PanResponder.create({
      // Let children receive taps; we only steal on actual drag movement
      onStartShouldSetPanResponder: () => false,
      // Require a clear vertical drag before stealing the gesture — a small
      // threshold (4px) was grabbing taps mid-press on the little counter
      // buttons, so onPress never fired.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 12,
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
    opacity: panelOpacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Google wordmark rides just above the sheet's visible top edge (follows drag).
  // In the personalize step it lifts higher to make room for the back button.
  const googleMarkStyle = useAnimatedStyle(() => ({
    transform: [
      // In personalize, align the wordmark's bottom with the back button's bottom.
      { translateY: SCREEN_H - panelHeight + translateY.value - 28 - 3 - (step === "personalize" ? 3 : 0) },
    ],
  }));

  // Circular back button floats just above the sheet (personalize step only).
  const [backButtonHidden, setBackButtonHidden] = useState(false);
  const backButtonStyle = useAnimatedStyle(() => {
    const backTop = SCREEN_H - panelHeight + translateY.value - FLOATING_BACK_GAP - FLOATING_BACK_SIZE;
    const hiddenAt = PERSONALIZE_PREF_BOTTOM + BACK_HIDE_CLEARANCE;
    const hideProgress = Math.max(
      0,
      Math.min(1, (hiddenAt + BACK_HIDE_DISTANCE - backTop) / BACK_HIDE_DISTANCE),
    );

    return {
      opacity: 1 - hideProgress,
      transform: [
        { translateY: backTop },
        { scale: 1 - hideProgress * 0.38 },
      ],
    };
  });

  useAnimatedReaction(
    () => {
      const backTop = SCREEN_H - panelHeight + translateY.value - FLOATING_BACK_GAP - FLOATING_BACK_SIZE;
      return backTop <= PERSONALIZE_PREF_BOTTOM + BACK_HIDE_CLEARANCE;
    },
    (hidden, wasHidden) => {
      if (hidden !== wasHidden) {
        runOnJS(setBackButtonHidden)(hidden);
      }
    },
    [SCREEN_H, panelHeight],
  );

  // ---- Tracking sheet drag state ----
  // Own measurements: the peek is measured so the job summary stays below the
  // fold.
  const [trackingPanelH, setTrackingPanelH] = useState(0);
  const [trackingPeekH, setTrackingPeekH] = useState(0);
  const TRACKING_START_CODE_PEEK_H = 92;
  const trackingExtraPeekH = completion === "none" ? TRACKING_START_CODE_PEEK_H : 0;
  const TRACKING_COLLAPSED_Y = Math.max(0, trackingPanelH - trackingPeekH - trackingExtraPeekH);

  const working = trackingJob?.workerPhase === "working" && completion === "none";
  // Starting the job takes the start code and the cancel button off the sheet.
  // Panel height is measured, so it is a frame behind that: translateY still
  // holds a resting position computed from the taller layout, and the sheet
  // drops by the difference before snapping back. Both blocks are measured
  // while they are on screen and discounted from the transform the moment they
  // leave, until the fresh measurement lands.
  const trackingStartCodeH = useRef(0);
  const trackingCancelH = useRef(0);
  const trackingPanelIsWorking = useRef(false);
  const trackingPendingTrim =
    working && !trackingPanelIsWorking.current
      ? trackingStartCodeH.current + trackingCancelH.current
      : 0;

  const trackingTranslateY = useSharedValue(SCREEN_H);
  const trackingExpandedRef = useRef(getSheetExpanded("customer-tracking", false));
  const trackingInitialized = useRef(false);
  const trackingCollapsedYRef = useRef(0);

  trackingCollapsedYRef.current = TRACKING_COLLAPSED_Y;

  // Layout effect, not a plain one: this runs in the same frame the fresh
  // measurement commits, so the transform and the content it belongs to paint
  // together.
  useLayoutEffect(() => {
    if (trackingPanelH === 0 || trackingPeekH === 0) return;
    // First settle (measurements arrive in separate passes) snaps instantly —
    // the sheet is still off-screen so there's nothing to glitch.
    if (!trackingInitialized.current) {
      trackingInitialized.current = true;
      trackingTranslateY.value = trackingExpandedRef.current ? 0 : TRACKING_COLLAPSED_Y;
    } else if (!trackingExpandedRef.current) {
      // Only the swap to the completed / rating views glides. Every other
      // height change is a phase changing the sheet's own contents — going to
      // "Work in Progress" drops the chat action, the start code and the
      // cancel button — and gliding there reads as the sheet re-opening when
      // it was already sitting there. Those snap.
      if (completion !== "none") {
        trackingTranslateY.value = withSpring(TRACKING_COLLAPSED_Y, {
          damping: 28,
          stiffness: 220,
          mass: 0.9,
        });
      } else {
        trackingTranslateY.value = TRACKING_COLLAPSED_Y;
      }
    }
  }, [TRACKING_COLLAPSED_Y, trackingPanelH, trackingPeekH, trackingTranslateY, completion]);

  const trackingAnimateTo = (toValue: number) => {
    trackingTranslateY.value = withSpring(toValue, {
      damping: 26,
      stiffness: 240,
      mass: 0.9,
    });
  };

  // Once the job is completed the sheet is locked fully open — no handle, no
  // dragging (the rating UI should always be maximized).
  const trackingLockedRef = useRef(false);
  trackingLockedRef.current = completion !== "none";

  useEffect(() => {
    if (completion !== "none") {
      trackingExpandedRef.current = true;
      trackingTranslateY.value = withSpring(0, { damping: 28, stiffness: 220, mass: 0.9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completion]);

  const trackingPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => !trackingLockedRef.current && Math.abs(g.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, g) => !trackingLockedRef.current && Math.abs(g.dy) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        cancelAnimation(trackingTranslateY);
      },
      onPanResponderMove: (_, g) => {
        const collapsedY = trackingCollapsedYRef.current;
        const base = trackingExpandedRef.current ? 0 : collapsedY;
        trackingTranslateY.value = Math.max(0, Math.min(collapsedY, base + g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const collapsedY = trackingCollapsedYRef.current;
        const base = trackingExpandedRef.current ? 0 : collapsedY;
        const final = base + g.dy;
        const expandIt = g.vy < -0.6 || (g.vy <= 0.6 && final < collapsedY / 2);
        trackingExpandedRef.current = expandIt;
        setSheetExpanded("customer-tracking", expandIt);
        trackingAnimateTo(expandIt ? 0 : collapsedY);
      },
    })
  ).current;

  const trackingPanelStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: Math.max(0, trackingTranslateY.value - trackingPendingTrim) }],
    }),
    [trackingPendingTrim],
  );

  // The demo button rides above the tracking sheet exactly as the back button
  // rides above the booking sheet — same gap, same tracking of the drag.
  const demoBarStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          SCREEN_H - trackingPanelH + Math.max(0, trackingTranslateY.value) - FLOATING_BACK_GAP - DEMO_BAR_HEIGHT,
      },
    ],
  }));

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

  const exitTracking = () => {
    setSafetyOpen(false);
    setProfileOpen(false);
    setCancelStep(null);
    cancelAnim.value = 0;
    setTrackingOffer(null);
    setTrackingJob(null);
    setTrackingWorkerLocation(null);
    setTrackingRoute(null);
    trackingRouteMetaRef.current = null;
    restoredLocationRef.current = false;
    void saveActiveRequest(null);
    setCompletion("none");
    notifiedTrackingJobRef.current = null;
    trackingInitialized.current = false;
    trackingExpandedRef.current = false;
    trackingTranslateY.value = SCREEN_H;
    setTrackingPanelH(0);
    setTrackingPeekH(0);
    setChatInstant(true);
    setMode("view");
  };

;

  const handleLogout = async () => {
    setDrawerOpen(false);
    await clearUser();
    navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] });
  };

  /**
   * Worker mode.
   *
   * Someone already verified goes straight to work — their approval lives on
   * worker_applications server-side and switching sides never touched it, so
   * asking for CNIC documents again would be asking for something we already
   * have. Anyone mid-review lands on the status screen, and anyone who has
   * never applied starts the application.
   */
  const goBecomeWorker = async () => {
    setDrawerOpen(false);
    const stored = await getStoredUser();
    const status = (stored?.onboardingStatus ?? "").toLowerCase();

    if (stored?.role === "worker" && status === "approved") {
      const user = await setActiveMode("worker");
      navigation.reset({
        index: 0,
        routes: [{ name: "WorkerHome", params: { name: user?.name ?? name } }],
      });
      return;
    }

    if (stored?.role === "worker" && status !== "") {
      await setActiveMode("worker");
      navigation.navigate("WorkerLocked", { status });
      return;
    }

    navigation.navigate("WorkerPersonalInfo", {
      uid: stored?.googleUid,
      email: stored?.email ?? "",
      name: stored?.name ?? name,
      phone: stored?.phone,
    });
  };

  const trackingArrived = trackingJob?.workerPhase === "arrived";
  const startCode = trackingJob?.startCode || "----";

  useEffect(() => {
    if (working && cancelStep) closeCancelFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working]);
  const trackingRemainingSeconds = trackingRoute ? trackingRoute.durationSeconds : 0;
  const trackingDistance = trackingRoute ? formatDistance(trackingRoute.distanceMeters, t) : "";
  const trackingTitle =
    completion !== "none"
      ? t("Job completed")
      : working
        ? t("Work in Progress")
        : trackingArrived
          ? t("Worker has arrived")
          : trackingRoute
            ? t("Worker arriving in ~{eta}", { eta: formatEta(trackingRemainingSeconds, t) })
            : t("Connecting to worker...");
  const trackingSubtitle =
    completion !== "none"
      ? t("Please rate your worker")
      : working
        ? t("Worker is cleaning now")
        : trackingArrived
          ? t("Worker at your location")
          : trackingRoute
            ? t("Live tracking - {dist} away", { dist: trackingDistance })
            : t("Waiting for worker GPS...");
  // Marker glides between the worker's sparse GPS fixes (inDrive-style)
  // instead of teleporting on each frame.
  const trackingDetails = trackingJob?.details ?? requestDetails ?? { service };
  const trackingScopeType =
    trackingDetails.service === "vehicle"
      ? "vehicle"
      : trackingDetails.service === "furniture"
        ? "furniture"
        : trackingDetails.service === "barber"
          ? "barber"
          : "home";
  const trackingServiceLabel =
    trackingScopeType === "vehicle"
      ? "Vehicle Cleaning"
      : trackingScopeType === "furniture"
        ? "Furniture Shifting"
        : trackingScopeType === "barber"
          ? "Barber"
          : "Home Cleaning";
  const trackingDetailsLabel = summarizeJobDetails(trackingDetails, t("Cleaning"), t);
  const trackingRemainingRoute = useMemo(() => {
    if (!trackingRoute) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: trackingRoute.coordinates },
    };
  }, [trackingRoute]);

  // ONE local notification per job: "your worker is on the way".
  //
  // This used to fire five different ones, and re-issue the ETA on every
  // single minute change — a 20-minute drive meant ~20 notifications, on top
  // of server pushes for "arrived" and "completed" that said the same thing
  // twice. Arrival, completion and new offers are server pushes (they reach a
  // closed app; a local notification cannot), so the only gap worth filling
  // here is the moment tracking starts.
  useEffect(() => {
    if (mode !== "tracking" || !trackingJob) return;
    if (notifiedTrackingJobRef.current === trackingJob.id) return;
    notifiedTrackingJobRef.current = trackingJob.id;

    const eta = trackingRoute ? formatEta(trackingRoute.durationSeconds, t) : null;
    showLocalNotification(
      t("Worker on the way"),
      eta
        ? t("Arriving in about {eta}. Track them live in the app.", { eta })
        : t("Track them live in the app."),
    ).catch(() => undefined);
  }, [mode, t, trackingJob, trackingRoute]);


  return (
    <View style={s.root}>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      {/* Map fills entire background — one instance for both view & edit modes.
          TextureView + fade-in: the default SurfaceView flashes white on its
          first frames and ignores opacity, so we composite as a texture and
          reveal the map only once it has fully rendered. */}
      <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navy }, mapFadeStyle]}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        androidView="texture"
        logo={false}
        onDidFinishRenderingMapFully={handleMapFullyRendered}
        attributionPosition={{ bottom: 8, left: 8 }}
        contentInset={clearChooseScreenshotUi ? { top: 0, bottom: 0 } : { top: HEADER_AREA, bottom: MAP_BOTTOM_INSET }}
        dragPan={mode === "edit" || mode === "tracking"}
        touchZoom={mode === "edit" || mode === "tracking"}
        touchRotate={false}
        touchPitch={false}
        onRegionIsChanging={handleRegionChanging}
        onRegionDidChange={handleRegionChanged}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: mapCameraCenter, zoom: clearChooseScreenshotUi ? 17.4 : 18 }}
          {...(mode === "view" || mode === "offers"
            ? {
                center: mapCameraCenter,
                // Subtle zoom-out when searching for offers; zoom in once a
                // service is chosen and we move to the personalize step.
                zoom: clearChooseScreenshotUi ? 17.4 : mode === "offers" ? 17 : step === "personalize" ? 18.6 : 17.8,
                duration: 700,
                easing: "ease" as const,
              }
            : {})}
        />
        {mode === "tracking" && trackingRemainingRoute ? (
          <GeoJSONSource id="tracking-route" data={trackingRemainingRoute}>
            <Layer
              id="tracking-route-line"
              type="line"
              beforeId="place-suburb"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": colors.accent, "line-width": 4.5 }}
            />
          </GeoJSONSource>
        ) : null}
        {mode === "tracking" ? (
          <ViewAnnotation id="tracking-customer" lngLat={location.coordinates}>
            <View style={ts.homeMarker}>
              <House size={18} color={colors.paper} weight="fill" />
            </View>
          </ViewAnnotation>
        ) : null}
        {mode === "tracking" && trackingWorkerLocation ? (
          <SmoothedMarker id="tracking-worker" target={trackingWorkerLocation}>
            <View style={ts.workerMarker}>
              <Broom size={18} color={colors.paper} weight="fill" />
            </View>
          </SmoothedMarker>
        ) : null}
      </Map>
      </Reanimated.View>

      {/* Subtle veil to lift the dark map */}
      <View style={[s.mapLighten, { pointerEvents: "none" }]} />

      {/* Google attribution (geocoding by Google) — bottom-left, above the sheet */}
      {mode === "view" && !clearChooseScreenshotUi ? (
        <Reanimated.View style={[s.googleMark, googleMarkStyle]} pointerEvents="none">
          <SvgXml xml={GOOGLE_MARK_SVG} width={74} height={28} />
        </Reanimated.View>
      ) : null}

      {/* Circular back button — floats above the sheet, below the Google mark */}
      {mode === "view" && step === "personalize" ? (
        <Reanimated.View
          style={[s.floatingBack, backButtonStyle]}
          pointerEvents={backButtonHidden ? "none" : "auto"}
        >
          <TouchableOpacity
            style={s.floatingBackBtn}
            onPress={backToChoose}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={22} color={colors.white} weight="bold" />
          </TouchableOpacity>
        </Reanimated.View>
      ) : null}

      {/* Searching radar pulse — rendered before the pin so it stays underneath */}
      {mode === "offers" ? <RadarPulse pinPointY={PIN_POINT_Y} /> : null}

      {/* Fixed pin at the inset camera center — camera is always centered on the
          selected location in view mode, so the pin never visually jumps */}
      {mode !== "tracking" && !clearChooseScreenshotUi ? (
        <View style={[s.pinAnchor, { top: PIN_POINT_Y, pointerEvents: "none" }]}>
          <LocationPin />
        </View>
      ) : null}

      {/* Tap-outside catcher to dismiss the worker-preference dropdown */}
      {showViewTopUi && prefOpen ? (
        <TouchableOpacity
          style={s.prefBackdrop}
          activeOpacity={1}
          onPress={() => setPrefOpen(false)}
        />
      ) : null}

      {/* Floating header */}
      {/* Compact glass top bar (view mode): address + worker preference, with
          the same gradient / orb / pattern / frost treatment as the sheet. */}
      {showViewTopUi ? (
        <FadeInView style={s.topArea} delay={0} duration={600}>
          <View style={s.topRow}>
            {!clearChooseScreenshotUi ? (
              <TouchableOpacity
                style={s.menuPill}
                onPress={() => setDrawerOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.85}
              >
                <List size={22} color={colors.white} weight="bold" />
              </TouchableOpacity>
            ) : null}

            {step === "choose" && !clearChooseScreenshotUi ? (
              // Cross-fades with the location pill it shares this slot with,
              // on the same timings: the incoming one waits out the outgoing
              // one's 250ms. The wrapper is a ROW, not the location pill's
              // column — topHoursPill sizes its height from its content, and
              // under a column parent its own `flex: 1` would resolve against
              // the vertical axis and clip it to minHeight.
              <Reanimated.View
                style={{ flex: 1, flexDirection: "row" }}
                entering={FadeIn.duration(300).delay(260)}
                exiting={FadeOut.duration(250)}
              >
              <View style={[s.topHoursPill, !bookingOpen && s.topHoursPillClosed]}>
                {!bookingOpen ? <ClosedHoursBorder color={colors.danger} /> : null}
                <Clock size={16} color={bookingOpen ? colors.accent : colors.white} weight="fill" />
                {/* Laid out as sibling <Text> rows rather than one <Text> with
                    nested children: on Android, swapping the nested children's
                    content after first paint (which now happens as soon as the
                    fetched operating hours differ from the bundled defaults)
                    collapses the text layout and leaves an empty black pill
                    until the screen is remounted. */}
                <View style={s.topHoursCopy}>
                  <Text style={[s.topHoursLine, fontStyles.semiBold]} numberOfLines={1}>
                    {t("Operating Hours")}
                  </Text>
                  <View style={s.topHoursRow}>
                    <Text style={[s.topHoursLine, fontStyles.semiBold]} numberOfLines={1}>
                      {t("Open: ")}
                    </Text>
                    <Text style={[s.topHoursLine, s.topHoursHighlight, fontStyles.bold]} numberOfLines={1}>
                      {operatingOpenText}
                    </Text>
                    <Text style={[s.topHoursLine, s.topHoursGap, fontStyles.semiBold]} numberOfLines={1}>
                      {t("  Close: ").trim()}
                    </Text>
                    <Text style={[s.topHoursLine, s.topHoursHighlight, fontStyles.bold]} numberOfLines={1}>
                      {operatingCloseText}
                    </Text>
                  </View>
                </View>
              </View>
              </Reanimated.View>
            ) : null}

            {step === "personalize" || clearChooseScreenshotUi ? (
              <Reanimated.View
                style={{ flex: 1 }}
                entering={FadeIn.duration(300).delay(260)}
                exiting={FadeOut.duration(250)}
              >
                <TouchableOpacity style={s.locationPill} activeOpacity={0.85} onPress={enterEditMode}>
                  <MapPin size={20} color={colors.accent} weight="fill" />
                  <Text style={[s.locationText, fontStyles.semiBold]} numberOfLines={1}>
                    {location.address}
                  </Text>
                  <View style={s.locationEditBtn}>
                    <PencilSimple size={15} color={colors.white} weight="bold" />
                  </View>
                </TouchableOpacity>
              </Reanimated.View>
            ) : null}
          </View>

          {step === "choose" && !clearChooseScreenshotUi && launchWindow.active ? (
            <View style={s.topLaunchPill}>
              <View style={s.topLaunchIcon}>
                <Gift size={17} color={colors.white} weight="fill" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.topLaunchTitle, fontStyles.bold]} numberOfLines={1}>
                  {t("Gift Ending In:")} <LaunchCountdown endsAt={launchWindow.endsAt} t={t} />
                </Text>
                <Text style={[s.topLaunchCopy, fontStyles.medium]} numberOfLines={2}>
                  {t("Customers receive ")}
                  <Text style={[s.topLaunchHighlight, fontStyles.bold]}>
                    {t("50% discount on bookings")}
                  </Text>
                  {t(" during the launch month.")}
                </Text>
              </View>
            </View>
          ) : null}

          {step === "personalize" ? (
          <Reanimated.View
            style={s.prefAnchor}
            entering={FadeIn.duration(300).delay(260)}
            exiting={FadeOut.duration(250)}
          >
            <TouchableOpacity
              style={s.prefBubble}
              activeOpacity={0.85}
              onPress={() => setPrefOpen(o => !o)}
            >
              <Text style={[s.prefBubbleLabel, fontStyles.medium]}>
                {t("Worker Preference")}
              </Text>
              <View style={[s.prefValuePill, prefOpen && s.prefValuePillOpen]}>
                <Text style={[s.prefBubbleValue, fontStyles.semiBold]}>{t(gender)}</Text>
                <CaretDown size={12} color={colors.white} weight="bold" />
              </View>
            </TouchableOpacity>

            {prefOpen ? (
              <Reanimated.View style={s.prefDropdown}>
                {(["Male", "Female", "Any"] as Gender[]).map(g => {
                  const active = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[s.prefOption, active && s.prefOptionActive]}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (g === "Female" && appConfig.workerPreference.femaleLocked) {
                          setPrefOpen(false);
                          setAlert({
                            title: t("Coming soon"),
                            message: t(appConfig.workerPreference.femaleLockedMessage),
                          });
                          return;
                        }
                        setGender(g);
                        setPrefOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          s.prefOptionText,
                          active && s.prefOptionTextActive,
                          fontStyles.semiBold,
                        ]}
                      >
                        {t(g)}
                      </Text>
                      {active ? <Check size={14} color={colors.white} weight="bold" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </Reanimated.View>
            ) : null}
          </Reanimated.View>
          ) : null}
        </FadeInView>
      ) : null}

      {mode === "edit" ? (
        <FadeInView style={s.topArea} delay={0} duration={600}>
          <View style={s.topRow}>
            <TouchableOpacity
              style={s.menuPill}
              onPress={cancelEditMode}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.85}
            >
              <ArrowLeft size={22} color={colors.white} weight="bold" />
            </TouchableOpacity>
            <View style={s.searchInputRow}>
              <MagnifyingGlass size={18} color={colors.white} weight="bold" />
              <TextInput
                style={[s.searchInput, fontStyles.medium]}
                placeholder={t("Search for a place…")}
                placeholderTextColor={colors.whiteSubtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={clearSearch}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={16} color={colors.white} weight="bold" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </FadeInView>
      ) : null}

      {/* Draggable bottom panel — anchored at action bar, sized to content.
          No offscreen rasterization here: flattening this tall panel into a GPU
          texture clips its right edge, leaking the dark map through (obvious in
          light mode). The drag is a UI-thread transform, so it stays smooth. */}
      {showViewUi ? (
      <Reanimated.View
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          setPanelHeight(h);
          if (h > 0 && !initialized.current) {
            initialized.current = true;
            // Personalize: let the Find Offers block + top fades play first,
            // then slide the sheet up. Choose/first load slides immediately.
            playEntrance(h, step === "personalize" ? 450 : 0, getSheetExpanded("customer-booking", false));
          }
        }}
        {...panResponder.panHandlers}
        style={[
          s.panel,
          {
            bottom: 0,
            width: SCREEN_W,
            maxHeight: MAX_PANEL_H,
          },
          panelAnimatedStyle,
        ]}
      >
        {/* ---- Step 1: Choose a service ---- */}
        {step === "choose" ? (
          <>
            <View
              style={s.sheetPart}
              onLayout={e => {
                const { y, height } = e.nativeEvent.layout;
                // The shifting card is the last thing in this part, above the
                // services padding.
                const cardH = StyleSheet.flatten(s.tabCard).height as number;
                const servicesPad = StyleSheet.flatten(s.partServices).paddingBottom as number;
                choosePeekRef.current = Math.round(y + height - servicesPad - cardH * 0.25);
                setChoosePeekH(choosePeekRef.current);
              }}
            >
              <View style={s.dragArea}>
                <View style={s.dragHandle} />
              </View>
              <View style={s.partServices}>
                <View style={s.chooseHeader}>
                  <View style={s.chooseTitleRow}>
                    <View style={s.chooseAccentLine} />
                    <Text style={[s.chooseTitle, fontStyles.bold]}>
                      {t("What do you need done?")}
                    </Text>
                    <View style={s.chooseAccentLine} />
                  </View>
                </View>
                <View style={s.tabsGrid}>
                  <View style={s.tabsRow}>
                    <ServiceTab
                      label={t("Home Services")}
                      subtitle={t("Rooms, dusting & deep clean")}
                      underlay={require("../assets/images/HomeServicesPattern.webp")}
                      underlayStyle={s.homePatternBg}
                      background={require("../assets/images/HomeServicesIcon.webp")}
                      bgStyle={s.homeArtBg}
                      selected={service === "home"}
                      heavy
                      onPress={() => chooseService("home")}
                    />
                    <ServiceTab
                      label={t("Vehicle Services")}
                      subtitle={t("Car, bike & van wash")}
                      underlay={require("../assets/images/ShiftingServicesPattern.webp")}
                      background={require("../assets/images/VehicleServicesIcon.webp")}
                      bgStyle={s.vehicleArtBg}
                      bgResize="contain"
                      selected={service === "vehicle"}
                      heavy
                      onPress={() => chooseService("vehicle")}
                    />
                  </View>
                  <View style={s.tabsRow}>
                    <ServiceTab
                      label={t("Shifting Services")}
                      subtitle={t("Beds, sofas, TVs & more")}
                      underlay={require("../assets/images/ShiftingServicesPattern.webp")}
                      background={require("../assets/images/ShiftingServicesIcon.webp")}
                      bgStyle={s.furnitureTabBg}
                      bgResize="contain"
                      selected={service === "furniture"}
                      heavy
                      onPress={() => chooseService("furniture")}
                    />
                    <ServiceTab
                      label={t("Barber Services")}
                      subtitle={t("Haircut & beard")}
                      underlay={require("../assets/images/BarberServicesPattern.webp")}
                      background={require("../assets/images/BarberServicesIcon.webp")}
                      bgStyle={s.barberTabBg}
                      bgResize="contain"
                      selected={service === "barber"}
                      heavy
                      onPress={() => chooseService("barber")}
                    />
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[s.sheetPart, s.sheetPartGap, s.sheetPartBottom, s.learnCard]}
              activeOpacity={1}
              onPress={() => navigation.navigate("ServicesInfo")}
            >
              <View style={s.learnIcon}>
                <Info size={20} color={colors.accent} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.learnTitle, fontStyles.bold]}>
                  {t("Learn about our services")}
                </Text>
                <Text style={[s.learnSubtitle, fontStyles.medium]} numberOfLines={2}>
                  {t("How Doyo works, pricing & what to expect")}
                </Text>
              </View>
              <ArrowRight size={20} color={colors.white} weight="bold" />
            </TouchableOpacity>
          </>
        ) : null}

        {/* ---- Step 2: Personalize ---- */}
        {step === "personalize" ? (
        <View style={[s.sheetPart, s.sheetPartBottom]}>
          <View style={s.dragArea}>
            <View style={s.dragHandle} />
          </View>
          {/* The actions bar floats over the sheet, so the content reserves
              exactly its height — more is dead space, less hides content
              behind it. Derived, not measured: measuring changes the sheet's
              height after the entrance animation has begun, which flashes it
              at full height on the first open.

              1 border + 14 padTop + 30 auto-accept row + 12 gap + 52 button
              + 22 padBottom = 131, plus 52 (40 minHeight + 12 gap) for each
              optional row the bar can grow by, plus 16 so the last card is not
              flush against the bar. */}
          <View
            style={[
              s.partContent,
              {
                paddingBottom:
                  131 + 16 + (launchDiscountActive ? 52 : 0) + (activeReward ? 52 : 0),
              },
            ]}
          >

          <View style={s.serviceOptions}>
            <View style={s.personalizeHeader}>
              <View style={s.personalizeTitleRow}>
                <View style={s.sparkleCluster}>
                  <View style={s.sparkleSmall}>
                    <Sparkle size={9} color={colors.accent} weight="fill" />
                  </View>
                  <View style={s.sparkleBig}>
                    <Sparkle size={15} color={colors.accent} weight="fill" />
                  </View>
                </View>
                <Text style={[s.personalizeTitle, fontStyles.semiBold]}>
                  {t("Personalize Your Service")}
                </Text>
              </View>
              <Text style={[s.personalizeSubtitle, fontStyles.medium]}>
                {t("Select your preferences for a better experience")}
              </Text>
            </View>

            {service === "home" ? (
              <>
                <View style={s.section}>
                  <CardPatches extraWhite />
                  <View>
                    <Text style={[s.sectionTitle, fontStyles.semiBold]}>{t("Cleaning Type")}</Text>
                    <Text style={[s.sectionSubtitle, fontStyles.medium]}>{t("Choose the level of cleaning you need")}</Text>
                  </View>
                  <View style={s.chipsRow}>
                    {(["Regular", "Deep"] as CleaningType[]).map(c => (
                      <Chip key={c} label={t(c)} active={cleaningType === c} onPress={() => setCleaningType(c)} />
                    ))}
                  </View>
                </View>

                <View style={s.section}>
                  <CardPatches hideDark extraWhiteBottom />
                  <View>
                    <Text style={[s.sectionTitle, fontStyles.semiBold]}>{t("Home Size")}</Text>
                    <Text style={[s.sectionSubtitle, fontStyles.medium]}>{t("Choose the number of rooms you need cleaned")}</Text>
                  </View>
                  <View style={s.counterRow}>
                    <TouchableOpacity
                      style={[s.counterBtn, rooms <= HOME_MIN_ROOMS && s.counterBtnDisabled]}
                      onPress={() => setRooms(r => Math.max(HOME_MIN_ROOMS, r - 1))}
                      activeOpacity={rooms <= HOME_MIN_ROOMS ? 1 : 0.85}
                      disabled={rooms <= HOME_MIN_ROOMS}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Minus size={16} color={colors.white} weight="bold" />
                    </TouchableOpacity>
                    <Text style={[s.counterValue, fontStyles.medium]}>{rooms}</Text>
                    <TouchableOpacity
                      style={s.counterBtn}
                      onPress={() => setRooms(r => r + 1)}
                      activeOpacity={0.85}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Plus size={16} color={colors.white} weight="bold" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : service === "barber" ? (
              <View style={s.section}>
                <CardPatches />
                <View>
                  <Text style={[s.sectionTitle, fontStyles.semiBold]}>{t("Barber at Home")}</Text>
                  <Text style={[s.sectionSubtitle, fontStyles.medium]}>{t("Set how many people need each service")}</Text>
                </View>
                <View style={s.vehicleRows}>
                  {BARBER_CUTS.map(cut => (
                    <VehicleQuantityRow
                      key={cut.key}
                      typeLabel={t(cut.label)}
                      count={barberCounts[cut.key]}
                      onToggle={() => updateBarberCount(cut.key, barberCounts[cut.key] > 0 ? 0 : 1)}
                      onDecrement={() => updateBarberCount(cut.key, barberCounts[cut.key] - 1)}
                      onIncrement={() => updateBarberCount(cut.key, barberCounts[cut.key] + 1)}
                    />
                  ))}
                </View>
              </View>
            ) : service === "furniture" ? (
              <View style={s.section}>
                <CardPatches />
                <View>
                  <Text style={[s.sectionTitle, fontStyles.semiBold]}>{t("Items to Move")}</Text>
                  <Text style={[s.sectionSubtitle, fontStyles.medium]}>{t("Set how many big and small items need moving")}</Text>
                </View>
                <View style={s.vehicleRows}>
                  {(["Big", "Small"] as FurnitureSize[]).map(size => (
                    <React.Fragment key={size}>
                      <VehicleQuantityRow
                        typeLabel={t(size === "Big" ? "Big items" : "Small items")}
                        count={furnitureCounts[size]}
                        onToggle={() => updateFurnitureCount(size, furnitureCounts[size] > 0 ? 0 : 1)}
                        onDecrement={() => updateFurnitureCount(size, furnitureCounts[size] - 1)}
                        onIncrement={() => updateFurnitureCount(size, furnitureCounts[size] + 1)}
                      />
                      <View style={s.infoPill}>
                        <Info size={13} color={colors.ink} weight="bold" />
                        <Text style={[s.infoText, fontStyles.medium]} numberOfLines={1}>
                          {t(size === "Big" ? "Beds, sofas, wardrobes, dining tables" : "Chairs, side tables, TVs, boxes")}
                        </Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </View>
            ) : (
              <>
                <View style={s.section}>
                  <CardPatches />
                  <View>
                    <Text style={[s.sectionTitle, fontStyles.semiBold]}>{t("Vehicles to Clean")}</Text>
                    <Text style={[s.sectionSubtitle, fontStyles.medium]}>{t("Select each vehicle type and set the quantity")}</Text>
                  </View>
                  <View style={s.vehicleRows}>
                    {(["Car", "Bike", "Van"] as VehicleType[]).map(v => (
                      <VehicleQuantityRow
                        key={v}
                        typeLabel={t(v)}
                        count={vehicleCounts[v]}
                        onToggle={() => updateVehicleCount(v, vehicleCounts[v] > 0 ? 0 : 1)}
                        onDecrement={() => updateVehicleCount(v, vehicleCounts[v] - 1)}
                        onIncrement={() => updateVehicleCount(v, vehicleCounts[v] + 1)}
                      />
                    ))}
                  </View>
                  <View style={s.infoPill}>
                    <Info size={13} color={colors.ink} weight="bold" />
                    <Text style={[s.infoText, fontStyles.medium]} numberOfLines={1}>
                      {t("Selected:")} {vehicleSummary}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View>
            <TouchableOpacity
              style={s.priceRow}
              activeOpacity={0.85}
              onPress={() => setPriceInputVisible(true)}
            >
              <View style={{ flex: 1 }}>
                <Reanimated.View
                  key={`${rewardAdjustedPrice}-${price === recommendedPrice ? "recommended" : "custom"}`}
                  entering={FadeInDown.duration(170)}
                  exiting={FadeOutUp.duration(120)}
                >
                  <Text style={[s.priceTitle, fontStyles.semiBold]} numberOfLines={1}>
                    PKR{rewardAdjustedPrice}{" "}
                    <Text style={s.priceTag}>
                      {price === recommendedPrice ? t("(Recommended Price)") : t("(Your Price)")}
                    </Text>
                  </Text>
                </Reanimated.View>
                <Text style={[s.priceSub, fontStyles.medium]}>{t("Tap to offer your price")}</Text>
                {activeReward ? (
                  <Text style={[s.rewardAppliedText, fontStyles.semiBold]}>
                    {t("{reward} applied", { reward: activeReward.label })}
                  </Text>
                ) : null}
              </View>
              <PencilSimple size={20} color={colors.white} weight="bold" />
            </TouchableOpacity>
          </View>
        </View>
        </View>
        ) : null}
      </Reanimated.View>
      ) : null}

      {/* Bottom actions — only while personalizing a chosen service */}
      {showViewUi && step === "personalize" ? (
      <View style={s.actionsBar}>
        <View style={s.autoAcceptRow}>
          <Sparkle size={20} color={colors.accent} weight="fill" />
          <TouchableOpacity
            style={s.agentBudgetTap}
            activeOpacity={0.8}
            disabled={!agentOn}
            onPress={() => setAgentBudgetInputVisible(true)}
          >
            <Text style={[s.autoAcceptText, fontStyles.medium]} numberOfLines={1}>
              {agentOn ? `${t("Doyo negotiates, up to")} PKR${agentBudget}` : t("Let Doyo negotiate for me")}
            </Text>
            {agentOn ? <PencilSimple size={15} color={colors.accent} weight="bold" /> : null}
          </TouchableOpacity>
          <Toggle value={agentOn} onValueChange={setAgentOn} />
        </View>

        {launchDiscountActive ? (
          <View style={s.appliedRewardBar}>
            <Ticket size={16} color={colors.accent} weight="fill" />
            <Text style={[s.appliedRewardText, fontStyles.semiBold]} numberOfLines={1}>
              {t("50% launch discount applied")}
            </Text>
          </View>
        ) : null}

        {activeReward ? (
            <TouchableOpacity
              style={s.appliedRewardBar}
              activeOpacity={0.86}
              onPress={() => setActiveReward(null)}
            >
              <Ticket size={16} color={colors.accent} weight="fill" />
              <Text style={[s.appliedRewardText, fontStyles.semiBold]} numberOfLines={1}>
                {t(activeReward.label)} {t("applied")}
              </Text>
              <X size={15} color={colors.whiteSubtle} weight="bold" />
            </TouchableOpacity>
          ) : null}

        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.cashButton}
            activeOpacity={0.85}
            onPress={() => setPaymentOptionsOpen(true)}
          >
            <PaymentGlyph method={paymentMethod} size={26} />
            <Text style={[s.cashText, fontStyles.semiBold]} numberOfLines={1}>
              {t(paymentMethod)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.findButton}
            activeOpacity={0.9}
            disabled={paypalBusy}
            onPress={beginOfferSearch}
          >
            <Text style={[s.findText, fontStyles.semiBold]}>
              {paypalBusy ? t("Opening PayPal") : agentOn ? t("Let Doyo Book") : t("Find Offers")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      ) : null}

      {/* Edit-location overlays */}
      {mode === "edit" ? (
        <>
          {searchResults.length > 0 ? (
            <Reanimated.View
              style={s.searchWrap}
              entering={FadeInDown.duration(220)}
              exiting={FadeOutUp.duration(160)}
              layout={LinearTransition.duration(200)}
            >
              <View style={s.searchResults}>
                {searchResults.map((result, index) => (
                  <Reanimated.View
                    key={result.id}
                    entering={FadeInDown.delay(index * 45).duration(200)}
                    exiting={FadeOutUp.duration(140)}
                    layout={LinearTransition.duration(200)}
                  >
                    <TouchableOpacity
                      style={[s.searchResultRow, index > 0 && s.searchResultDivider]}
                      activeOpacity={0.85}
                      onPress={() => selectSearchResult(result)}
                    >
                      <MapPin size={16} color={colors.accent} weight="fill" />
                      <Text
                        style={[s.searchResultText, fontStyles.medium]}
                        numberOfLines={1}
                      >
                        {result.label}
                      </Text>
                    </TouchableOpacity>
                  </Reanimated.View>
                ))}
              </View>
            </Reanimated.View>
          ) : null}

          <FadeInView
            style={s.editBottomStack}
            delay={120}
            duration={420}
          >
            <View style={[s.locateButton, s.locateButtonInStack, { marginBottom: SCREEN_H * 0.03 - 10 }]}>
              <TouchableOpacity
                onPress={locateMe}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <GpsFix size={22} color={colors.accent} weight="bold" />
                )}
              </TouchableOpacity>
            </View>

            <View style={[s.editCard, s.editCardInStack]}>
              <View style={s.editAddressRow}>
                <MapPin size={20} color={colors.accent} weight="fill" />
                {editAddress ? (
                  <Text style={[s.editAddressText, fontStyles.medium]} numberOfLines={2}>
                    {editAddress}
                  </Text>
                ) : (
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={[s.editAddressText, fontStyles.medium]}>
                      {t("Finding address…")}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[s.confirmButton, !editAddress && s.confirmButtonDisabled]}
                activeOpacity={0.9}
                disabled={!editAddress}
                onPress={confirmEditLocation}
              >
                <Text style={[s.confirmText, fontStyles.semiBold]}>{t("Confirm location")}</Text>
              </TouchableOpacity>

              <View style={s.dragHintRow}>
                <HandGrabbing size={14} color={colors.fgFaint} weight="bold" />
                <Text style={[s.dragHintText, fontStyles.medium]}>
                  {t("Drag the map to fine-tune your pin")}
                </Text>
              </View>
            </View>
          </FadeInView>
        </>
      ) : null}

      {mode === "tracking" && trackingOffer && activeJobRequest && completion === "none" ? (
        <DemoFlowBar
          actorId={activeJobRequest.customerId}
          role="customer"
          style={demoBarStyle}
        />
      ) : null}

      {mode === "tracking" && trackingOffer ? (
        <Reanimated.View
          renderToHardwareTextureAndroid
          needsOffscreenAlphaCompositing
          onLayout={e => {
            trackingPanelIsWorking.current = working;
            setTrackingPanelH(e.nativeEvent.layout.height);
          }}
          {...trackingPanResponder.panHandlers}
          style={[ts.sheet, { maxHeight: TRACKING_MAX_PANEL_H }, trackingPanelStyle]}
        >
          {completion === "none" ? (
            <>
              <View
                onLayout={e => setTrackingPeekH(Math.ceil(e.nativeEvent.layout.height))}
              >
                <View style={ts.handleArea}>
                  <View style={ts.handle} />
                </View>

                <View style={ts.trackingTitleRow}>
                  <Text style={[ts.title, ts.trackingTitleInline, fontStyles.bold]} numberOfLines={1}>
                    {trackingTitle}
                  </Text>
                </View>

                <View style={ts.liveRow}>
                  <View style={ts.liveDot} />
                  <Text style={[ts.liveSubText, fontStyles.medium]} numberOfLines={1}>
                    {trackingSubtitle}
                  </Text>
                </View>

                <View style={ts.divider} />

                <View style={ts.actionsRow}>
                  <TouchableOpacity
                    style={ts.actionItem}
                    activeOpacity={0.85}
                    onPress={() => setProfileOpen(true)}
                  >
                      <View>
                      <TrackingAvatar photo={trackingOffer.photo} gender={trackingOffer.avatar} />
                      <View style={ts.ratingBadge}>
                        <Star size={10} color="#ffd400" weight="fill" />
                        <Text style={[ts.ratingBadgeText, fontStyles.semiBold]}>
                          {trackingOffer.rating}
                        </Text>
                      </View>
                    </View>
                    <Text style={[ts.actionLabel, fontStyles.semiBold]} numberOfLines={1}>
                      {trackingOffer.name.split(" ")[0]}
                    </Text>
                  </TouchableOpacity>

                  {/* Once cleaning is underway, contacting/cancelling is no longer
                      relevant — drop the contact action and keep just Safety. */}
                  {!working ? (
                    <TouchableOpacity
                      style={ts.actionItem}
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate("Chat", {
                          workerName: trackingOffer.name,
                          jobId: activeJobRequest?.jobId,
                          actorId: activeJobRequest?.customerId,
                          actorRole: "customer",
                          peerPhoto: trackingOffer.photo,
                        })
                      }
                    >
                      <View style={ts.actionCircle}>
                        <PhoneCall size={24} color={colors.white} weight="fill" />
                        <UnreadBadge count={unreadChat} />
                      </View>
                      <Text style={[ts.actionLabel, fontStyles.semiBold]}>{t("Contact worker")}</Text>
                    </TouchableOpacity>
                  ) : null}

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

                  <TouchableOpacity
                    style={ts.actionItem}
                    activeOpacity={0.85}
                    onPress={() => setSafetyOpen(true)}
                  >
                    <View style={ts.actionCircle}>
                      <ShieldCheck size={24} color={colors.white} weight="fill" />
                    </View>
                    <Text style={[ts.actionLabel, fontStyles.semiBold]}>{t("Safety")}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Unconditional: both phases showed exactly one of these, and
                  keeping it outside the branch is what lets the block below
                  measure as the whole of what "working" removes. */}
              <View style={ts.divider} />

              {/* Once cleaning is underway the start code is pointless — hide it */}
              {!working ? (
                <View
                  onLayout={e => {
                    trackingStartCodeH.current = Math.ceil(e.nativeEvent.layout.height);
                  }}
                >
                  <View style={ts.startCodeBox}>
                    <Text style={[ts.startCodeLabel, fontStyles.medium]}>{t("Start code")}</Text>
                    <Text style={[ts.startCodeValue, fontStyles.bold]}>{startCode}</Text>
                    <Text style={[ts.startCodeHint, fontStyles.medium]}>
                      {t("Give this code to the worker when they arrive.")}
                    </Text>
                  </View>
                </View>
              ) : null}
              <View style={ts.summaryTitlePill}>
                <Text style={[ts.summaryTitleInside, fontStyles.bold]}>{t("Job Summary")}</Text>
              </View>
              <View style={ts.summaryCard}>
                <TrackingSummaryRow label={t("Worker")} value={trackingOffer.name} fonts={fonts} />
                <TrackingSummaryRow label={t("Service")} value={t(trackingServiceLabel)} fonts={fonts} />
                <TrackingSummaryRow label={t("Details")} value={trackingDetailsLabel} fonts={fonts} />
                <TrackingSummaryRow label={t("Payment")} value={t(paymentMethod)} fonts={fonts} />
                <TrackingSummaryRow label={t("Price")} value={`PKR${trackingOffer.price}`} fonts={fonts} />
              </View>

              {working ? null : (
                <View
                  onLayout={e => {
                    trackingCancelH.current = Math.ceil(e.nativeEvent.layout.height);
                  }}
                >
                  <TouchableOpacity
                    style={ts.cancelJobButton}
                    activeOpacity={0.88}
                    onPress={openCancelFlow}
                  >
                    <Text style={[ts.cancelJobText, fontStyles.semiBold]}>{t("Cancel request")}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={ts.lockedTopPad}>
              {completion === "completed" ? (
                <JobCompletedContent
                  subtitle={t("{name} finished the job. Your space is sparkling clean.", { name: trackingOffer.name.split(" ")[0] })}
                  rows={[
                    { label: t("Worker"), value: trackingOffer.name },
                    { label: t("Service"), value: t(trackingServiceLabel) },
                    { label: t("Payment"), value: t(paymentMethod) },
                    { label: paymentMethod === "PayPal" ? t("Charged to PayPal") : t("Total due"), value: `PKR${trackingOffer.price}`, highlight: true },
                  ]}
                  rateLabel={t("Rate {name}", { name: trackingOffer.name.split(" ")[0] })}
                  onRate={() => setCompletion("rating")}
                />
              ) : (
                <RateWorkerContent
                  name={trackingOffer.name}
                  gender={trackingOffer.avatar}
                  showCompliments
                  onSend={async (rating, compliments) => {
                    const workerFirst = trackingOffer.name.split(" ")[0];
                    if (activeJobRequest) {
                      await submitJobRating(
                        activeJobRequest.jobId,
                        activeJobRequest.customerId,
                        "customer",
                        rating,
                        compliments,
                      ).catch(() => undefined);
                    }
                    exitTracking();
                    setAlert({
                      title: t("Thanks for your feedback!"),
                      message: t("Your rating helps {name} and keeps Doyo great.", { name: workerFirst }),
                    });
                  }}
                />
              )}
            </View>
          )}
        </Reanimated.View>
      ) : null}

      {/* Cancel flow — confirm, then pick a reason */}
      {mode === "tracking" && trackingOffer && cancelStep ? (
        <View style={ts.cancelOverlay}>
          <Reanimated.View
            renderToHardwareTextureAndroid
            needsOffscreenAlphaCompositing
            style={[ts.cancelScrim, cancelOverlayStyle]}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeCancelFlow}
          />
          <Reanimated.View
            renderToHardwareTextureAndroid
            needsOffscreenAlphaCompositing
            layout={LinearTransition.duration(240)}
            style={[ts.cancelSheet, cancelSheetStyle]}
          >
            {cancelStep === "confirm" ? (
              <Reanimated.View key="confirm" entering={FadeInDown.duration(220)}>
                <View style={ts.cancelAvatarWrap}>
                  <TrackingAvatar photo={trackingOffer.photo} gender={trackingOffer.avatar} />
                  <View style={ts.ratingBadge}>
                    <Star size={10} color="#ffd400" weight="fill" />
                    <Text style={[ts.ratingBadgeText, fontStyles.semiBold]}>
                      {trackingOffer.rating}
                    </Text>
                  </View>
                </View>

                <Text style={[ts.cancelTitle, fontStyles.bold]} numberOfLines={1}>
                  {trackingTitle}
                </Text>
                <Text style={[ts.cancelSubtitle, fontStyles.medium]}>
                  {t("Sure you want to cancel?")}
                </Text>

                <View style={ts.cancelActionsRow}>
                  <TouchableOpacity
                    style={ts.actionItem}
                    activeOpacity={0.85}
                    onPress={() => {
                      closeCancelFlow();
                      navigation.navigate("Chat", {
                        workerName: trackingOffer.name,
                        jobId: activeJobRequest?.jobId,
                        actorId: activeJobRequest?.customerId,
                        actorRole: "customer",
                        peerPhoto: trackingOffer.photo,
                      });
                    }}
                  >
                    <View style={ts.actionCircle}>
                      <PhoneCall size={24} color={colors.white} weight="fill" />
                      <UnreadBadge count={unreadChat} />
                    </View>
                    <Text style={[ts.actionLabel, fontStyles.semiBold]}>{t("Contact worker")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={ts.actionItem}
                    activeOpacity={0.85}
                    onPress={() => setCancelStep("reason")}
                  >
                    <View style={ts.cancelCircle}>
                      <X size={24} color={colors.ink} weight="bold" />
                    </View>
                    <Text style={[ts.actionLabel, fontStyles.semiBold]}>{t("Cancel job")}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={ts.waitButton} activeOpacity={0.9} onPress={closeCancelFlow}>
                  <Text style={[ts.waitButtonText, fontStyles.semiBold]}>
                    {t("Wait for worker")}
                  </Text>
                </TouchableOpacity>
              </Reanimated.View>
            ) : (
              <Reanimated.View key="reason" entering={FadeInDown.duration(220)}>
                <Text style={[ts.cancelTitle, fontStyles.bold]}>
                  {t("Why do you want to cancel?")}
                </Text>

                <View style={ts.reasonList}>
                  {CANCEL_REASONS.map((reason, index) => (
                    <TouchableOpacity
                      key={reason}
                      style={[ts.reasonRow, index > 0 && ts.reasonDivider]}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (activeJobRequest) {
                          cancelBiddingJob(activeJobRequest.jobId, activeJobRequest.customerId, "customer", reason).finally(exitTracking);
                        } else {
                          exitTracking();
                        }
                      }}
                    >
                      <Text style={[ts.reasonText, fontStyles.medium]}>{t(reason)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={ts.waitButton} activeOpacity={0.9} onPress={closeCancelFlow}>
                  <Text style={[ts.waitButtonText, fontStyles.semiBold]}>
                    {t("Continue job")}
                  </Text>
                </TouchableOpacity>
              </Reanimated.View>
            )}
          </Reanimated.View>
        </View>
      ) : null}

      {/* Offers flow — overlay on the same map */}
      {mode === "offers" ? (
        <OffersOverlay
          basePrice={trackingJob?.price ?? rewardAdjustedPrice}
          startedAt={trackingJob?.createdAt ?? null}
          minimumPrice={minimumOfferPrice}
          paymentMethod={paymentMethod}
          service={service}
          details={requestDetails ?? { service }}
          jobId={activeJobRequest?.jobId}
          customerId={activeJobRequest?.customerId}
          agentRequested={agentOn && !trackingJob}
          onClose={() => setMode("view")}
          onAccept={offer => {
            setTrackingOffer(offer);
            setTrackingJob(null);
            setTrackingWorkerLocation(null);
            setTrackingRoute(null);
            setCompletion("none");
            setMode("tracking");
          }}
        />
      ) : null}

      <AgentChat
        visible={mode === "view" && step === "choose"}
        instant={chatInstant}
        pricing={appConfig.pricing}
        address={location.address}
        coordinates={location.coordinates}
        customerName={name}
        onOpenMenu={() => setDrawerOpen(true)}
        onChangeLocation={enterEditMode}
        onJobCreated={(request, chatService, details, payment) => {
          setPaymentMethod(payment);
          setActiveJobRequest(request);
          void saveActiveRequest(request);
          setService(chatService);
          setRequestDetails(details);
        }}
        onOpenServices={() => navigation.navigate("ServicesInfo")}
        repeat={repeatChat}
        onBooked={offer => {
          setTrackingOffer(offer);
          setTrackingJob(null);
          setTrackingWorkerLocation(null);
          setTrackingRoute(null);
          setCompletion("none");
          setMode("tracking");
        }}
      />

      <MenuDrawer
        visible={drawerOpen}
        userName={name}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
        onProfile={() => navigation.navigate("Profile", { name })}
        onLoyalty={() => navigation.navigate("Loyalty")}
        onBookingHistory={() => navigation.navigate("BookingHistory")}
        onSupport={() => navigation.navigate("Support")}
        onSettings={() => navigation.navigate("Settings")}
        onBecomeWorker={goBecomeWorker}
      />

      <SafetySheet
        visible={safetyOpen}
        workerName={trackingOffer?.name}
        jobId={activeJobRequest?.jobId}
        shareCode={trackingJob?.shareCode}
        serviceLabel={t(trackingServiceLabel)}
        address={location.address}
        price={trackingOffer?.price}
        onClose={() => setSafetyOpen(false)}
      />

      <VehicleScopeSheet
        visible={vehicleScopeOpen}
        scopeType={trackingScopeType}
        cleaningType={trackingDetails.service === "home" ? trackingDetails.cleaningType : undefined}
        onClose={() => setVehicleScopeOpen(false)}
      />

      <WorkerProfileSheet
        visible={profileOpen}
        offer={trackingOffer}
        onClose={() => setProfileOpen(false)}
      />

      <PriceInputAlert
        visible={priceInputVisible}
        title={t("Offer your price")}
        initialValue={price}
        minimumValue={minimumOfferPrice}
        onClose={() => setPriceInputVisible(false)}
        onSubmit={value => setPrice(Math.max(minimumOfferPrice, value))}
      />

      <PayPalCheckout url={paypalUrl} onApproved={finishPayPalHold} onCancel={() => setPaypalUrl(null)} />

      <PriceInputAlert
        visible={agentBudgetInputVisible}
        title={t("Your most for this job")}
        initialValue={agentBudget}
        minimumValue={rewardAdjustedPrice}
        onClose={() => setAgentBudgetInputVisible(false)}
        onSubmit={setCustomAgentBudget}
      />

      <CustomAlert
        visible={!!alert}
        title={alert?.title ?? ""}
        message={alert?.message}
        onClose={() => setAlert(null)}
      />

      {/* Payment-methods bottom sheet */}
      {paymentSheetMounted ? (
        <View style={s.paymentSheetOverlay}>
          <Reanimated.View style={[s.paymentBackdrop, paymentScrimStyle]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setPaymentOptionsOpen(false)}
            />
          </Reanimated.View>
          <Reanimated.View
            style={[s.paymentSheet, paymentSheetStyle]}
            onLayout={event => setPaymentSheetHeight(event.nativeEvent.layout.height)}
          >
            <View style={s.paymentSheetHeader}>
              <Text style={[s.paymentSheetTitle, fontStyles.bold]}>
                {t("Payment methods")}
              </Text>
              <TouchableOpacity
                style={s.paymentSheetClose}
                activeOpacity={0.85}
                onPress={() => setPaymentOptionsOpen(false)}
              >
                <X size={18} color={colors.white} weight="bold" />
              </TouchableOpacity>
            </View>
            {PAYMENT_METHODS.map(method => {
              const selected = method === paymentMethod;
              return (
                <TouchableOpacity
                  key={method}
                  style={[s.paymentSheetRow, selected && s.paymentSheetRowSelected]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setPaymentMethod(method);
                    setPaymentOptionsOpen(false);
                  }}
                >
                  <PaymentGlyph method={method} size={34} />
                  <Text style={[s.paymentSheetRowText, fontStyles.semiBold]}>
                    {t(method)}
                  </Text>
                  {selected ? <Check size={20} color={colors.accent} weight="bold" /> : null}
                </TouchableOpacity>
              );
            })}
          </Reanimated.View>
        </View>
      ) : null}
    </View>
  );
}

// ---- Sub-components ----

// iOS-style pill toggle (custom so it matches the design instead of the
// Material switch Android renders by default).
const Toggle = React.memo(function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const colors = useColors();
  const s = useThemedStyles(makeHomeStyles);
  const anim = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    anim.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [anim, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(anim.value, [0, 1], ["#4c4d4f", colors.accent]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(anim.value, [0, 1], [0, 22]) }],
  }));

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onValueChange(!value)}>
      <Reanimated.View style={[s.toggleTrack, trackStyle]}>
        <Reanimated.View style={[s.toggleThumb, thumbStyle]} />
      </Reanimated.View>
    </TouchableOpacity>
  );
});

const ClosedHoursBorder = React.memo(function ClosedHoursBorder({ color }: { color: string }) {
  const progress = useSharedValue(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const strokeWidth = 2.5;
  const radius = 16;
  const inset = strokeWidth / 2;
  const rectWidth = Math.max(0, size.width - strokeWidth);
  const rectHeight = Math.max(0, size.height - strokeWidth);
  const strokeRadius = Math.max(0, radius - inset);
  const perimeter =
    rectWidth > 0 && rectHeight > 0
      ? 2 * (rectWidth + rectHeight - 4 * strokeRadius) + 2 * Math.PI * strokeRadius
      : 1;
  const dashLength = Math.min(82, perimeter * 0.34);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: -progress.value * perimeter,
  }));

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
          <Rect
            x={inset}
            y={inset}
            width={rectWidth}
            height={rectHeight}
            rx={strokeRadius}
            ry={strokeRadius}
            stroke={color}
            strokeWidth={strokeWidth}
            opacity={0.2}
            fill="none"
          />
          <AnimatedRect
            animatedProps={animatedProps}
            x={inset}
            y={inset}
            width={rectWidth}
            height={rectHeight}
            rx={strokeRadius}
            ry={strokeRadius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dashLength} ${perimeter - dashLength}`}
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
});

// White rounded brand tile: shows the PayPal logo, or a cash
// icon for the Cash option.
const PaymentGlyph = React.memo(function PaymentGlyph({ method, size = 34 }: { method: PaymentMethod; size?: number }) {
  const s = useThemedStyles(makeHomeStyles);
  return (
    <View style={[s.payGlyph, { width: size, height: size, borderRadius: size * 0.28 }]}>
      {method === "PayPal" ? (
        <PaypalLogo size={size * 0.6} color="#003087" weight="fill" />
      ) : (
        <MoneyWavy size={size * 0.56} color="#16a34a" weight="fill" />
      )}
    </View>
  );
});

// Soft glassmorphism glow. A radial gradient fading to transparent at the edge
// gives the "blurred orb" look with no BlurView (so no foreground glow halo).
// `style` carries the absolute position; size = the orb diameter.
function GlowOrb({
  size,
  color,
  style,
  intensity = 0.24,
}: {
  size: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}) {
  const id = useId();
  return (
    <Svg
      width={size}
      height={size}
      pointerEvents="none"
      style={[style, { backgroundColor: "transparent" }]}
    >
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={intensity} />
          <Stop offset="60%" stopColor={color} stopOpacity={intensity * 0.45} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

// Fake frosted-glass fill: blue→purple gradient + a white sheen. Just an
// absolute fill — the parent (with overflow:hidden + borderRadius) does the
// clipping, so the bg always matches the parent's border corners exactly.
const GlassFill = React.memo(function GlassFill() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#13234d", "#15203a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GlowOrb size={150} color="#00BAF0" style={{ position: "absolute", top: -64, left: -52 }} intensity={0.14} />
      <GlowOrb size={140} color="#7E57FF" style={{ position: "absolute", top: -54, right: -46 }} intensity={0.12} />
    </View>
  );
});

function TrackingAvatar({
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

const TrackingSummaryRow = React.memo(function TrackingSummaryRow({
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
});

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const fonts = useFontFamilies();
  const s = useThemedStyles(makeHomeStyles);
  return (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Text style={[s.chipText, active && s.chipTextActive, fontStyles.semiBold]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function VehicleQuantityRow({
  typeLabel,
  count,
  onToggle,
  onDecrement,
  onIncrement,
}: {
  typeLabel: string;
  count: number;
  onToggle: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const fonts = useFontFamilies();
  const colors = useColors();
  const s = useThemedStyles(makeHomeStyles);
  const selected = count > 0;

  return (
    <View style={[s.vehicleRow, selected && s.vehicleRowActive]}>
      <TouchableOpacity style={s.vehicleCheckArea} onPress={onToggle} activeOpacity={0.85}>
        {selected ? (
          <View style={s.vehicleCheckedBox}>
            <Check size={12} color={colors.white} weight="bold" />
          </View>
        ) : (
          <View style={s.vehicleEmptyBox} />
        )}
        <Text style={[s.vehicleName, selected && s.vehicleNameActive, fontStyles.semiBold]}>
          {typeLabel}
        </Text>
      </TouchableOpacity>

      <View style={s.vehicleStepper}>
        <TouchableOpacity
          style={[s.vehicleStepBtn, !selected && s.vehicleStepBtnDisabled]}
          onPress={onDecrement}
          activeOpacity={0.85}
          disabled={!selected}
        >
          <Minus size={14} color={colors.white} weight="bold" />
        </TouchableOpacity>
        <Text style={[s.vehicleCount, fontStyles.semiBold]}>{count}</Text>
        <TouchableOpacity style={s.vehicleStepBtn} onPress={onIncrement} activeOpacity={0.85}>
          <Plus size={14} color={colors.white} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ServiceTab({
  label,
  subtitle,
  selected,
  background,
  underlay,
  underlayStyle,
  bgStyle,
  bgResize = "cover",
  textColStyle,
  badge,
  heavy = false,
  onPress,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  background?: ImageSourcePropType;
  /** Full-bleed art drawn beneath `background`. */
  underlay?: ImageSourcePropType;
  underlayStyle?: StyleProp<ImageStyle>;
  bgStyle?: StyleProp<ImageStyle>;
  bgResize?: "cover" | "contain";
  textColStyle?: StyleProp<ViewStyle>;
  /** Drawn in the card's bottom-left corner. */
  badge?: React.ReactNode;
  heavy?: boolean;
  onPress: () => void;
}) {
  const fonts = useFontFamilies();
  const colors = useColors();
  const s = useThemedStyles(makeHomeStyles);
  const { settings } = useSettings();
  const isUrdu = settings.language === "ur";
  const selectAnim = useSharedValue(selected ? 1 : 0);
  const pressAnim = useSharedValue(0);

  useEffect(() => {
    selectAnim.value = withSpring(selected ? 1 : 0, {
      damping: 14,
      stiffness: 240,
      mass: 0.8,
    });
  }, [selectAnim, selected]);

  const tabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(selectAnim.value, [0, 1], [1, 1.03]) },
      { scale: interpolate(pressAnim.value, [0, 1], [1, 0.96]) },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({ opacity: selectAnim.value }));

  return (
    <TouchableOpacity
      style={s.tabTouch}
      activeOpacity={0.85}
      onPress={onPress}
      onPressIn={() => {
        pressAnim.value = withSpring(1, {
          damping: 16,
          stiffness: 360,
        });
      }}
      onPressOut={() => {
        pressAnim.value = withSpring(0, {
          damping: 16,
          stiffness: 360,
        });
      }}
    >
      <Reanimated.View
        style={[
          s.tabCard,
          tabAnimatedStyle,
        ]}
      >
        {underlay ? <Image source={underlay} style={[s.tabBackground, underlayStyle]} resizeMode="cover" /> : null}
        {background ? (
          <Image source={background} style={[s.tabBackground, bgStyle]} resizeMode={bgResize} />
        ) : (
          <CardPatches />
        )}
        <View style={[s.tabTextCol, textColStyle]}>
          <Text
            style={[s.tabLabel, heavy && s.tabLabelHeavy, heavy ? fontStyles.black : fontStyles.semiBold]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text
              style={[
                s.tabSubLabel,
                isUrdu && s.tabSubLabelRtl,
                fontStyles.medium,
              ]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {badge ? <View style={s.tabBadge}>{badge}</View> : null}
        <Reanimated.View pointerEvents="none" style={[s.tabSelectRing, ringStyle]} />
      </Reanimated.View>
    </TouchableOpacity>
  );
}
