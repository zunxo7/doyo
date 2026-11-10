import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { enterRiskyCall, leaveRiskyCall } from "../services/breadcrumbs";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ArrowLeft, Clock, ImageSquare, EnvelopeSimple, PaperPlaneRight, ShieldCheck, Trash } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeSupportStyles } from "../styles/SupportScreen.styles";
import { RootStackParamList } from "../navigation/types";
import { submitSupportReport } from "../services/bidding";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "Support">;
};

const SUPPORT_EMAIL = "support@letdoyo.com";
const CATEGORIES = ["Bug / crash", "Payment issue", "Worker issue", "Suggestion", "Other"];

export default function SupportScreen({ navigation }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const s = useThemedStyles(makeSupportStyles);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const reportAnim = useSharedValue(0);

  const canSubmit = details.trim().length >= 5;

  React.useEffect(() => {
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

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await submitSupportReport({ category, details: details.trim(), attachmentUri });
      setDetails("");
      setAttachmentUri(null);
      closeReport();
      setAlert({ title: t("Report sent"), message: t("Thanks — our support team will review it shortly.") });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("Please try again shortly.");
      const rateLimited = /two reports|ten minutes|today's limit/i.test(message);
      setAlert({
        title: rateLimited ? t("Report limit reached") : t("Couldn't send report"),
        message: rateLimited ? t("You can't send any more reports right now. Please try again later.") : message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const emailSupport = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Doyo support")}`;
    const opened = await Linking.openURL(url).then(() => true).catch(() => false);
    if (!opened) {
      setAlert({
        title: t("No email app found"),
        message: `Please email us directly at ${SUPPORT_EMAIL}.`,
      });
    }
  };

  const pickAttachment = async () => {
    enterRiskyCall("support_attachment", "support attachment, gallery");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    leaveRiskyCall("support_attachment");
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAttachmentUri(result.assets[0].uri);
    }
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FadeInView style={s.headerRow} delay={0} duration={600} keepRasterized>
          <TouchableOpacity
            style={s.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.85}
          >
            <ArrowLeft size={22} color={colors.white} weight="bold" />
          </TouchableOpacity>
          <Text style={[s.headerTitle, fontStyles.bold]}>{t("Support")}</Text>
        </FadeInView>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <FadeInView delay={120} duration={700} keepRasterized>
            <View style={s.noteCardTop}>
              <Text style={[s.noteTitle, fontStyles.semiBold]}>{t("Before you report")}</Text>
              <Text style={[s.noteText, fontStyles.medium]}>
                {t("Add screenshots, order details, and what you expected. It helps us fix things faster.")}
              </Text>
            </View>

            <Text style={[s.label, s.helpLabel, fontStyles.semiBold]}>{t("Help options")}</Text>
            <View style={s.helpPair}>
              <TouchableOpacity style={[s.helpCard, s.helpCardHalf]} activeOpacity={0.88} onPress={emailSupport}>
                <View style={s.helpIconWrap}>
                  <EnvelopeSimple size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={s.helpTextBlock}>
                  <Text style={[s.helpTitle, fontStyles.semiBold]}>{t("Email")}</Text>
                  <Text style={[s.helpSub, fontStyles.medium]}>support@letdoyo.com</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.helpCard, s.helpCardHalf]}
                activeOpacity={0.88}
                onPress={() => setReportOpen(true)}
              >
                <View style={s.helpIconWrap}>
                  <PaperPlaneRight size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={s.helpTextBlock}>
                  <Text style={[s.helpTitle, fontStyles.semiBold]}>{t("Form")}</Text>
                  <Text style={[s.helpSub, fontStyles.medium]}>{t("Submit a quick report")}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={s.noteCard}>
              <Text style={[s.noteTitle, fontStyles.semiBold]}>{t("What happens next")}</Text>
              <Text style={[s.noteText, fontStyles.medium]}>
                {t("We review reports during support hours and prioritize active booking, payment, and safety issues first.")}
              </Text>
            </View>

            <Text style={[s.label, s.infoLabel, fontStyles.semiBold]}>{t("Support Info")}</Text>
            <View style={s.helpGrid}>
              <View style={[s.helpCard, s.helpCardWide]}>
                <View style={s.helpIconWrap}>
                  <ShieldCheck size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={s.helpTextBlock}>
                  <Text style={[s.helpTitle, fontStyles.semiBold]}>{t("Safety issue")}</Text>
                  <Text style={[s.helpSub, fontStyles.medium]}>{t("For active jobs, use Safety from the tracking screen.")}</Text>
                </View>
              </View>

              <View style={[s.helpCard, s.helpCardWide]}>
                <View style={s.helpIconWrap}>
                  <Clock size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={s.helpTextBlock}>
                  <Text style={[s.helpTitle, fontStyles.semiBold]}>{t("Availability")}</Text>
                  <Text style={[s.helpSub, fontStyles.medium]}>{t("Opening time 7am, closing time 11pm")}</Text>
                </View>
              </View>
            </View>

          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>

      {reportOpen ? (
        <View style={s.reportOverlay}>
          <TouchableOpacity style={s.reportBackdrop} activeOpacity={1} onPress={closeReport} />
          <Reanimated.View style={[s.reportSheet, reportSheetStyle]}>
            <Text style={[s.reportSheetTitle, fontStyles.bold]}>{t("Describe the issue")}</Text>

            <Text style={[s.label, fontStyles.semiBold]}>{t("What's this about?")}</Text>
            <View style={s.chipsRow}>
              {CATEGORIES.map(cat => {
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.chip, active && s.chipActive]}
                    activeOpacity={0.85}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        s.chipText,
                        active && s.chipTextActive,
                        fontStyles.semiBold,
                      ]}
                    >
                      {t(cat)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[s.textArea, fontStyles.medium]}
              value={details}
              onChangeText={setDetails}
              placeholder={t("Tell us what happened, and what you expected instead...")}
              placeholderTextColor={colors.ink + "88"}
              multiline
            />

            {attachmentUri ? (
              <View style={s.attachmentPreview}>
                <Image source={{ uri: attachmentUri }} style={s.attachmentImage} resizeMode="cover" />
                <View style={s.attachmentTextBlock}>
                  <Text style={[s.attachmentTitle, fontStyles.semiBold]}>{t("Image added")}</Text>
                  <Text style={[s.attachmentSub, fontStyles.medium]} numberOfLines={1}>
                    {attachmentUri}
                  </Text>
                </View>
                <TouchableOpacity style={s.attachmentRemove} activeOpacity={0.85} onPress={() => setAttachmentUri(null)}>
                  <Trash size={18} color={colors.white} weight="bold" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.attachmentButton} activeOpacity={0.85} onPress={pickAttachment}>
                <ImageSquare size={20} color={colors.white} weight="fill" />
                <Text style={[s.attachmentButtonText, fontStyles.semiBold]}>{t("Add picture")}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[s.submitButton, (!canSubmit || submitting) && s.submitButtonDisabled]}
              activeOpacity={0.9}
              disabled={!canSubmit || submitting}
              onPress={submit}
            >
              <PaperPlaneRight size={20} color={colors.white} weight="fill" />
              <Text style={[s.submitText, fontStyles.semiBold]}>{submitting ? t("Sending...") : t("Send report")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelButton} activeOpacity={0.85} onPress={closeReport}>
              <Text style={[s.cancelButtonText, fontStyles.semiBold]}>{t("Cancel")}</Text>
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
  );
}
