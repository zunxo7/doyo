import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
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
  FadeIn,
  FadeOutLeft,
  interpolate,
  interpolateColor,
  LinearTransition,
  runOnJS,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Minus,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  Sparkle,
  Star,
  UserCircle,
  X,
  Check,
} from "phosphor-react-native";
import FadeInView from "./FadeInView";
import PriceInputAlert from "./PriceInputAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useSettings, useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeOffersStyles } from "../styles/OffersOverlay.styles";
import { acceptBiddingOffer, cancelBiddingJob, declineBiddingOffer, openJobRoomSocket, raiseJobPrice, stopJobAgent, summarizeJobDetails, type JobAgent, type JobDetails, type ViewerInfo } from "../services/bidding";
import { showLocalNotification } from "../services/notifications";
import { fontStyles } from "../styles/fonts";

export type Offer = {
  id: string;
  name: string;
  rating: string;
  jobs: string;
  minutesAway: number;
  price: number;
  avatar: "male" | "female";
  /** Public URL of the worker's uploaded photo, if any */
  photo?: string;
  yourPrice?: boolean;
};

// Worker photo for an offer card — shows the real uploaded picture, falling
// back to the gendered icon if there's no photo (or it fails to load).
function OfferAvatar({
  photo,
  gender,
  s,
  colors,
}: {
  photo?: string;
  gender: "male" | "female";
  s: ReturnType<typeof makeOffersStyles>;
  colors: ReturnType<typeof useColors>;
}) {
  const [failed, setFailed] = useState(false);
  if (photo && !failed) {
    return (
      <Image
        source={{ uri: photo }}
        style={s.avatarImage}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return <UserCircle size={32} color={gender === "male" ? colors.ink : colors.accent} weight="fill" />;
}

const PRIORITY_SECONDS = 60;
const BOOKING_TIMEOUT_SECONDS = 10 * 60;

// Bottom space covered by the fixed auto-accept bar
const AUTO_BAR_AREA = 97;

// How long an offer stays on screen before it expires
const OFFER_TTL_MS = 6000;

const AGENT_LOG_LINES = 5;

type Props = {
  basePrice: number;
  minimumPrice: number;
  paymentMethod: string;
  service: "home" | "vehicle" | "furniture" | "barber";
  details: JobDetails;
  /** Server createdAt (ms) so the timer survives an app restart. */
  startedAt?: number | null;
  jobId?: string;
  customerId?: string;
  /** The customer asked the agent to negotiate, before the first server state arrives. */
  agentRequested?: boolean;
  onClose: () => void;
  onAccept: (offer: Offer) => void;
};

/**
 * The whole "find offers" flow, rendered as an overlay on CustomerHome's map
 * so the map never remounts — only the bottom UI swaps.
 */
export default function OffersOverlay({ basePrice, minimumPrice, paymentMethod, service, details, startedAt, jobId, customerId, agentRequested, onClose, onAccept }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const isUrdu = settings.language === "ur";
  const colors = useColors();
  const s = useThemedStyles(makeOffersStyles);
  const insets = useSafeAreaInsets();
  const { height: SCREEN_H } = useWindowDimensions();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [viewers, setViewers] = useState<ViewerInfo>({ count: 0, sample: [] });
  const [agent, setAgent] = useState<JobAgent | null>(null);
  const [autoAccept, setAutoAccept] = useState(false);
  const [requestPrice, setRequestPrice] = useState(basePrice);
  const [autoAcceptPrice, setAutoAcceptPrice] = useState(basePrice);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("You raised the price");
  const [toastKind, setToastKind] = useState<"success" | "error">("success");
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [priceInputVisible, setPriceInputVisible] = useState(false);
  // Elapsed comes from the SERVER's createdAt when we have it, so closing and
  // reopening the app resumes the search timer instead of restarting at zero.
  const elapsedFromServer = () =>
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, PRIORITY_SECONDS - elapsedFromServer()));
  const [searchElapsedSeconds, setSearchElapsedSeconds] = useState(elapsedFromServer);
  const progressAnim = useSharedValue(1);
  const toastAnim = useSharedValue(0);
  const cancelSheetAnim = useSharedValue(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutHandledRef = useRef(false);
  const acceptingRef = useRef(false);

  useEffect(() => {
    // Linear — default easing made the bar crawl at the start, out of sync
    // with the countdown text
    progressAnim.value = withTiming(0, { duration: PRIORITY_SECONDS * 1000, easing: Easing.linear });

    const timer = setInterval(() => {
      setSecondsLeft(seconds => (seconds > 0 ? seconds - 1 : 0));
      setSearchElapsedSeconds(seconds => seconds + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      cancelAnimation(progressAnim);
    };
  }, [progressAnim]);

  useEffect(() => {
    if (!jobId || !customerId) return;
    // Live offers + "viewing now" count pushed from the job room (no polling).
    const socket = openJobRoomSocket(jobId, "customer", customerId, {
      onState: (job, nextOffers) => {
        setOffers(nextOffers);
        if (!job?.agent) return;
        setAgent(job.agent);
        setRequestPrice(job.price);
        setAutoAcceptPrice(job.price);
        const booked = nextOffers.find(offer => offer.id === job.agent?.offerId);
        if (job.agent.status === "booked" && booked && !acceptingRef.current) {
          acceptingRef.current = true;
          onAccept(booked);
        }
      },
      onViewers: setViewers,
    });
    return () => socket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, customerId]);

  // ---- Draggable waiting sheet (same pattern as CustomerHome's panel) ----
  const MAX_PANEL_H = Math.max(320, SCREEN_H - 105);
  const [panelHeight, setPanelHeight] = useState(0);
  const [peekHeight, setPeekHeight] = useState(0);
  // Measured so the sheet content sits exactly flush on the bar — no gap
  const [autoBarHeight, setAutoBarHeight] = useState(AUTO_BAR_AREA);
  const COLLAPSED_Y = Math.max(0, panelHeight - peekHeight - autoBarHeight);

  const translateY = useSharedValue(MAX_PANEL_H);
  const expandedRef = useRef(false);
  const initialized = useRef(false);
  const collapsedYRef = useRef(0);

  collapsedYRef.current = COLLAPSED_Y;

  useEffect(() => {
    if (panelHeight === 0 || peekHeight === 0) return;
    if (!initialized.current) {
      // Slide up from off-screen, matching the booking sheet's entrance. This
      // used to assign COLLAPSED_Y directly, which teleported the sheet into
      // place the instant it was measured.
      initialized.current = true;
      translateY.value = panelHeight;
      translateY.value = withTiming(COLLAPSED_Y, {
        duration: 560,
        easing: Easing.out(Easing.cubic),
      });
    } else if (!expandedRef.current) {
      // Later passes are measurement corrections, not a transition — snap.
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
    animateTo(0);
  };
  const collapse = () => {
    expandedRef.current = false;
    animateTo(collapsedYRef.current);
  };

  const panResponder = useRef(
    PanResponder.create({
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

  const formattedTimer = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));
  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastAnim.value,
    transform: [{ translateY: (1 - toastAnim.value) * 80 }],
  }));
  const cancelSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - cancelSheetAnim.value) * 260 }],
  }));
  // Real count of online workers who can see this request (plus anyone who has
  // already made an offer).
  const watchingCount = Math.max(viewers.count, offers.length);
  const agentWorking = agent ? agent.status === "working" : Boolean(agentRequested);
  const hasIncomingOffers = offers.length > 0;
  const showWaitingSheet = !hasIncomingOffers && !agentWorking;
  const canDecreasePrice = requestPrice > minimumPrice;
  const canRaisePrice = requestPrice > autoAcceptPrice;

  // Restart the priority countdown bar + timer from the top
  const restartTimer = () => {
    cancelAnimation(progressAnim);
    progressAnim.value = 1;
    progressAnim.value = withTiming(0, { duration: PRIORITY_SECONDS * 1000, easing: Easing.linear });
    setSecondsLeft(PRIORITY_SECONDS);
  };

  const changePrice = (next: number) => {
    setRequestPrice(Math.max(minimumPrice, Math.round(next)));
  };

  /** Local-only removal — for offers that died on their own (expired, or an
   * accept that failed). Nothing to tell the server. */
  const removeOfferLocally = (id: string) => {
    setOffers(current => current.filter(offer => offer.id !== id));
  };

  /** The customer actively said no. The server has to hear it, or the worker
   * keeps waiting on an offer that is already dead to us. */
  const declineOffer = (id: string) => {
    removeOfferLocally(id);
    if (jobId && customerId) {
      declineBiddingOffer(jobId, id, customerId).catch(() => undefined);
    }
  };

  const takeOverFromAgent = () => {
    if (!jobId) return;
    setAgent(current => (current ? { ...current, status: "stopped" } : current));
    stopJobAgent(jobId).catch(() => undefined);
  };

  const cancelRequest = () => {
    setCancelConfirmVisible(true);
    cancelSheetAnim.value = 0;
    cancelSheetAnim.value = withSpring(1, {
      damping: 20,
      stiffness: 220,
      mass: 0.9,
    });
  };

  const confirmCancelRequest = async () => {
    if (jobId && customerId) {
      await cancelBiddingJob(jobId, customerId, "customer").catch(() => undefined);
    }
    onClose();
  };

  const acceptOffer = async (offer: Offer) => {
    // Guard against double-accepts (rapid taps / auto-accept racing a tap).
    if (acceptingRef.current) return;
    acceptingRef.current = true;
    if (jobId && customerId) {
      try {
        const accepted = await acceptBiddingOffer(jobId, offer.id, customerId);
        onAccept({ ...offer, ...accepted });
        return;
      } catch {
        // Accept failed (offer expired, or a network blip). Clear the card but
        // do NOT tell the server it was declined — the offer may still be live.
        acceptingRef.current = false;
        removeOfferLocally(offer.id);
        return;
      }
    }
    onAccept(offer);
  };

  // Auto-accept: once armed, grab the nearest worker offering at or below the
  // chosen price as soon as such an offer arrives.
  useEffect(() => {
    if (!autoAccept || acceptingRef.current) return;
    const eligible = offers.filter(o => o.price <= autoAcceptPrice);
    if (eligible.length === 0) return;
    const nearest = eligible.reduce((best, o) => (o.minutesAway < best.minutesAway ? o : best));
    acceptOffer(nearest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept, offers, autoAcceptPrice]);

  const closeCancelConfirm = () => {
    cancelSheetAnim.value = withTiming(0, {
      duration: 220,
    }, finished => {
      if (finished) runOnJS(setCancelConfirmVisible)(false);
    });
  };

  // Hardware back asks to cancel the request instead of leaving immediately.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (cancelConfirmVisible) closeCancelConfirm();
      else cancelRequest();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelConfirmVisible]);

  const showRaisedToast = () => {
    setToastMessage("You raised the price");
    setToastKind("success");
    toastTimerRef.current && clearTimeout(toastTimerRef.current);
    setToastVisible(true);
    toastAnim.value = 0;
    toastAnim.value = withSpring(1, {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    });
    toastTimerRef.current = setTimeout(() => {
      toastAnim.value = withTiming(0, {
        duration: 220,
      }, finished => {
        if (finished) runOnJS(setToastVisible)(false);
      });
    }, 1800);
  };

  const showTimeoutToast = () => {
    setToastMessage("Booking timed out");
    setToastKind("error");
    toastTimerRef.current && clearTimeout(toastTimerRef.current);
    setToastVisible(true);
    toastAnim.value = 0;
    toastAnim.value = withSpring(1, {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    });
  };

  useEffect(() => {
    if (searchElapsedSeconds < BOOKING_TIMEOUT_SECONDS || timeoutHandledRef.current || acceptingRef.current) return;
    timeoutHandledRef.current = true;
    showTimeoutToast();
    showLocalNotification(t("Booking timed out"), t("No worker was selected in time. Please try again.")).catch(() => undefined);
    if (jobId && customerId) {
      cancelBiddingJob(jobId, customerId, "customer", "Booking timed out").catch(() => undefined);
    }
    timeoutCloseTimerRef.current && clearTimeout(timeoutCloseTimerRef.current);
    timeoutCloseTimerRef.current = setTimeout(() => {
      onClose();
    }, 1900);
    return () => {
      timeoutCloseTimerRef.current && clearTimeout(timeoutCloseTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchElapsedSeconds, jobId, customerId]);

  useEffect(() => () => {
    toastTimerRef.current && clearTimeout(toastTimerRef.current);
    timeoutCloseTimerRef.current && clearTimeout(timeoutCloseTimerRef.current);
  }, []);

  const raisePrice = () => {
    if (!canRaisePrice) return;
    setAutoAcceptPrice(requestPrice);
    restartTimer();
    showRaisedToast();
    // Push the new price to the live job so workers see the updated request.
    if (jobId && customerId) raiseJobPrice(jobId, customerId, requestPrice).catch(() => undefined);
  };

  // Editing via the pencil commits the new price like a raise — refresh the
  // timer and show the "You raised the price" toast
  const editPrice = (value: number) => {
    const clamped = Math.max(minimumPrice, Math.round(value));
    setRequestPrice(clamped);
    setAutoAcceptPrice(clamped);
    restartTimer();
    showRaisedToast();
    if (jobId && customerId) raiseJobPrice(jobId, customerId, clamped).catch(() => undefined);
  };

  return (
    // zIndex above the home screen's pin overlay (zIndex 1) so sheets cover it
    <View style={[StyleSheet.absoluteFill, { zIndex: 2, pointerEvents: "box-none" }]}>
      {showWaitingSheet ? (
        <Reanimated.View
          onLayout={e => setPanelHeight(e.nativeEvent.layout.height)}
          {...panResponder.panHandlers}
          style={[
            s.bottomPanel,
            // 2px less than the bar height so the card tucks slightly UNDER
            // the bar — subpixel rounding otherwise leaves a hairline gap
            { maxHeight: MAX_PANEL_H, paddingBottom: Math.max(0, autoBarHeight - 2) },
            panelAnimatedStyle,
          ]}
        >
          {/* ONE card: single background, single pattern overlay */}
          <View style={s.sheetCard}>


          <View onLayout={e => setPeekHeight(Math.ceil(e.nativeEvent.layout.height))}>
          <View style={[s.viewingStrip, isUrdu && s.viewingStripRtl]}>
            <Text style={[s.viewingText, isUrdu && s.rtlText, fontStyles.semiBold]}>
              {watchingCount === 1
                ? t("1 worker is viewing your request")
                : t("{count} workers are viewing your request", { count: watchingCount })}
            </Text>
            <View style={s.viewingAvatars}>
              {viewers.sample.slice(0, 3).map((v, i) => (
                <View key={i} style={[s.viewingAvatar, i > 0 && s.viewingAvatarOverlap]}>
                  {v.photo ? (
                    <Image source={{ uri: v.photo }} style={s.viewingAvatarImage} resizeMode="cover" />
                  ) : (
                    <UserCircle
                      size={24}
                      color={v.avatar === "female" ? colors.accent : colors.ink}
                      weight="fill"
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={s.priceArea}>
              <View style={s.handleArea}>
                <View style={s.handle} />
              </View>

              <View style={s.requestCard}>
                <View style={s.priorityRow}>
                  <Text style={[s.priorityText, fontStyles.semiBold]}>
                    {t("Good price. Your request gets priority")}
                  </Text>
                  <Text style={[s.timerText, fontStyles.semiBold]}>{formattedTimer}</Text>
                </View>
                <View style={s.progressTrack}>
                  <Reanimated.View style={[s.progressFill, progressStyle]} />
                </View>
                <View style={s.priceControls}>
                <TouchableOpacity
                  style={[s.priceStepButton, !canDecreasePrice && s.disabledControl]}
                  activeOpacity={0.86}
                  disabled={!canDecreasePrice}
                  onPress={() => changePrice(requestPrice - 50)}
                >
                  <Minus size={22} color={colors.white} weight="bold" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.priceEdit}
                    activeOpacity={0.8}
                    onPress={() => setPriceInputVisible(true)}
                  >
                    <Text style={[s.requestPrice, fontStyles.semiBold]}>
                      PKR{requestPrice}
                    </Text>
                    <PencilSimple size={19} color={colors.accent} weight="bold" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.priceStepButton}
                    activeOpacity={0.86}
                    onPress={() => changePrice(requestPrice + 50)}
                >
                  <Plus size={22} color={colors.white} weight="bold" />
                  </TouchableOpacity>
                </View>
              <TouchableOpacity
                style={[s.raiseButton, !canRaisePrice && s.disabledControl]}
                activeOpacity={0.9}
                disabled={!canRaisePrice}
                onPress={raisePrice}
              >
                  <Text style={[s.raiseText, fontStyles.semiBold]}>{t("Raise Price")}</Text>
                </TouchableOpacity>
              </View>
          </View>

          </View>

          {/* Below the fold — revealed by dragging up */}
          <View style={s.summaryContent}>
            <View style={s.summaryTitlePill}>
              <Text style={[s.summaryTitleInside, fontStyles.bold]}>{t("Job Summary")}</Text>
            </View>

            <View style={s.summaryCard}>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, fontStyles.medium]}>{t("Service")}</Text>
                <Text style={[s.summaryValue, fontStyles.semiBold]}>
                  {t(
                    service === "vehicle"
                      ? "Vehicle Cleaning"
                      : service === "furniture"
                        ? "Furniture Shifting"
                        : service === "barber"
                          ? "Barber"
                          : "Home Cleaning",
                  )}
                </Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, fontStyles.medium]}>{t("Details")}</Text>
                <Text style={[s.summaryValue, fontStyles.semiBold]} numberOfLines={1}>
                  {summarizeJobDetails(details, t("Cleaning"), t)}
                </Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, fontStyles.medium]}>{t("Payment")}</Text>
                <Text style={[s.summaryValue, fontStyles.semiBold]}>{t(paymentMethod)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, fontStyles.medium]}>{t("Your price")}</Text>
                <Text style={[s.summaryValue, fontStyles.semiBold]}>PKR{requestPrice}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.cancelRequestButton}
              activeOpacity={0.88}
              onPress={cancelRequest}
            >
              <Text style={[s.cancelRequestText, fontStyles.semiBold]}>
                {t("Cancel request")}
              </Text>
            </TouchableOpacity>
          </View>
          </View>
        </Reanimated.View>
      ) : null}

      {/* Fixed auto-accept bar — stays put while the sheet drags, like the
          Cash / Find Offers bar on the home screen */}
      {showWaitingSheet ? (
        <View
          style={[s.autoRow, s.autoBar]}
          onLayout={e => setAutoBarHeight(Math.ceil(e.nativeEvent.layout.height))}
        >
          <PaperPlaneTilt size={20} color={colors.accent} weight="fill" />
          <Text style={[s.autoText, fontStyles.semiBold]}>
            {t("Automatically accept the nearest worker for PKR{price}", { price: autoAcceptPrice })}
          </Text>
          <Toggle value={autoAccept} onValueChange={setAutoAccept} />
        </View>
      ) : null}

      {agentWorking ? (
        <Reanimated.View entering={FadeIn.duration(260)} style={[s.agentPanel, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.agentHeader}>
            <Sparkle size={22} color={colors.accent} weight="fill" />
            <Text style={[s.agentTitle, fontStyles.bold]}>{t("Doyo is negotiating for you")}</Text>
          </View>
          {agent ? (
            <Text style={[s.agentBudget, fontStyles.medium]}>
              {t(paymentMethod === "PayPal" ? "PayPal is holding" : "Your budget")} PKR{agent.budget}
            </Text>
          ) : null}
          <View style={s.agentLog}>
            {(agent?.log ?? []).slice(-AGENT_LOG_LINES).map((entry, index, lines) => (
              <Reanimated.Text
                key={`${entry.at}${entry.text}`}
                entering={FadeIn.duration(260)}
                style={[s.agentLine, index === lines.length - 1 && s.agentLineLatest, fontStyles.medium]}
              >
                {entry.text}
              </Reanimated.Text>
            ))}
          </View>
          <View style={s.agentActions}>
            <TouchableOpacity style={s.agentCancelButton} activeOpacity={0.88} onPress={cancelRequest}>
              <Text style={[s.agentCancelText, fontStyles.semiBold]}>{t("Cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.agentTakeOverButton, !jobId && s.disabledControl]}
              activeOpacity={0.88}
              disabled={!jobId}
              onPress={takeOverFromAgent}
            >
              <Text style={[s.agentTakeOverText, fontStyles.semiBold]}>{t("Take over")}</Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      ) : null}

      {hasIncomingOffers && !agentWorking ? (
        <Reanimated.View entering={FadeIn.duration(260)} style={s.requestOverlay}>
          <View style={s.darkOverlay} />
          <FadeInView delay={0} duration={600} style={[s.topContent, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity style={s.cancelPill} activeOpacity={0.88} onPress={cancelRequest}>
              <X size={22} color={colors.white} weight="bold" />
              <Text style={[s.cancelPillText, fontStyles.semiBold]}>{t("Cancel request")}</Text>
            </TouchableOpacity>

            <Text style={[s.screenTitle, fontStyles.bold]}>{t("Choose a worker")}</Text>
          </FadeInView>

          <Reanimated.FlatList
            data={offers}
            keyExtractor={offer => offer.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.overlayOffersContent, { paddingTop: insets.top + 126 }]}
            itemLayoutAnimation={LinearTransition.duration(260)}
            renderItem={({ item: offer, index }) => {
              // Highlight offers that exactly match what the customer asked for.
              const decorated: Offer = { ...offer, yourPrice: offer.price === requestPrice };
              return (
                <Reanimated.View
                  entering={SlideInRight.delay(index === 0 ? 280 : 430).duration(360)}
                  exiting={FadeOutLeft.duration(240)}
                  style={s.offerShell}
                >
                  <OfferCard
                    offer={decorated}
                    fonts={fonts}
                    t={t}
                    onDecline={() => declineOffer(offer.id)}
                    onAccept={() => acceptOffer(decorated)}
                    onExpire={() => {
                      // Ran out on its own — the server expires it too.
                      removeOfferLocally(offer.id);
                    }}
                  />
                </Reanimated.View>
              );
            }}
          />
        </Reanimated.View>
      ) : null}

      {toastVisible ? (
        <Reanimated.View style={[s.toast, toastStyle]}>
          <View style={s.toastIcon}>
            {toastKind === "error" ? (
              <X size={14} color={colors.white} weight="bold" />
            ) : (
              <Check size={14} color={colors.white} weight="bold" />
            )}
          </View>
          <Text style={[s.toastText, fontStyles.medium]}>{t(toastMessage)}</Text>
        </Reanimated.View>
      ) : null}

      {cancelConfirmVisible ? (
        <View style={s.cancelConfirmOverlay}>
          <Reanimated.View style={[s.cancelConfirmCard, cancelSheetStyle]}>

            <Text style={[s.cancelConfirmTitle, fontStyles.bold]}>
              {t("Sure you want to cancel your request?")}
            </Text>
            <TouchableOpacity
              style={s.keepSearchingButton}
              activeOpacity={0.88}
              onPress={closeCancelConfirm}
            >
              <Text style={[s.keepSearchingText, fontStyles.semiBold]}>{t("Keep searching")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.confirmCancelButton}
              activeOpacity={0.88}
              onPress={confirmCancelRequest}
            >
              <Text style={[s.confirmCancelText, fontStyles.semiBold]}>{t("Cancel request")}</Text>
            </TouchableOpacity>
          </Reanimated.View>
        </View>
      ) : null}

      <PriceInputAlert
        visible={priceInputVisible}
        title={t("Offer your price")}
        initialValue={requestPrice}
        minimumValue={minimumPrice}
        onClose={() => setPriceInputVisible(false)}
        onSubmit={editPrice}
      />
    </View>
  );
}

function OfferCard({
  offer,
  fonts,
  t,
  onDecline,
  onAccept,
  onExpire,
}: {
  offer: Offer;
  fonts: ReturnType<typeof useFontFamilies>;
  t: (key: string, params?: Record<string, string | number>) => string;
  onDecline: () => void;
  onAccept: () => void;
  onExpire: () => void;
}) {
  const colors = useColors();
  const s = useThemedStyles(makeOffersStyles);
  // Offer lifetime — the darker fill on Accept depletes, then the card expires
  const ttl = useSharedValue(0);

  useEffect(() => {
    ttl.value = withTiming(1, { duration: OFFER_TTL_MS, easing: Easing.linear }, finished => {
      if (finished) runOnJS(onExpire)();
    });
    return () => cancelAnimation(ttl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dark elapsed-time fill creeps in from the left as the offer ages
  const ttlFillStyle = useAnimatedStyle(() => ({
    width: `${interpolate(ttl.value, [0, 1], [0, 100])}%`,
  }));

  return (
    <View style={[s.offerCard, offer.yourPrice && s.featuredOffer]}>

      {offer.yourPrice ? (
        <View style={s.yourPriceBadge}>
          <Check size={14} color={colors.white} weight="bold" />
          <Text style={[s.yourPriceText, fontStyles.semiBold]}>{t("Your Price")}</Text>
        </View>
      ) : null}

      <View style={s.offerHeadline}>
        <Text style={[s.offerPrice, fontStyles.bold]}>PKR{offer.price}</Text>
        <Text style={[s.awayText, fontStyles.bold]}>
          {t("{min} min", { min: offer.minutesAway })}
        </Text>
      </View>

      <View style={s.offerTop}>
        <View style={s.workerInfo}>
          <View style={s.avatar}>
            <OfferAvatar photo={offer.photo} gender={offer.avatar} s={s} colors={colors} />
          </View>
          <View style={s.workerTextBlock}>
            <View style={s.workerLine}>
              <Text style={[s.workerName, fontStyles.semiBold]} numberOfLines={1}>
                {offer.name}
              </Text>
            </View>
            <View style={s.workerMetaLine}>
              <Star size={13} color="#ffd400" weight="fill" />
              <Text style={[s.ratingText, fontStyles.semiBold]}>{offer.rating}</Text>
              <Text style={[s.jobsText, fontStyles.medium]}>
                {t("{jobs} jobs", { jobs: offer.jobs })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.offerActions}>
        <TouchableOpacity style={s.declineButton} activeOpacity={0.85} onPress={onDecline}>
          <Text style={[s.declineText, fontStyles.semiBold]}>{t("Decline")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.acceptButton} activeOpacity={0.9} onPress={onAccept}>
          <Reanimated.View style={[s.acceptTimerFill, ttlFillStyle, { pointerEvents: "none" }]} />
          <Text style={[s.acceptText, fontStyles.semiBold]}>{t("Accept")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// iOS-style pill toggle (custom so it matches the design instead of the
// Material switch Android renders by default).
function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const colors = useColors();
  const s = useThemedStyles(makeOffersStyles);
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
}
