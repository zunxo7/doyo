import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, Gift, HandCoins, Star, Storefront, Ticket, X } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeLoyaltyStyles } from "../styles/LoyaltyScreen.styles";
import {
  fetchCustomerLoyalty,
  getCurrentUserId,
  redeemCustomerReward,
  type CustomerLoyalty,
  type OwnedReward,
} from "../services/bidding";
import { DEFAULT_APP_CONFIG, getAppConfig } from "../services/appConfig";
import type { ActiveReward } from "../services/settings";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "Loyalty">;
};

const REWARD_OPTIONS: ActiveReward[] = DEFAULT_APP_CONFIG.rewards;

export default function LoyaltyScreen({ navigation }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const { settings, setActiveReward } = useSettings();
  const s = useThemedStyles(makeLoyaltyStyles);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loyalty, setLoyalty] = useState<CustomerLoyalty>({ points: 0, transactions: [], owned: [] });
  const [rewardOptions, setRewardOptions] = useState<ActiveReward[]>(REWARD_OPTIONS);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  // A reward tapped without enough points: lit up briefly, with a short notice.
  const [nudge, setNudge] = useState<{ key: string; text: string } | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNudge = (reward: ActiveReward) => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    setNudge({ key: reward.key, text: t("You need {count} more points", { count: reward.points - loyalty.points }) });
    nudgeTimer.current = setTimeout(() => setNudge(null), 400);
  };

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }, []);
  const pointsFor = (base: number) => base;

  useEffect(() => {
    getAppConfig().then(config => setRewardOptions(config.rewards)).catch(() => undefined);
    getCurrentUserId("guest").then(async id => {
      setCustomerId(id);
      setLoyalty(await fetchCustomerLoyalty(id));
    });
  }, []);

  const apply = (owned: OwnedReward) => {
    const option = rewardOptions.find(item => item.key === owned.key);
    setActiveReward({
      key: owned.key,
      label: owned.label,
      amountOff: owned.amountOff,
      points: option?.points ?? 0,
      id: owned.id,
    });
  };

  const redeem = async (reward: ActiveReward) => {
    if (!customerId || redeeming) return;
    setRedeeming(reward.key);
    const next = await redeemCustomerReward(customerId, reward.key).finally(() => setRedeeming(null));
    const owned = next.owned ?? [];
    setLoyalty({ points: next.points, transactions: next.transactions ?? [], owned });
    setShopOpen(false);
    if (next.ok) {
      // The newest of this kind is the one just redeemed: it lapses last.
      const held = owned.filter(item => item.key === reward.key).sort((a, b) => b.expiresAt - a.expiresAt)[0];
      if (held) apply(held);
      setAlert({
        title: t("Reward applied"),
        message: held
          ? t("It will be used on your next request. Use it by {date} or it expires.", { date: formatDay(held.expiresAt) })
          : t("It will be used on your next request."),
      });
    } else {
      setAlert({ title: t("Not enough points"), message: t(next.error ?? "Earn more points and try again.") });
    }
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <FadeInView style={s.headerRow} delay={0} duration={600} keepRasterized>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.85}
        >
          <ArrowLeft size={22} color={colors.white} weight="bold" />
        </TouchableOpacity>
        <Text style={[s.headerTitle, fontStyles.bold]}>{t("Loyalty")}</Text>
      </FadeInView>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <FadeInView delay={150} duration={700} keepRasterized>
          <View style={s.pointsCard}>
            <Text style={[s.pointsLabel, fontStyles.medium]}>{t("Available loyalty points")}</Text>
            <View style={s.pointsValueRow}>
              <Text style={[s.pointsValue, fontStyles.bold]}>{loyalty.points}</Text>
              <View style={s.pointsIcon}>
                <HandCoins size={30} color={colors.accent} weight="fill" />
              </View>
            </View>
            <TouchableOpacity style={s.shopButton} activeOpacity={0.88} onPress={() => setShopOpen(true)}>
              <Storefront size={19} color={colors.white} weight="fill" />
              <Text style={[s.shopButtonText, fontStyles.semiBold]}>{t("Redeem loyalty points")}</Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        <FadeInView delay={220} duration={700} keepRasterized>
          <Text style={[s.sectionLabel, fontStyles.semiBold]}>{t("Your rewards")}</Text>
          {loyalty.owned.length === 0 ? (
            <View style={s.rewardEmpty}>
              <View style={s.rewardOptionIcon}>
                <Ticket size={22} color={colors.whiteSubtle} weight="regular" />
              </View>
              <View style={s.rewardTextBlock}>
                <Text style={[s.rewardOptionTitle, fontStyles.semiBold]}>{t("No rewards yet")}</Text>
                <Text style={[s.rewardOptionSub, fontStyles.medium]}>{t("Rewards you redeem show up here.")}</Text>
              </View>
            </View>
          ) : null}
          {loyalty.owned.map(owned => {
            const applied = settings.activeReward?.id === owned.id;
            const daysLeft = Math.ceil((owned.expiresAt - Date.now()) / 86_400_000);
            return (
              <View key={owned.id} style={[s.rewardOption, applied && s.rewardHeld]}>
                <View style={s.rewardOptionIcon}>
                  <Ticket size={22} color={colors.accent} weight="fill" />
                </View>
                <View style={s.rewardTextBlock}>
                  <Text style={[s.rewardOptionTitle, fontStyles.semiBold]}>{t(owned.label)}</Text>
                  <Text style={[s.rewardOptionSub, daysLeft <= 3 && s.rewardExpiring, fontStyles.medium]}>
                    {daysLeft <= 3
                      ? t("Expires in {count} days", { count: Math.max(1, daysLeft) })
                      : t("Expires {date}", { date: formatDay(owned.expiresAt) })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.rewardUse, applied && s.rewardRemove]}
                  activeOpacity={0.85}
                  onPress={() => (applied ? setActiveReward(null) : apply(owned))}
                >
                  <Text style={[s.rewardUseText, fontStyles.semiBold]}>{applied ? t("Remove") : t("Apply")}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </FadeInView>

        <FadeInView delay={300} duration={700} keepRasterized>
          <View style={s.sectionLabelRow}>
            <Text style={[s.sectionLabel, s.sectionLabelInRow, fontStyles.semiBold]}>{t("How to Earn")}</Text>
          </View>
          <View style={s.infoCard}>
            <InfoRow Icon={Gift} text={t("1 booking = {count} loyalty points", { count: pointsFor(10) })} fonts={fonts} />
            <InfoRow Icon={Star} text={t("5-star review = {count} loyalty points", { count: pointsFor(5) })} fonts={fonts} />
          </View>
        </FadeInView>
      </ScrollView>

      <Modal visible={shopOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShopOpen(false)}>
        <View style={s.shopOverlay}>
          <TouchableOpacity style={s.shopScrim} activeOpacity={1} onPress={() => setShopOpen(false)} />
          <View style={s.shopSheet}>
            <View style={s.shopHeader}>
              <View style={s.shopHeaderText}>
                <Text style={[s.shopTitle, fontStyles.bold]}>{t("Redeem loyalty points")}</Text>
              </View>
              <TouchableOpacity style={s.shopClose} onPress={() => setShopOpen(false)} activeOpacity={0.85}>
                <X size={18} color={colors.white} weight="bold" />
              </TouchableOpacity>
            </View>

            {rewardOptions.map(reward => {
              const affordable = loyalty.points >= reward.points;
              return (
                <TouchableOpacity
                  key={reward.key}
                  style={[s.shopItem, !affordable && nudge?.key !== reward.key && s.shopItemLocked]}
                  activeOpacity={affordable ? 1 : 0.9}
                  onPress={() => (affordable ? undefined : showNudge(reward))}
                >
                  <View style={s.rewardOptionIcon}>
                    <Ticket size={22} color={colors.accent} weight="fill" />
                  </View>
                  <View style={s.rewardTextBlock}>
                    <Text style={[s.rewardOptionTitle, fontStyles.semiBold]}>{t(reward.label)}</Text>
                  </View>
                  {/* The price is the button. Short of points, the whole row is greyed and a tap explains why. */}
                  <TouchableOpacity
                    style={s.rewardUse}
                    activeOpacity={0.85}
                    onPress={() => (affordable ? void redeem(reward) : showNudge(reward))}
                    disabled={!!redeeming}
                  >
                    {redeeming === reward.key ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={[s.rewardUseText, fontStyles.semiBold]}>
                        {t("{count} pts", { count: reward.points })}
                      </Text>
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {/* The notice takes the footer's line, so nothing in the sheet moves. */}
            <Text style={[s.shopFoot, nudge && s.shopFootNudge, fontStyles.medium]}>
              {nudge ? nudge.text : t("Redeemed rewards stay valid for 30 days.")}
            </Text>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={!!alert}
        title={alert?.title ?? ""}
        message={alert?.message}
        onClose={() => setAlert(null)}
      />
    </ScreenBackground>
  );
}

const formatDay = (at: number) => new Date(at).toLocaleDateString([], { day: "numeric", month: "short" });

function InfoRow({
  Icon,
  text,
  fonts,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: "fill" | "bold" | "regular" }>;
  text: string;
  fonts: ReturnType<typeof useFontFamilies>;
}) {
  const colors = useColors();
  const s = useThemedStyles(makeLoyaltyStyles);
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Icon size={20} color={colors.accent} weight="fill" />
      </View>
      <Text style={[s.infoText, fontStyles.medium]}>{text}</Text>
    </View>
  );
}
