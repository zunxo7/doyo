import React, { useEffect, useRef, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import Reanimated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeOutLeft,
  interpolate,
  interpolateColor,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  Broom,
  Check,
  Clock,
  HandCoins,
  MoonStars,
  Star,
  UserCircle,
} from "phosphor-react-native";
import PriceInputAlert from "../PriceInputAlert";
import { useFontFamilies } from "../../hooks/useFontFamilies";
import { useT } from "../../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../../hooks/useColors";
import { makeWorkerStyles } from "../../styles/WorkerHomeScreen.styles";
import { summarizeJobDetails } from "../../services/bidding";
import type { WorkerJob } from "../../services/workerJobs";
import { fontStyles } from "../../styles/fonts";

const JOB_TTL_MS = 14000;

// Customer's real photo on a job card, falling back to the gender icon if the
// customer has no uploaded photo (or it fails to load).
function CustomerJobAvatar({
  photo,
  gender,
  s,
  colors,
}: {
  photo?: string | null;
  gender: "male" | "female";
  s: ReturnType<typeof makeWorkerStyles>;
  colors: ReturnType<typeof useColors>;
}) {
  const [failed, setFailed] = useState(false);
  if (photo && !failed) {
    return (
      <Image
        source={{ uri: photo }}
        style={s.jobAvatarImage}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return <UserCircle size={34} color={gender === "male" ? colors.ink : colors.accent} weight="fill" />;
}

type Props = {
  online: boolean;
  onToggleOnline: () => void;
  jobs: WorkerJob[];
  /** jobId -> live offer, owned by WorkerHomeScreen (server-reconciled). */
  pendingOffers: Record<string, { price: number; offerId?: string }>;
  /** Customer turned an offer down. Cleared via onNoticeShown once displayed. */
  notice?: { name: string; at: number } | null;
  onNoticeShown?: () => void;
  onSubmitOffer: (job: WorkerJob, agreedPrice: number) => Promise<boolean>;
  onCancelOffer: (id: string) => void;
  onDecline: (id: string) => void;
};

export default function JobsTab({ online, onToggleOnline, jobs, pendingOffers, notice, onNoticeShown, onSubmitOffer, onCancelOffer, onDecline }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);
  const onlineAnim = useSharedValue(online ? 1 : 0);

  const [counterJob, setCounterJob] = useState<WorkerJob | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnim = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    onlineAnim.value = withTiming(online ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [online, onlineAnim]);

  const onlineCardStyle = useAnimatedStyle(() => ({
    backgroundColor: "#343434",
    borderColor: interpolateColor(onlineAnim.value, [0, 1], ["rgba(0,186,240,0)", colors.accent]),
  }));
  const onlineDotStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(onlineAnim.value, [0, 1], [colors.fgFaint, colors.accent]),
  }));
  const switchTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(onlineAnim.value, [0, 1], ["#4a4b4d", colors.accent]),
    borderColor: interpolateColor(onlineAnim.value, [0, 1], [colors.border, colors.accent]),
  }));
  const switchThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(onlineAnim.value, [0, 1], [0, 22]) }],
  }));

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastAnim.value = 0;
    toastAnim.value = withSpring(1, { damping: 18, stiffness: 220, mass: 0.8 });
    toastTimer.current = setTimeout(() => {
      toastAnim.value = withTiming(0, { duration: 220 }, finished => {
        if (finished) runOnJS(setToast)(null);
      });
    }, 2200);
  };
  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastAnim.value,
    transform: [{ translateY: (1 - toastAnim.value) * 40 }],
  }));

  // A decline is otherwise invisible on this side — the card just quietly
  // reverts. Say it out loud so the worker knows to bid again if they want.
  //
  // The parent clears the notice once shown. Tracking "already seen" in a ref
  // here did NOT work: this tab unmounts when you switch to Earnings, so
  // coming back reset the ref and replayed the same toast every time.
  useEffect(() => {
    if (!notice) return;
    showToast(t("{name} declined your offer", { name: notice.name }));
    onNoticeShown?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  const submitOffer = async (job: WorkerJob, price: number) => {
    // The "Waiting…" state is owned by the parent (it flips optimistically and
    // rolls back on failure), so this only reports the outcome.
    const waiting = await onSubmitOffer(job, price);
    showToast(
      waiting
        ? t("Offer sent to {name}", { name: job.customerName.split(" ")[0] })
        : t("Could not send offer. Try again."),
    );
  };

  const submitCounter = (price: number) => {
    const job = counterJob;
    setCounterJob(null);
    if (!job) return;
    submitOffer(job, price);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Pinned, NOT a ListHeaderComponent: a list header is part of the
          scrollable content, so the toggle and the count scrolled away with
          the cards. Only the cards should move. */}
      <TouchableOpacity style={s.onlineCardTouch} activeOpacity={0.9} onPress={onToggleOnline}>
        <Reanimated.View style={[s.onlineCard, onlineCardStyle]}>
          <Reanimated.View style={[s.onlineDot, onlineDotStyle]} />
          <View style={s.onlineTextBlock}>
            <Text style={[s.onlineTitle, fontStyles.semiBold]}>
              {online ? t("You're online") : t("You're offline")}
            </Text>
            <Text style={[s.onlineSub, fontStyles.medium]}>
              {online ? t("Receiving jobs near you") : t("Go online to start getting jobs")}
            </Text>
          </View>
          <Reanimated.View style={[s.switchTrack, switchTrackStyle]}>
            <Reanimated.View style={[s.switchThumb, switchThumbStyle]} />
          </Reanimated.View>
        </Reanimated.View>
      </TouchableOpacity>
      {online && jobs.length > 0 ? (
        <Text style={[s.sectionLabel, s.sectionLabelInset, fontStyles.semiBold]}>
          {jobs.length === 1
            ? t("1 job near you")
            : t("{count} jobs near you", { count: jobs.length })}
        </Text>
      ) : null}

      <Reanimated.FlatList
        data={online ? jobs : []}
        // Identity only. Including price meant a price change destroyed and
        // recreated the card, replaying its entry animation instead of just
        // updating in place.
        keyExtractor={job => job.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.tabContent}
        itemLayoutAnimation={LinearTransition.duration(260)}
        ListEmptyComponent={
          !online ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconCircle}>
                <MoonStars size={36} color={colors.fgFaint} weight="fill" />
              </View>
              <Text style={[s.emptyTitle, fontStyles.bold]}>{t("You're offline")}</Text>
              <Text style={[s.emptySub, fontStyles.medium]}>
                {t("Flip the switch above to go online and start receiving jobs around you.")}
              </Text>
            </View>
          ) : (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconCircle}>
                <Broom size={36} color={colors.accent} weight="fill" />
              </View>
              <Text style={[s.emptyTitle, fontStyles.bold]}>{t("Looking for jobs…")}</Text>
              <Text style={[s.emptySub, fontStyles.medium]}>
                {t("Hang tight. New requests near you will show up here.")}
              </Text>
            </View>
          )
        }
        renderItem={({ item: job }) => (
          <Reanimated.View
            entering={FadeInDown.duration(320)}
            exiting={FadeOutLeft.duration(240)}
          >
            <JobCard
              job={job}
              pendingPrice={pendingOffers[job.id]?.price}
              onAccept={() => submitOffer(job, job.counterPrice ?? job.price)}
              onCounter={() => setCounterJob(job)}
              onCancelOffer={() => onCancelOffer(job.id)}
              onDecline={() => onDecline(job.id)}
            />
          </Reanimated.View>
        )}
      />

      {toast ? (
        <Reanimated.View style={[s.toast, toastStyle]}>
          <View style={s.toastIcon}>
            <Check size={15} color={colors.white} weight="bold" />
          </View>
          <Text style={[s.toastText, fontStyles.medium]}>{toast}</Text>
        </Reanimated.View>
      ) : null}

      <PriceInputAlert
        visible={!!counterJob}
        title={t("Make your offer")}
        message={
          counterJob
            ? t("{name} offered PKR{price}. Counter with your own price.", {
                name: counterJob.customerName.split(" ")[0],
                price: counterJob.counterPrice ?? counterJob.price,
              })
            : undefined
        }
        initialValue={counterJob ? (counterJob.counterPrice ?? counterJob.price) + 100 : 0}
        onClose={() => setCounterJob(null)}
        onSubmit={submitCounter}
      />
    </View>
  );
}

function JobCard({
  job,
  pendingPrice,
  onAccept,
  onCounter,
  onCancelOffer,
  onDecline,
}: {
  job: WorkerJob;
  pendingPrice?: number;
  onAccept: () => void;
  onCounter: () => void;
  onCancelOffer: () => void;
  onDecline: () => void;
}) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);
  const jobDetailLabel = summarizeJobDetails(job.details, job.detail, t);
  const pulse = useSharedValue(0.4);
  const waiting = pendingPrice != null;
  const price = job.counterPrice ?? job.price;

  // NOTE: Accept is deliberately untimed. It used to run a 14s countdown that
  // auto-declined the request out from under the worker while they were still
  // reading it. The job's real deadline is the server's, and the card leaves
  // the feed when the server says the request is gone.

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[s.jobCard, (waiting || job.counterPrice != null) && s.jobCardFeatured]}>
      <View style={s.jobTopRow}>
        <View style={s.jobAvatar}>
          <CustomerJobAvatar photo={job.customerPhoto} gender={job.avatar} s={s} colors={colors} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.jobCustomerName, fontStyles.semiBold]} numberOfLines={1}>
            {job.customerName}
          </Text>
          <View style={s.jobMetaRow}>
            <Star size={12} color="#ffd400" weight="fill" />
            <Text style={[s.jobMetaText, fontStyles.semiBold]}>{job.customerRating}</Text>
            <Text style={[s.jobMetaText, fontStyles.medium]}>·</Text>
            <Clock size={12} color={colors.whiteSubtle} weight="bold" />
            <Text style={[s.jobMetaText, fontStyles.medium]}>
              {t("{min} min away", { min: job.minutesAway })}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.jobPrice, fontStyles.bold]}>PKR{price}</Text>
          <Text style={[s.jobPriceSub, fontStyles.medium]}>{t(job.payment)}</Text>
        </View>
      </View>

      <View style={s.jobDivider} />

      <View style={s.jobDetailRow}>
        <Text style={[s.jobDetailText, fontStyles.medium]} numberOfLines={1}>
          {t(job.service)} · {jobDetailLabel}
        </Text>
      </View>
      <View style={s.jobDetailRow}>
        <Text style={[s.jobDetailText, fontStyles.medium]} numberOfLines={1}>
          {job.address} · {t("{km} km", { km: job.distanceKm.toFixed(1) })}
        </Text>
      </View>

      {waiting ? (
        <View style={s.offerWaitingBox}>
          <View style={s.offerWaitingRow}>
            <Reanimated.View style={[s.offerPulseDot, pulseStyle]} />
            <Text style={[s.offerWaitingText, fontStyles.medium]} numberOfLines={1}>
              {t("Waiting for {name} to respond…", { name: job.customerName.split(" ")[0] })}
            </Text>
          </View>
          <View style={s.offerCompareRow}>
            <View style={s.offerCompareCell}>
              <Text style={[s.offerCompareLabel, fontStyles.medium]}>{t("Their price")}</Text>
              <Text style={[s.offerCompareValue, fontStyles.semiBold]}>PKR{price}</Text>
            </View>
            <View style={[s.offerCompareCell, s.offerCompareCellMine]}>
              <Text style={[s.offerCompareLabel, fontStyles.medium]}>{t("Your offer")}</Text>
              <Text style={[s.offerCompareValue, fontStyles.bold]}>PKR{pendingPrice}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.cancelOfferButton} activeOpacity={0.85} onPress={onCancelOffer}>
            <Text style={[s.cancelOfferText, fontStyles.semiBold]}>{t("Cancel offer")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {job.counterPrice != null ? (
            <Text style={[s.jobCounterText, fontStyles.semiBold]}>
              {t("Customer offers PKR{price}", { price })}
            </Text>
          ) : null}
          <View style={s.bidTopRow}>
            <TouchableOpacity style={s.declineButton} activeOpacity={0.85} onPress={onDecline}>
              <Text style={[s.declineText, fontStyles.semiBold]}>{t("Decline")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.makeOfferButton} activeOpacity={0.85} onPress={onCounter}>
              <HandCoins size={17} color={colors.ink} weight="fill" />
              <Text style={[s.makeOfferText, fontStyles.semiBold]}>{t("Make offer")}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.acceptFullButton} activeOpacity={0.9} onPress={onAccept}>
            <Check size={18} color={colors.white} weight="bold" />
            <Text style={[s.acceptText, fontStyles.semiBold]}>
              {t("Accept · PKR{price}", { price })}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
