import React, { useEffect, useState } from "react";
import {
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  FadeInDown,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  ArrowLeft,
  CaretRight,
  Clock,
  EnvelopeSimple,
  IdentificationCard,
  ShieldCheck,
  Smiley,
  Sparkle,
  Star,
  UserCircle,
  UsersThree,
  X,
} from "phosphor-react-native";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import type { Palette } from "../styles/colors";
import type { Offer } from "./OffersOverlay";
import { fontStyles } from "../styles/fonts";

const COMPLIMENTS = [
  { label: "Clean & thorough", count: 4, Icon: Sparkle },
  { label: "Polite worker", count: 3, Icon: Smiley },
  { label: "On time", count: 3, Icon: Clock },
  { label: "Careful with items", count: 2, Icon: ShieldCheck },
];

// Matches Doyo's actual worker onboarding (CNIC upload, OTP, work proof,
// manual approval gate) — keep in sync with the worker flow
const VERIFICATIONS = [
  {
    title: "CNIC verification",
    detail: "Front and back of the national ID card are submitted and checked for validity",
    Icon: IdentificationCard,
  },
  {
    title: "Verified email",
    detail: "Confirmed with a one-time code at signup",
    Icon: EnvelopeSimple,
  },
  {
    title: "Proof of work",
    detail: "Workers submit proof of their service skills before joining",
    Icon: Sparkle,
  },
  {
    title: "Manual approval",
    detail: "Every worker is reviewed by our team before they can take jobs",
    Icon: UsersThree,
  },
];

interface Props {
  visible: boolean;
  offer: Offer | null;
  onClose: () => void;
}

/** Worker profile bottom sheet, with a "What we verify" sub-view. */
export default function WorkerProfileSheet({ visible, offer, onClose }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { height: SCREEN_H } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [view, setView] = useState<"profile" | "verify">("profile");
  const [photoFailed, setPhotoFailed] = useState(false);
  const anim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setView("profile");
      setPhotoFailed(false);
      setMounted(true);
      anim.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      anim.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (view === "verify") setView("profile");
      else onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, view, onClose]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: anim.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - anim.value) * 560 }],
  }));

  if (!mounted || !offer) return null;

  return (
    <View style={s.overlay}>
      <Reanimated.View style={[s.scrim, scrimStyle]} />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

      <Reanimated.View
        layout={LinearTransition.duration(240)}
        style={[s.sheet, { maxHeight: SCREEN_H * 0.85 }, sheetStyle]}
      >
        {view === "profile" ? (
          <Reanimated.View key="profile" entering={FadeInDown.duration(220)}>
            <TouchableOpacity
              style={s.cornerButton}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.85}
            >
              <X size={18} color={colors.white} weight="bold" />
            </TouchableOpacity>

            <View style={s.avatarWrap}>
              <View style={s.avatar}>
                {offer.photo && !photoFailed ? (
                  <Image
                    source={{ uri: offer.photo }}
                    style={s.avatarImage}
                    resizeMode="cover"
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  <UserCircle size={64} color={colors.ink} weight="fill" />
                )}
              </View>
              <Text style={[s.name, fontStyles.bold]} numberOfLines={1}>
                {offer.name}
              </Text>
            </View>

            <View style={s.statsRow}>
              <View style={s.statBlock}>
                <Text style={[s.statValue, fontStyles.bold]}>{offer.jobs}</Text>
                <Text style={[s.statLabel, fontStyles.medium]}>{t("jobs")}</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBlock}>
                <View style={s.ratingRow}>
                  <Text style={[s.statValue, fontStyles.bold]}>{offer.rating}</Text>
                  <Star size={14} color="#ffd400" weight="fill" />
                </View>
                <Text style={[s.statLabel, fontStyles.medium]}>{t("rating")}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.verifyRow}
              activeOpacity={0.85}
              onPress={() => setView("verify")}
            >
              <ShieldCheck size={20} color={colors.accent} weight="fill" />
              <Text style={[s.verifyRowText, fontStyles.semiBold]}>
                {t("Completed verifications")}
              </Text>
              <CaretRight size={16} color={colors.whiteSubtle} weight="bold" />
            </TouchableOpacity>

            <Text style={[s.sectionTitle, fontStyles.bold]}>{t("Compliments")}</Text>
            <View style={s.complimentsRow}>
              {COMPLIMENTS.map(({ label, count, Icon }) => (
                <View key={label} style={s.complimentItem}>
                  <View style={s.complimentIconWrap}>
                    <Icon size={26} color={colors.accent} weight="bold" />
                    <View style={s.complimentBadge}>
                      <Text style={[s.complimentBadgeText, fontStyles.semiBold]}>
                        {count}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.complimentLabel, fontStyles.medium]}>{t(label)}</Text>
                </View>
              ))}
            </View>
          </Reanimated.View>
        ) : (
          <Reanimated.View key="verify" entering={FadeInDown.duration(220)}>
            <TouchableOpacity
              style={s.cornerButton}
              onPress={() => setView("profile")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.85}
            >
              <ArrowLeft size={18} color={colors.white} weight="bold" />
            </TouchableOpacity>

            <Text style={[s.verifyTitle, fontStyles.bold]}>{t("What we verify")}</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.verifyList}>
              {VERIFICATIONS.map(({ title, detail, Icon }) => (
                <View key={title} style={s.verifyItem}>
                  <View style={s.verifyIconWrap}>
                    <Icon size={22} color={colors.accent} weight="duotone" />
                  </View>
                  <View style={s.verifyTextBlock}>
                    <Text style={[s.verifyItemTitle, fontStyles.semiBold]}>{t(title)}</Text>
                    <Text style={[s.verifyItemDetail, fontStyles.medium]}>{t(detail)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Reanimated.View>
        )}
      </Reanimated.View>
    </View>
  );
}

const makeStyles = (c: Palette) => {
  const verificationSurface = "#343434";
  const complimentSurface = "#3b3c3e";

  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: "flex-end",
      zIndex: 40,
    },
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.scrim,
    },
    sheet: {
      backgroundColor: "#1d1d1d",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 30,
      overflow: "hidden",
    },
    cornerButton: {
      position: "absolute",
      top: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#37383a",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },

    // ---- Profile view ----
    avatarWrap: {
      alignItems: "center",
      marginTop: 6,
    },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: "#ffffff",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: 84,
      height: 84,
      borderRadius: 42,
    },
    name: {
      fontSize: 19,
      color: c.white,
      marginTop: 10,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 28,
      marginTop: 16,
    },
    statBlock: {
      alignItems: "center",
      minWidth: 70,
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: "#4f5052",
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      fontSize: 20,
      color: c.white,
    },
    statLabel: {
      fontSize: 12,
      color: c.whiteSubtle,
      marginTop: 2,
    },
    verifyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: verificationSurface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginTop: 20,
    },
    verifyRowText: {
      flex: 1,
      fontSize: 14,
      color: c.white,
    },
    sectionTitle: {
      fontSize: 17,
      color: c.white,
      marginTop: 20,
      marginBottom: 14,
    },
    complimentsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    complimentItem: {
      alignItems: "center",
      width: "23%",
    },
    complimentIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: complimentSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    complimentBadge: {
      position: "absolute",
      top: -5,
      right: -7,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: "#ffffff",
      alignItems: "center",
      justifyContent: "center",
    },
    complimentBadgeText: {
      fontSize: 11,
      color: c.ink,
    },
    complimentLabel: {
      fontSize: 11,
      color: c.whiteSubtle,
      textAlign: "center",
      marginTop: 7,
      lineHeight: 14,
    },

    // ---- Verify view ----
    verifyTitle: {
      fontSize: 19,
      color: c.white,
      marginTop: 4,
      marginBottom: 16,
    },
    verifyList: {
      gap: 16,
      paddingBottom: 4,
    },
    verifyItem: {
      flexDirection: "row",
      gap: 12,
    },
    verifyIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: verificationSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    verifyTextBlock: {
      flex: 1,
    },
    verifyItemTitle: {
      fontSize: 14.5,
      color: c.white,
    },
    verifyItemDetail: {
      fontSize: 12.5,
      color: c.whiteSubtle,
      lineHeight: 17,
      marginTop: 2,
    },
  });
};
