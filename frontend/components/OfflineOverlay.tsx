import React, { useEffect, useState } from "react";
import { Image, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { PaperPlaneRight } from "phosphor-react-native";
import FadeInView from "./FadeInView";
import ScreenBackground from "./ScreenBackground";
import AppLogo from "./AppLogo";
import CustomAlert from "./CustomAlert";
import { useSettings, useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { makeCommon } from "../styles/common";
import { makeOnboardingStyles } from "../styles/OnboardingScreen.styles";
import { makeSupportStyles } from "../styles/SupportScreen.styles";
import { fontStyles } from "../styles/fonts";

const SUPPORT_EMAIL = "support@letdoyo.com";
const CATEGORIES = ["Bug / crash", "Payment issue", "Worker issue", "Suggestion", "Other"];

function isOfflineState(state: { isConnected: boolean | null; isInternetReachable: boolean | null }) {
  return state.isConnected === false || state.isInternetReachable === false;
}

export default function OfflineOverlay() {
  const [offline, setOffline] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const t = useT();
  const fonts = useFontFamilies();
  const colors = useColors();
  const common = useThemedStyles(makeCommon);
  const onboarding = useThemedStyles(makeOnboardingStyles);
  const support = useThemedStyles(makeSupportStyles);
  const { settings } = useSettings();
  const overlayAnim = useSharedValue(0);
  const reportAnim = useSharedValue(0);

  const canSubmit = details.trim().length >= 5;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (isOfflineState(state)) {
        setOffline(true);
        setVisible(true);
      }
    });
    NetInfo.fetch().then(state => {
      if (isOfflineState(state)) {
        setOffline(true);
        setVisible(true);
      }
    }).catch(() => undefined);
    return unsubscribe;
  }, []);

  const retry = () => {
    NetInfo.fetch().then(state => {
      if (isOfflineState(state)) {
        setOffline(true);
        setVisible(true);
        return;
      }
      overlayAnim.value = withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }, finished => {
        if (finished) {
          runOnJS(setVisible)(false);
          runOnJS(setOffline)(false);
          runOnJS(setReportOpen)(false);
        }
      });
    }).catch(() => setOffline(true));
  };

  useEffect(() => {
    if (!visible) return;
    overlayAnim.value = 0;
    overlayAnim.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [overlayAnim, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayAnim.value,
    transform: [
      { translateY: (1 - overlayAnim.value) * 10 },
      { scale: 0.985 + overlayAnim.value * 0.015 },
    ],
  }));

  useEffect(() => {
    if (!reportOpen) return;
    reportAnim.value = 0;
    reportAnim.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [reportAnim, reportOpen]);

  const reportSheetStyle = useAnimatedStyle(() => ({
    opacity: reportAnim.value,
    transform: [{ translateY: (reportAnim.value - 1) * 360 }],
  }));

  const closeReport = () => {
    reportAnim.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, finished => {
      if (finished) runOnJS(setReportOpen)(false);
    });
  };

  const submitReport = async () => {
    if (!canSubmit) return;
    const subject = `Doyo support: ${category}`;
    const body =
      `${details.trim()}\n\n` +
      `---\n` +
      `Category: ${category}\n` +
      `Platform: ${Platform.OS} ${Platform.Version}\n` +
      `App: Doyo\n` +
      `Connection: offline screen`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const opened = await Linking.openURL(url).then(() => true).catch(() => false);
    if (!opened) {
      setAlert({
        title: t("No email app found"),
        message: `Please email us directly at ${SUPPORT_EMAIL}.`,
      });
      return;
    }
    setDetails("");
    closeReport();
  };

  if (!offline && !visible) return null;

  return (
    <Reanimated.View style={[styles.overlay, overlayStyle]} pointerEvents="auto">
      <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
        <FadeInView style={onboarding.logoContainer} delay={0} duration={480}>
          <AppLogo iconSize={32} fontSize={24} />
        </FadeInView>

        <FadeInView delay={100} duration={600} style={onboarding.contentWrapper}>
          <View style={[onboarding.slide, styles.slide]}>
            <Image
              source={require("../assets/images/Illustration5.webp")}
              style={onboarding.illustration}
              resizeMode="contain"
            />
            <View style={onboarding.textBlock}>
              <Text
                style={[
                  onboarding.title,
                  styles.title,
                  settings.language === "ur" && styles.rtlText,
                  fontStyles.bold,
                ]}
              >
                {t("Something isn't")}{" "}
                <Text style={onboarding.titleAccent}>{t("loading")}</Text>
              </Text>
              <Text
                style={[
                  onboarding.body,
                  styles.body,
                  settings.language === "ur" && styles.rtlText,
                  fontStyles.medium,
                ]}
              >
                {t("Please check your internet and try again. If the issue stays, our support team is here to help")}
              </Text>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={200} duration={460} style={onboarding.ctaContainer}>
          <TouchableOpacity style={common.button} activeOpacity={0.85} onPress={retry}>
            <Text
              style={[common.buttonText, styles.buttonText, fontStyles.semiBold]}
            >
              Try again
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[common.button, onboarding.emailButton]}
            activeOpacity={0.85}
            onPress={() => setReportOpen(true)}
          >
            <Text style={[common.buttonText, onboarding.emailButtonText, styles.buttonText, fontStyles.semiBold]}>
              {t("Support")}
            </Text>
          </TouchableOpacity>
        </FadeInView>

        <View style={onboarding.footer} />

        {reportOpen ? (
          <View style={support.reportOverlay}>
            <TouchableOpacity style={support.reportBackdrop} activeOpacity={1} onPress={closeReport} />
            <Reanimated.View style={[support.reportSheet, reportSheetStyle]}>
              <Text style={[support.reportSheetTitle, fontStyles.bold]}>{t("Describe the issue")}</Text>

              <Text style={[support.label, fontStyles.semiBold]}>{t("What's this about?")}</Text>
              <View style={support.chipsRow}>
                {CATEGORIES.map(cat => {
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[support.chip, active && support.chipActive]}
                      activeOpacity={0.85}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[support.chipText, active && support.chipTextActive, fontStyles.semiBold]}>
                        {t(cat)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[support.textArea, styles.textArea, fontStyles.medium]}
                value={details}
                onChangeText={setDetails}
                placeholder={t("Tell us what happened, and what you expected instead...")}
                placeholderTextColor={colors.navy + "88"}
                multiline
              />

              <TouchableOpacity
                style={[support.submitButton, !canSubmit && support.submitButtonDisabled]}
                activeOpacity={0.9}
                disabled={!canSubmit}
                onPress={submitReport}
              >
                <PaperPlaneRight size={20} color={colors.white} weight="fill" />
                <Text style={[support.submitText, fontStyles.semiBold]}>{t("Send report")}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={support.cancelButton} activeOpacity={0.85} onPress={closeReport}>
                <Text style={[support.cancelButtonText, fontStyles.semiBold]}>{t("Cancel")}</Text>
              </TouchableOpacity>
            </Reanimated.View>
          </View>
        ) : null}

        <CustomAlert
          visible={!!alert}
          title={alert?.title ?? ""}
          message={alert?.message}
          onClose={() => setAlert(null)}
        />
      </ScreenBackground>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    elevation: 999,
    backgroundColor: "#0b0b0c",
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    marginTop: 0,
    paddingBottom: 8,
  },
  title: {
    lineHeight: 39,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  buttonText: {
    lineHeight: 20,
  },
  textArea: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0a2f50",
  },
  rtlText: {
    textAlign: "center",
    writingDirection: "rtl",
  },
});
