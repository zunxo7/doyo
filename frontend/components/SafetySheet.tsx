import React, { useEffect, useState } from "react";
import {
  BackHandler,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  IdentificationCard,
  SealCheck,
  ShareFat,
  ShieldCheck,
  Siren,
  Sparkle,
  X,
} from "phosphor-react-native";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import type { Palette } from "../styles/colors";
import { getJobStatusShareUrl } from "../services/bidding";
import { fontStyles } from "../styles/fonts";

// Pakistan's emergency service (Rescue 1122)
const EMERGENCY_NUMBER = "1122";

const PROTECTIONS = [
  { label: "Proactive safety support", Icon: ShieldCheck },
  { label: "Workers verification", Icon: IdentificationCard },
  { label: "Protecting your privacy", Icon: SealCheck },
  { label: "Staying safe on every job", Icon: Sparkle },
];

interface Props {
  visible: boolean;
  workerName?: string;
  jobId?: string;
  /** Short code for the shareable link; falls back to the raw job id. */
  shareCode?: string | null;
  serviceLabel?: string;
  address?: string;
  price?: number;
  onClose: () => void;
}

/** Bottom-sheet safety features overlay (share job, emergency call, info). */
export default function SafetySheet({ visible, workerName, jobId, shareCode, serviceLabel, address, price, onClose }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { height: SCREEN_H } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const anim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
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
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: anim.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - anim.value) * 560 }],
  }));

  const shareJob = async () => {
    // Short link, no query string, no duplicated details. It used to carry
    // worker/service/price/address BOTH as URL parameters and again as text —
    // a wall of %28encoded%29 noise wrapping a 36-character uuid. The page
    // reads everything from the server, so the link only needs to identify
    // the job.
    const url = getJobStatusShareUrl(shareCode || jobId || "shared");
    try {
      await Share.share({
        message: `Follow my Doyo job live:\n${url}`,
        url,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  const callEmergency = () => {
    Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(() => undefined);
  };

  if (!mounted) return null;

  return (
    <View style={s.overlay}>
      <Reanimated.View style={[s.scrim, scrimStyle]} />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

      <Reanimated.View style={[s.sheet, { maxHeight: SCREEN_H * 0.82 }, sheetStyle]}>
        <View style={s.titleRow}>
          <View style={s.titleSide} />
          <Text style={[s.title, fontStyles.bold]}>{t("Safety features")}</Text>
          <TouchableOpacity
            style={s.closeButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.85}
          >
            <X size={18} color={colors.white} weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={s.featureGrid}>
            <TouchableOpacity style={s.featureCard} activeOpacity={0.86} onPress={shareJob}>
              <ShareFat size={28} color={colors.white} weight="regular" />
              <Text style={[s.featureTitle, fontStyles.semiBold]}>{t("Share my job")}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.emergencyButton} activeOpacity={0.88} onPress={callEmergency}>
            <Siren size={23} color={colors.white} weight="regular" />
            <Text style={[s.emergencyText, fontStyles.semiBold]}>
              {t("Call {number}", { number: EMERGENCY_NUMBER })}
            </Text>
          </TouchableOpacity>

          <Text style={[s.sectionTitle, fontStyles.bold]}>{t("How you're protected")}</Text>
          <View style={s.protectionGrid}>
            {PROTECTIONS.map(({ label, Icon }) => (
              <View key={label} style={s.protectionCard}>
                <Text style={[s.protectionLabel, fontStyles.semiBold]}>{t(label)}</Text>
                <View style={s.protectionIcon}>
                  <Icon size={28} color={colors.accent} weight="duotone" />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Reanimated.View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
      paddingHorizontal: 18,
      paddingTop: 18,
      overflow: "hidden",
    },
    titleRow: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      minHeight: 34,
    },
    titleSide: {
      display: "none",
    },
    title: {
      fontSize: 19,
      color: c.white,
      textAlign: "center",
    },
    closeButton: {
      position: "absolute",
      top: -5,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#37383a",
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      paddingBottom: 30,
    },
    featureGrid: {
      marginBottom: 14,
    },
    featureCard: {
      minHeight: 78,
      borderRadius: 18,
      backgroundColor: "#37383a",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 10,
    },
    featureTitle: {
      color: c.white,
      fontSize: 15.5,
      textAlign: "center",
      lineHeight: 20,
    },
    emergencyButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#b91c1c",
      borderRadius: 14,
      height: 52,
      marginBottom: 18,
    },
    emergencyText: {
      fontSize: 16,
      color: c.white,
    },
    sectionTitle: {
      fontSize: 19,
      color: c.white,
      marginBottom: 12,
      marginTop: 2,
    },
    protectionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    protectionCard: {
      width: "47.5%",
      flexGrow: 1,
      backgroundColor: "#37383a",
      borderRadius: 18,
      padding: 14,
      minHeight: 96,
      justifyContent: "space-between",
    },
    protectionLabel: {
      fontSize: 13.5,
      color: c.white,
      lineHeight: 18,
    },
    protectionIcon: {
      alignSelf: "flex-end",
    },
  });
