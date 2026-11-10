import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Reanimated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretDown, List, MapPin, PaperPlaneRight, SquaresFour, Star, UserCircle } from "phosphor-react-native";
import AppIcon from "./AppIcon";
import ChatServicesSheet from "./ChatServicesSheet";
import PayPalCheckout from "./PayPalCheckout";
import ScreenBackground from "./ScreenBackground";
import type { Offer } from "./OffersOverlay";
import { useSettings, useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import {
  acceptBiddingOffer,
  cancelBiddingJob,
  createBiddingJob,
  getCurrentUserId,
  openJobRoomSocket,
  planAgentRequest,
  stopJobAgent,
  summarizeJobDetails,
  type AgentPlan,
  type JobAgent,
  type JobDetails,
} from "../services/bidding";
import type { AppConfig } from "../services/appConfig";
import { readChat, saveChat, type ChatItem } from "../services/chatDraft";
import { confirmPayPalLink, getPayPalLink, startPayPalLink } from "../services/payments";
import { makeAgentChatStyles } from "../styles/AgentChat.styles";
import { fontStyles } from "../styles/fonts";

const STARTERS = ["Deep clean 3 rooms", "Wash my car", "Haircut and beard", "Move a sofa"];
const PLAN_REPLIES = ["Female worker only", "Make my limit lower"];
const SERVICE_LABELS: Record<AgentPlan["service"], string> = {
  home: "Home cleaning",
  vehicle: "Vehicle wash",
  furniture: "Furniture shifting",
  barber: "Barber",
};
const SERVICE_REQUESTS: Record<AgentPlan["service"], string> = {
  home: "I need home cleaning",
  vehicle: "Wash my car",
  furniture: "Help me move furniture",
  barber: "I need a haircut",
};
// The default limit leaves the agent a fifth of the price as room to close.
const BUDGET_HEADROOM = 1.2;

type Payment = "PayPal" | "Cash";
type Stage = "planning" | "paying" | "live" | "booked";

function quote(plan: AgentPlan, pricing: AppConfig["pricing"]): number {
  if (plan.service === "home") {
    const tier = plan.cleaningType === "Deep" ? pricing.home.deep : pricing.home.regular;
    return tier.base + Math.max(0, plan.rooms - 1) * tier.perExtraRoom;
  }
  if (plan.service === "furniture") return plan.smallItems * pricing.furniture.small + plan.bigItems * pricing.furniture.big;
  if (plan.service === "barber") {
    return plan.haircuts * pricing.barber.haircut + plan.beards * pricing.barber.beard + plan.haircutAndBeards * pricing.barber.haircutBeard;
  }
  return plan.bikes * pricing.vehicle.bike + plan.cars * pricing.vehicle.car + plan.vans * pricing.vehicle.van;
}

function toDetails(plan: AgentPlan): JobDetails {
  if (plan.service === "home") return { service: "home", rooms: Math.max(1, plan.rooms), cleaningType: plan.cleaningType };
  if (plan.service === "furniture") return { service: "furniture", smallItems: plan.smallItems, bigItems: plan.bigItems };
  if (plan.service === "barber") {
    return { service: "barber", haircut: plan.haircuts, beard: plan.beards, haircutBeard: plan.haircutAndBeards };
  }
  const vehicles = [
    { type: "Car", count: plan.cars },
    { type: "Bike", count: plan.bikes },
    { type: "Van", count: plan.vans },
  ].filter(vehicle => vehicle.count > 0);
  return { service: "vehicle", vehicles };
}

const planKey = (plan: AgentPlan) => JSON.stringify({ ...plan, understood: true, cancel: false, question: "", reply: "" });

function TypingDots() {
  const s = useThemedStyles(makeAgentChatStyles);
  return (
    <View style={s.typing}>
      {[0, 1, 2].map(index => (
        <Dot key={index} delay={index * 160} />
      ))}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const s = useThemedStyles(makeAgentChatStyles);
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [delay, lift]);
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + lift.value * 0.6, transform: [{ translateY: -3 * lift.value }] }));
  return <Reanimated.View style={[s.typingDot, style]} />;
}

function DoyoRow({ children }: { children: React.ReactNode }) {
  const s = useThemedStyles(makeAgentChatStyles);
  return (
    <View style={s.row}>
      <View style={s.avatar}>
        <AppIcon size={30} />
      </View>
      <View style={s.rowBody}>{children}</View>
    </View>
  );
}

type Props = {
  visible: boolean;
  pricing: AppConfig["pricing"];
  address: string;
  coordinates: [number, number];
  customerName: string;
  onOpenMenu: () => void;
  onChangeLocation: () => void;
  onJobCreated: (request: { jobId: string; customerId: string }, service: AgentPlan["service"], details: JobDetails, payment: Payment) => void;
  onBooked: (offer: Offer) => void;
  onOpenServices: () => void;
  repeat: { service: AgentPlan["service"]; details: JobDetails | null; workerPreference: AgentPlan["workerPreference"]; payment: Payment } | null;
};

/** The customer's home: one conversation from the first request to a booked worker. */
export default function AgentChat({
  visible,
  pricing,
  address,
  coordinates,
  customerName,
  onOpenMenu,
  onChangeLocation,
  onJobCreated,
  onBooked,
  onOpenServices,
  repeat,
}: Props) {
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeAgentChatStyles);
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  const [draft] = useState(readChat);
  const [items, setItems] = useState<ChatItem[]>(draft?.items ?? []);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [plan, setPlan] = useState<AgentPlan | null>(draft?.plan ?? null);
  const [payment, setPayment] = useState<Payment>(draft?.payment ?? settings.defaultPayment);
  const [stage, setStage] = useState<Stage>(draft?.request ? "live" : "planning");
  const canType = stage === "planning" || stage === "live";
  const [paypalUrl, setPaypalUrl] = useState<string | null>(null);
  const [paypalOpening, setPaypalOpening] = useState(false);
  const [request, setRequest] = useState<{ jobId: string; customerId: string } | null>(draft?.request ?? null);
  const [agent, setAgent] = useState<JobAgent | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [booked, setBooked] = useState<Offer | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [servicesOpen, setServicesOpen] = useState(false);
  const nextId = useRef((draft?.items.at(-1)?.id ?? 0) + 1);
  const linkId = useRef<string | null>(null);
  // Prepared while the plan card is on screen, so Book it opens PayPal without waiting on it.
  const paypalReady = useRef<Promise<{ linked: boolean; id?: string; url?: string; at: number }> | null>(null);
  const cancelling = useRef(false);
  const askRef = useRef(0);
  const shown = useSharedValue(visible ? 1 : 0);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const price = useMemo(() => {
    if (!plan) return { ask: 0, limit: 0 };
    const estimate = quote(plan, pricing);
    const limit = plan.budget > 0 ? plan.budget : Math.ceil((estimate * BUDGET_HEADROOM) / 50) * 50;
    return { ask: Math.min(estimate, limit), limit };
  }, [plan, pricing]);

  askRef.current = price.ask;

  const fadeStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 14 }] }));

  useEffect(() => {
    shown.value = withTiming(visible ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [visible, shown]);

  useEffect(() => {
    saveChat(items.length || request ? { items, plan, payment, request } : null);
  }, [items, plan, payment, request]);

  const say = (kind: "me" | "doyo", line: string) => setItems(current => [...current, { id: nextId.current++, kind, text: line }]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", event => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const clearBooking = () => {
    setRequest(null);
    setAgent(null);
    setOffers([]);
    setBooked(null);
    setStage("planning");
  };

  useEffect(() => {
    if (!request) return;
    const socket = openJobRoomSocket(request.jobId, "customer", request.customerId, {
      onState: (job, nextOffers) => {
        if (job?.status === "completed") {
          const paidByPayPal = job.payment === "PayPal";
          if (paidByPayPal && !job.paymentStatus) return;
          const amount = (job.acceptedPrice ?? job.price).toLocaleString();
          const saving = askRef.current - (job.acceptedPrice ?? job.price);
          const receipt =
            job.paymentStatus === "failed"
              ? t("PayPal couldn't take PKR{amount}. Please contact support.", { amount })
              : paidByPayPal
                ? t("PKR{amount} paid with PayPal.", { amount })
                : t("Job done. Please pay PKR{amount} in cash.", { amount });
          const savedLine = saving > 0 ? ` ${t("Doyo saved you PKR{amount}.", { amount: saving.toLocaleString() })}` : "";
          const log = job.agent?.log ?? [];
          clearBooking();
          setPlan(null);
          setItems(current => [
            ...current.filter(item => item.kind !== "plan"),
            ...log.map((line): ChatItem =>
              line.from === "worker"
                ? { id: nextId.current++, kind: "worker", text: line.text, name: line.name, avatar: line.avatar }
                : { id: nextId.current++, kind: "agent", text: line.text },
            ),
            { id: nextId.current++, kind: "doyo", text: receipt + savedLine },
          ]);
          return;
        }
        if (job?.status === "cancelled" || job?.status === "expired") {
          if (cancelling.current) return;
          clearBooking();
          say("doyo", t("That request ended, so you paid nothing."));
          return;
        }
        setOffers(nextOffers);
        if (!job?.agent) return;
        setAgent(job.agent);
        const accepted = nextOffers.find(offer => offer.id === job.agent?.offerId);
        if (job.agent.status === "booked" && accepted) {
          setBooked(accepted);
          setStage("booked");
        }
      },
    });
    return () => socket.close();
  }, [request]);

  const dropRequest = async () => {
    if (!request) return;
    cancelling.current = true;
    await cancelBiddingJob(request.jobId, request.customerId, "customer").catch(() => undefined);
    cancelling.current = false;
    clearBooking();
  };

  const send = async (line: string) => {
    const message = line.trim();
    if (!message || thinking || !canType) return;
    setText("");
    // The planner reads the message in context: the chat so far and what the current job usually costs.
    const recent = items
      .filter((item): item is ChatItem & { text: string } => item.kind === "me" || item.kind === "doyo")
      .slice(-6)
      .map(item => ({ from: item.kind === "me" ? ("customer" as const) : ("doyo" as const), text: item.text }));
    say("me", message);
    setThinking(true);
    try {
      const next = await planAgentRequest(message, plan, recent, plan ? quote(plan, pricing) || undefined : undefined);
      if (next.cancel) {
        await dropRequest();
        setPlan(null);
        setItems([{ id: nextId.current++, kind: "doyo", text: next.reply }]);
      } else if (!next.understood) {
        say("doyo", next.question);
      } else if (quote(next, pricing) <= 0) {
        say("doyo", t("Tell me a bit more, like how many items or people."));
      } else if (request && plan && planKey(next) === planKey(plan)) {
        say("doyo", next.reply);
      } else {
        await dropRequest();
        setPlan(next);
        // Only the newest plan stays in the thread, so nothing old can be tapped.
        setItems(current => [
          ...current.filter(item => item.kind !== "plan"),
          { id: nextId.current++, kind: "doyo", text: next.reply },
          { id: nextId.current++, kind: "plan" },
        ]);
      }
    } catch {
      say("doyo", t("I couldn't reach the server. Please try again."));
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    if (!repeat) return;
    setPayment(repeat.payment);
    const worker = repeat.workerPreference === "Any" ? "" : `, ${repeat.workerPreference} worker`;
    const job = summarizeJobDetails(repeat.details, "", t);
    void send(`${t("Book again")}: ${t(SERVICE_LABELS[repeat.service])}${job ? `, ${job}` : ""}${worker}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeat]);

  const postJob = async () => {
    if (!plan) return;
    setThinking(true);
    try {
      const customerId = await getCurrentUserId(customerName);
      const details = toDetails(plan);
      const created = await createBiddingJob({
        customerId,
        customerName,
        service: plan.service,
        detail: summarizeJobDetails(details, t(SERVICE_LABELS[plan.service]), t),
        address,
        coordinates,
        price: price.ask,
        payment,
        workerPreference: plan.workerPreference,
        details,
        agentBudget: price.limit,
      });
      const next = { jobId: created.job.id, customerId };
      setRequest(next);
      setStage("live");
      onJobCreated(next, plan.service, details, payment);
    } catch (error) {
      setStage("planning");
      say("doyo", error instanceof Error && error.message ? error.message : t("I couldn't post that. Please try again."));
    } finally {
      setThinking(false);
    }
  };

  const preparePayPal = () => {
    const prepared = (async () => {
      const { linked } = await getPayPalLink();
      if (linked) return { linked, at: Date.now() };
      const session = await startPayPalLink();
      return { linked, id: session.id, url: session.checkoutUrl, at: Date.now() };
    })();
    prepared.catch(() => {
      if (paypalReady.current === prepared) paypalReady.current = null;
    });
    paypalReady.current = prepared;
    return prepared;
  };

  useEffect(() => {
    if (plan && payment === "PayPal" && stage === "planning" && !paypalReady.current) void preparePayPal().catch(() => undefined);
  }, [plan, payment, stage]);

  const book = async () => {
    if (!plan || stage !== "planning") return;
    Keyboard.dismiss();
    setStage("paying");
    if (payment === "Cash") {
      await postJob();
      return;
    }
    // The sheet opens at once and shows PayPal loading, rather than nothing happening.
    setPaypalOpening(true);
    try {
      const fresh = paypalReady.current && (await paypalReady.current.catch(() => null));
      // A prepared PayPal page is only reused while it is recent; PayPal expires them.
      const ready = fresh && Date.now() - fresh.at < 10 * 60 * 1000 ? fresh : await preparePayPal();
      paypalReady.current = null;
      if (ready.linked) {
        setPaypalOpening(false);
        await postJob();
        return;
      }
      linkId.current = ready.id ?? null;
      setPaypalUrl(ready.url ?? null);
    } catch (error) {
      setPaypalOpening(false);
      setStage("planning");
      say("doyo", error instanceof Error && error.message ? error.message : t("I couldn't open PayPal. Please try again."));
    }
  };

  const linkApproved = async () => {
    setPaypalUrl(null);
    setPaypalOpening(false);
    const id = linkId.current;
    if (!id) return;
    setThinking(true);
    try {
      const { linked } = await confirmPayPalLink(id);
      if (!linked) throw new Error(t("PayPal didn't link, so nothing was charged."));
      say("doyo", t("PayPal linked. I only charge it after the job is done."));
      await postJob();
    } catch (error) {
      setStage("planning");
      setThinking(false);
      say("doyo", error instanceof Error && error.message ? error.message : t("Something went wrong. Nothing was charged."));
    }
  };

  const linkCancelled = () => {
    setPaypalUrl(null);
    setPaypalOpening(false);
    setStage("planning");
    say("doyo", t("No problem, nothing was charged. Tap Book it when you're ready."));
  };

  const takeOver = () => {
    if (!request) return;
    setAgent(current => (current ? { ...current, status: "stopped" } : current));
    stopJobAgent(request.jobId).catch(() => undefined);
  };

  const accept = async (offer: Offer) => {
    if (!request) return;
    try {
      const accepted = await acceptBiddingOffer(request.jobId, offer.id, request.customerId);
      setBooked({ ...offer, ...accepted });
      setStage("booked");
    } catch (error) {
      say("doyo", error instanceof Error && error.message ? error.message : t("That offer is no longer available."));
    }
  };

  const cancelRequest = async () => {
    await dropRequest();
    say("doyo", t("Cancelled. You paid nothing."));
  };

  const pickService = (service: AgentPlan["service"]) => {
    setServicesOpen(false);
    void send(t(SERVICE_REQUESTS[service]));
  };

  const negotiating = stage === "live" && agent?.status !== "stopped";
  const choosing = stage === "live" && agent?.status === "stopped";
  const bestPrice = offers.length ? Math.min(...offers.map(offer => offer.price)) : null;
  const saved = booked ? price.ask - booked.price : 0;
  const showTyping = thinking || negotiating;
  const starting = stage === "planning" && !plan && !thinking && items.every(item => item.kind !== "me");
  const quickReplies = starting ? STARTERS : stage === "planning" && plan && !thinking ? PLAN_REPLIES : [];
  const composerOpen = stage === "planning";
  // Android reports the keyboard's height without the navigation bar beneath it.
  const keyboardGap = Platform.OS === "android" ? insets.bottom : 0;

  return (
    <Reanimated.View style={[s.wrap, fadeStyle]} pointerEvents={visible ? "auto" : "none"}>
      <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <View style={[s.body, { paddingTop: insets.top + 8, paddingBottom: keyboardHeight ? keyboardHeight + keyboardGap : insets.bottom }]}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={onOpenMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <List size={24} color={colors.white} weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity style={s.locationPill} activeOpacity={0.8} disabled={!composerOpen} onPress={onChangeLocation}>
          <MapPin size={16} color={colors.accent} weight="fill" />
          <Text style={[s.locationText, fontStyles.medium]} numberOfLines={1}>
            {address || t("Set your location")}
          </Text>
          {composerOpen ? <CaretDown size={14} color={colors.whiteSubtle} weight="bold" /> : null}
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.thread}
        contentContainerStyle={s.threadContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {items.length === 0 ? (
          <Reanimated.View entering={FadeIn.duration(400)} style={s.welcome}>
            <AppIcon size={64} />
            <Text style={[s.welcomeTagline, fontStyles.medium]}>{t("Let Doyo do it for you")}</Text>
          </Reanimated.View>
        ) : null}

        {items.map(item => {
          if (item.kind === "me") {
            return (
              <Reanimated.View key={item.id} entering={FadeInDown.duration(220)} style={s.meBubble}>
                <Text style={[s.meText, fontStyles.medium]}>{item.text}</Text>
              </Reanimated.View>
            );
          }
          if (item.kind === "agent") {
            return (
              <View key={item.id} style={[s.row, s.rowAgent]}>
                <View style={s.avatar}>
                  <AppIcon size={30} />
                </View>
                <View style={[s.rowBody, s.rowBodyAgent]}>
                  <View style={[s.bubble, s.bubbleAgent]}>
                    <Text style={[s.bubbleText, fontStyles.medium]}>{item.text}</Text>
                  </View>
                </View>
              </View>
            );
          }
          if (item.kind === "worker") {
            return (
              <View key={item.id} style={s.row}>
                <View style={s.avatar}>
                  <UserCircle size={32} color={item.avatar === "female" ? colors.accent : colors.white} weight="fill" />
                </View>
                <View style={s.rowBody}>
                  <Text style={[s.speaker, fontStyles.semiBold]}>{item.name}</Text>
                  <View style={s.bubble}>
                    <Text style={[s.bubbleText, fontStyles.medium]}>{item.text}</Text>
                  </View>
                </View>
              </View>
            );
          }
          if (item.kind === "doyo") {
            return (
              <Reanimated.View key={item.id} entering={FadeInDown.duration(220)}>
                <DoyoRow>
                  <View style={s.bubble}>
                    <Text style={[s.bubbleText, fontStyles.medium]}>{item.text}</Text>
                  </View>
                </DoyoRow>
              </Reanimated.View>
            );
          }
          if (!plan) return null;
          const details = toDetails(plan);
          return (
            <Reanimated.View key={item.id} entering={FadeInDown.duration(260)} style={s.card}>
              <Text style={[s.cardTitle, fontStyles.bold]}>{t(SERVICE_LABELS[plan.service])}</Text>
              <Text style={[s.cardSub, fontStyles.medium]}>{summarizeJobDetails(details, "", t)}</Text>
              <View style={s.cardDivider} />
              <View style={s.cardLine}>
                <Text style={[s.cardLabel, fontStyles.medium]}>{t("Where")}</Text>
                <Text style={[s.cardValue, fontStyles.semiBold]} numberOfLines={1}>{address}</Text>
              </View>
              <View style={s.cardLine}>
                <Text style={[s.cardLabel, fontStyles.medium]}>{t("Worker")}</Text>
                <Text style={[s.cardValue, fontStyles.semiBold]}>{t(plan.workerPreference)}</Text>
              </View>
              <View style={s.cardLine}>
                <Text style={[s.cardLabel, fontStyles.medium]}>{t("Starts at")}</Text>
                <Text style={[s.cardValue, fontStyles.semiBold]}>PKR{price.ask.toLocaleString()}</Text>
              </View>
              <View style={s.cardLine}>
                <Text style={[s.cardLabel, fontStyles.medium]}>{t("Never over")}</Text>
                <Text style={[s.cardValue, fontStyles.semiBold]}>PKR{price.limit.toLocaleString()}</Text>
              </View>
              <TouchableOpacity
                style={s.cardLine}
                activeOpacity={0.8}
                disabled={!composerOpen}
                onPress={() => setPayment(current => (current === "PayPal" ? "Cash" : "PayPal"))}
              >
                <Text style={[s.cardLabel, fontStyles.medium]}>{t("Pay with")}</Text>
                <Text style={[s.cardValueLink, fontStyles.semiBold]}>{t(payment)}</Text>
              </TouchableOpacity>
              {composerOpen ? (
                <View style={s.cardActions}>
                  <TouchableOpacity style={s.secondaryButton} activeOpacity={0.85} onPress={() => inputRef.current?.focus()}>
                    <Text style={[s.secondaryText, fontStyles.semiBold]}>{t("Change")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.primaryButton} activeOpacity={0.9} disabled={thinking} onPress={() => void book()}>
                    <Text style={[s.primaryText, fontStyles.semiBold]}>{t("Book it")}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </Reanimated.View>
          );
        })}

        {(agent?.log ?? []).map(line =>
          line.from === "worker" ? (
            <Reanimated.View key={`${line.at}${line.text}`} entering={FadeInDown.duration(220)} style={s.row}>
              <View style={s.avatar}>
                <UserCircle size={32} color={line.avatar === "female" ? colors.accent : colors.white} weight="fill" />
              </View>
              <View style={s.rowBody}>
                <Text style={[s.speaker, fontStyles.semiBold]}>{line.name}</Text>
                <View style={s.bubble}>
                  <Text style={[s.bubbleText, fontStyles.medium]}>{line.text}</Text>
                </View>
              </View>
            </Reanimated.View>
          ) : (
            // Doyo speaks for the customer here, so it sits on the customer's side.
            <Reanimated.View key={`${line.at}${line.text}`} entering={FadeInDown.duration(220)} style={[s.row, s.rowAgent]}>
              <View style={s.avatar}>
                <AppIcon size={30} />
              </View>
              <View style={[s.rowBody, s.rowBodyAgent]}>
                <View style={[s.bubble, s.bubbleAgent]}>
                  <Text style={[s.bubbleText, fontStyles.medium]}>{line.text}</Text>
                </View>
              </View>
            </Reanimated.View>
          ),
        )}

        {choosing
          ? offers.map(offer => (
              <Reanimated.View key={offer.id} entering={FadeInDown.duration(240)} style={s.card}>
                <View style={s.offerTop}>
                  <Text style={[s.cardTitle, fontStyles.bold]}>{offer.name}</Text>
                  <Text style={[s.offerPrice, fontStyles.bold]}>PKR{offer.price.toLocaleString()}</Text>
                </View>
                <View style={s.offerMeta}>
                  <Star size={13} color="#ffd400" weight="fill" />
                  <Text style={[s.cardSub, fontStyles.medium]}>
                    {offer.rating} · {t("{min} min", { min: offer.minutesAway })}
                  </Text>
                </View>
                <TouchableOpacity style={[s.primaryButton, s.offerAccept]} activeOpacity={0.9} onPress={() => void accept(offer)}>
                  <Text style={[s.primaryText, fontStyles.semiBold]}>{t("Accept")}</Text>
                </TouchableOpacity>
              </Reanimated.View>
            ))
          : null}

        {booked ? (
          <Reanimated.View entering={FadeInDown.duration(280)} style={[s.card, s.bookedCard]}>
            <Text style={[s.bookedLabel, fontStyles.semiBold]}>{t("Booked")}</Text>
            <View style={s.offerTop}>
              <Text style={[s.cardTitle, fontStyles.bold]}>{booked.name}</Text>
              <Text style={[s.offerPrice, fontStyles.bold]}>PKR{booked.price.toLocaleString()}</Text>
            </View>
            <View style={s.offerMeta}>
              <Star size={13} color="#ffd400" weight="fill" />
              <Text style={[s.cardSub, fontStyles.medium]}>
                {booked.rating} · {t("{min} min", { min: booked.minutesAway })}
                {saved > 0 ? ` · ${t("Saved PKR{amount}", { amount: saved.toLocaleString() })}` : ""}
              </Text>
            </View>
            <TouchableOpacity style={[s.primaryButton, s.offerAccept]} activeOpacity={0.9} onPress={() => onBooked(booked)}>
              <Text style={[s.primaryText, fontStyles.semiBold]}>{t("Track on map")}</Text>
            </TouchableOpacity>
          </Reanimated.View>
        ) : null}

        {showTyping ? (
          negotiating ? (
            <View style={[s.row, s.rowAgent]}>
              <View style={s.avatar}>
                <AppIcon size={30} />
              </View>
              <TypingDots />
            </View>
          ) : (
            <DoyoRow>
              <TypingDots />
            </DoyoRow>
          )
        ) : null}
      </ScrollView>

      {negotiating || choosing ? (
        <View style={s.statusBar}>
          <Text style={[s.statusText, fontStyles.semiBold]} numberOfLines={1}>
            {bestPrice
              ? `${choosing ? t("Best offer") : t("Best so far")} · PKR${bestPrice.toLocaleString()}`
              : choosing
                ? t("You're choosing")
                : t("Negotiating")}
          </Text>
          <TouchableOpacity
            style={s.statusAction}
            activeOpacity={0.85}
            onPress={choosing ? () => void cancelRequest() : takeOver}
          >
            <Text style={[s.statusActionText, fontStyles.semiBold]}>{choosing ? t("Cancel") : t("Take over")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {quickReplies.length ? (
        <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipRow}>
          {starting ? (
            <TouchableOpacity style={[s.chip, s.chipWithIcon]} activeOpacity={0.85} onPress={() => setServicesOpen(true)}>
              <SquaresFour size={15} color={colors.accent} weight="fill" />
              <Text style={[s.chipText, fontStyles.semiBold]}>{t("All services")}</Text>
            </TouchableOpacity>
          ) : null}
          {quickReplies.map(reply => (
            <TouchableOpacity key={reply} style={s.chip} activeOpacity={0.85} onPress={() => void send(t(reply))}>
              <Text style={[s.chipText, fontStyles.medium]}>{t(reply)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {canType ? (
        <View style={s.composer}>
          <TouchableOpacity style={s.toolButton} activeOpacity={0.85} accessibilityLabel={t("All services")} onPress={() => setServicesOpen(true)}>
            <SquaresFour size={20} color={colors.white} weight="fill" />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={[s.input, fontStyles.medium]}
            value={text}
            onChangeText={setText}
            placeholder={request ? t("Change or cancel…") : plan ? t("Change anything…") : t("Tell Doyo what you need")}
            placeholderTextColor={colors.whiteSubtle}
            maxLength={300}
            multiline
          />
          <TouchableOpacity
            style={[s.sendButton, (!text.trim() || thinking) && s.sendDisabled]}
            activeOpacity={0.85}
            disabled={!text.trim() || thinking}
            onPress={() => void send(text)}
          >
            <PaperPlaneRight size={20} color="#ffffff" weight="fill" />
          </TouchableOpacity>
        </View>
      ) : null}

      <PayPalCheckout url={paypalUrl} opening={paypalOpening} title={t("Link PayPal")} onApproved={() => void linkApproved()} onCancel={linkCancelled} />
      <ChatServicesSheet
        visible={servicesOpen}
        pricing={pricing}
        onClose={() => setServicesOpen(false)}
        onPick={pickService}
        onDetails={() => {
          setServicesOpen(false);
          onOpenServices();
        }}
      />
      </View>
      </ScreenBackground>
    </Reanimated.View>
  );
}
