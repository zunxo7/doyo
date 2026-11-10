import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ImageStyle } from "react-native";
import { Clock, Coins, Lock, Plus, Receipt, Wallet } from "phosphor-react-native";
import WalletSheet from "./WalletSheet";
import { useFontFamilies } from "../../hooks/useFontFamilies";
import { useT } from "../../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../../hooks/useColors";
import LaunchCountdown from "../LaunchCountdown";
import { makeWorkerStyles } from "../../styles/WorkerHomeScreen.styles";
import { WORKER_COMMISSION_LIMIT, type WorkerTxn } from "../../services/workerJobs";
import { fetchWorkerEarnings, EMPTY_WORKER_EARNINGS, type WorkerEarnings } from "../../services/bidding";
import {
  getAppConfig,
  getCachedAppConfig,
  getLaunchWindow,
  isCommissionPaymentsLocked,
  type AppConfig,
} from "../../services/appConfig";
import { fontStyles } from "../../styles/fonts";

type Props = {
  workerId: string;
  /**
   * The earnings WorkerHomeScreen already fetched on entering worker mode.
   * This tab is a conditional render, so it remounts on every tab switch —
   * without this it started from zero and refetched each time, flashing the
   * empty state before the numbers arrived.
   */
  initial?: WorkerEarnings;
};

/**
 * Doodle pattern that fully fills its parent card. An <Image> with resizeMode
 * "cover" sized only by top/left/right/bottom:0 doesn't fill reliably (it leaves
 * edges bare), so we measure the card and give the image explicit pixel
 * width/height — same fix used on the customer home panel.
 */
function CardPattern({ style }: { style?: StyleProp<ImageStyle> }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setSize(prev => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
      }}
    >
      {size ? (
        <Image
          source={require("../../assets/images/BackgroundPatternNeutral.png")}
          style={[style, { position: "absolute", top: 0, left: 0, width: size.w, height: size.h }]}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}

export default function EarningsTab({ workerId, initial }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [summary, setSummary] = useState<WorkerEarnings>(initial ?? EMPTY_WORKER_EARNINGS);
  const [activityScrollActive, setActivityScrollActive] = useState(false);
  // See CustomerHomeScreen: the cache is warm before this mounts. Starting
  // from the defaults showed the commission lock overlay on every single visit
  // — the bundled campaign is enabled and inside its window, the server's is
  // not — and then dropped it once the fetch landed.
  const [appConfig, setAppConfig] = useState<AppConfig>(getCachedAppConfig);
  const [nowTick, setNowTick] = useState(Date.now());
  const [activityContentHeight, setActivityContentHeight] = useState(0);
  const activityScrollY = useRef(new Animated.Value(0)).current;
  const activityViewportHeight = 224;
  const activityThumbHeight = activityContentHeight > 0
    ? Math.max(36, (activityViewportHeight / activityContentHeight) * activityViewportHeight)
    : activityViewportHeight;
  const activityMaxScroll = Math.max(1, activityContentHeight - activityViewportHeight);
  const activityThumbTravel = Math.max(0, activityViewportHeight - activityThumbHeight);
  const activityThumbTranslateY = activityScrollY.interpolate({
    inputRange: [0, activityMaxScroll],
    outputRange: [0, activityThumbTravel],
    extrapolate: "clamp",
  });
  const showActivityScrollbar = activityContentHeight > activityViewportHeight;
  const launchWindow = getLaunchWindow(appConfig, nowTick);
  const launchActive = launchWindow.active;
  // Backend-controlled gate: "auto" follows the promo window, or force via config.
  const commissionLocked = isCommissionPaymentsLocked(appConfig, nowTick);
  // Hide zero-value commission rows already written during the 0% campaign —
  // the server no longer creates them, but existing ledgers still hold some.
  const activityTransactions = useMemo(
    () => summary.transactions.filter(txn => !(txn.type === "commission" && txn.amount === 0)),
    [summary.transactions],
  );

  useEffect(() => {
    let active = true;
    getAppConfig().then(config => {
      if (active) setAppConfig(config);
    });
    // 60s: <LaunchCountdown/> owns the 1Hz tick for the seconds. This tick only
    // feeds launchActive and commissionLocked, which move on day boundaries.
    const timer = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!workerId) return;
    let active = true;
    fetchWorkerEarnings(workerId).then(next => {
      if (active) setSummary(next);
    });
    return () => {
      active = false;
    };
  }, [workerId]);

  // The commission was already reduced server-side by the payment callback —
  // just refetch the authoritative numbers.
  const handleToppedUp = async () => {
    if (!workerId) return;
    setSummary(await fetchWorkerEarnings(workerId));
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        scrollEnabled={false}
        contentContainerStyle={[s.tabContent, s.earningsTabContent]}
      >
        {/* Commission balance card */}
        <View style={s.balanceCard}>
          <CardPattern style={s.balancePattern} />
          <Text style={[s.balanceLabel, fontStyles.medium]}>{t("Commission to settle")}</Text>
          <Text style={[s.balanceValue, fontStyles.bold]}>
            PKR{summary.commissionDue.toLocaleString()}
          </Text>
          <Text style={[s.balanceNote, fontStyles.semiBold]}>
            {t("Top up before PKR{limit} or you'll stop getting jobs.", {
              limit: WORKER_COMMISSION_LIMIT.toLocaleString(),
            })}
          </Text>
          <View style={s.balanceButtons}>
            <TouchableOpacity style={s.balanceBtn} activeOpacity={0.9} onPress={() => setTopUpOpen(true)}>
              <Plus size={18} color={colors.ink} weight="bold" />
              <Text style={[s.balanceBtnText, fontStyles.semiBold]}>{t("Top up")}</Text>
            </TouchableOpacity>
          </View>
          {commissionLocked ? (
            <View style={s.commissionLockedOverlay}>
              <View style={s.commissionLockIcon}>
                <Lock size={30} color={colors.white} weight="fill" />
              </View>
              <View style={s.commissionLockTextBlock}>
                <Text style={[s.commissionLockTitle, fontStyles.bold]}>
                  {launchActive
                    ? t("Workers pay 0% commission for the first month")
                    : t("Commission payments are paused")}
                </Text>
                <Text style={[s.commissionLockCopy, fontStyles.medium]}>
                  {launchActive
                    ? t("Keep everything you earn during the launch offer.")
                    : t("You don't need to pay anything right now.")}
                </Text>
                {launchActive ? (
                  <View style={s.commissionTimerRow}>
                    <Clock size={14} color={colors.white} weight="fill" />
                    <Text style={[s.commissionTimerText, fontStyles.semiBold]}>
                      {t("Gift Ending In:")} <LaunchCountdown endsAt={launchWindow.endsAt} t={t} />
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        {/* Earnings stats (paid directly by customers) */}
        <Text style={[s.sectionLabel, s.sectionLabelInset, fontStyles.semiBold]}>{t("Statistics")}</Text>
        <View style={s.statPairRow}>
          <View style={s.statTile}>
            <Text style={[s.statTileValue, fontStyles.bold]}>
              PKR{summary.totalEarned.toLocaleString()}
            </Text>
            <Text style={[s.statTileLabel, fontStyles.medium]}>
              {t("All time - {n} jobs", { n: summary.jobsCompleted })}
            </Text>
          </View>
          <View style={s.statTile}>
            <Text style={[s.statTileValue, fontStyles.bold]}>
              PKR{summary.today.toLocaleString()}
            </Text>
            <Text style={[s.statTileLabel, fontStyles.medium]}>
              {t("Earned today - {n} jobs", { n: summary.todayJobs })}
            </Text>
          </View>
        </View>

        {/* Transactions */}
        <Text style={[s.sectionLabel, s.sectionLabelInset, fontStyles.semiBold]}>{t("Recent Activity")}</Text>
        {summary.transactions.length > 0 ? (
          <View
            style={s.txnScroller}
            onTouchStart={() => setActivityScrollActive(true)}
            onTouchEnd={() => setActivityScrollActive(false)}
            onTouchCancel={() => setActivityScrollActive(false)}
          >
            <Animated.FlatList
              data={activityTransactions}
              keyExtractor={txn => txn.id}
              renderItem={({ item: txn, index }) => <TxnRow txn={txn} first={index === 0} />}
              style={s.txnScrollView}
              contentContainerStyle={s.txnList}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onContentSizeChange={(_, height) => setActivityContentHeight(height)}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: activityScrollY } } }],
                { useNativeDriver: false },
              )}
              onScrollBeginDrag={() => setActivityScrollActive(true)}
              onMomentumScrollEnd={() => setActivityScrollActive(false)}
            />
            {showActivityScrollbar ? (
              <View style={s.txnScrollTrack} pointerEvents="none">
                <Animated.View
                  style={[
                    s.txnScrollThumb,
                    {
                      height: activityThumbHeight,
                      transform: [{ translateY: activityThumbTranslateY }],
                    },
                  ]}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={s.txnEmpty}>
            <Receipt size={28} color={colors.fgFaint} weight="fill" />
            <Text style={[s.txnEmptyText, fontStyles.medium]}>
              {t("No activity yet. Your earnings and commission will show up here.")}
            </Text>
          </View>
        )}
      </ScrollView>

      <WalletSheet
        visible={topUpOpen}
        workerId={workerId}
        due={summary.commissionDue}
        onClose={() => setTopUpOpen(false)}
        onToppedUp={handleToppedUp}
      />
    </View>
  );
}

function TxnRow({ txn, first }: { txn: WorkerTxn; first: boolean }) {
  const fonts = useFontFamilies();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);
  // Commission is ALWAYS money leaving the worker — red, with a minus — even
  // if a row somehow carries a non-negative amount.
  const isOut = txn.amount < 0 || txn.type === "commission";

  const Icon = txn.type === "commission" ? Receipt : (txn.type === "topup" || txn.type === "payout") ? Wallet : Coins;

  return (
    <View style={[s.txnRow, !first && s.txnDivider]}>
      <View style={s.txnIcon}>
        <Icon size={18} color={isOut ? colors.danger : "#30d17b"} weight="fill" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.txnLabel, fontStyles.semiBold]} numberOfLines={1}>
          {txn.label}
        </Text>
        <Text style={[s.txnSub, fontStyles.medium]} numberOfLines={1}>
          {txn.sub} · {txn.date}
        </Text>
      </View>
      <Text style={[s.txnAmount, isOut && s.txnAmountOut, fontStyles.bold]}>
        {txn.type === "payout" ? "" : isOut ? "−" : "+"}PKR{Math.abs(txn.amount).toLocaleString()}
      </Text>
    </View>
  );
}

