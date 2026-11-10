import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import LegalFooter from "../components/LegalFooter";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeEmailStyles } from "../styles/EmailScreen.styles";
import { makeCommon } from "../styles/common";
import { requestEmailOtp } from "../services/onboarding";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = { navigation: StackNavigationProp<RootStackParamList, "Email"> };

export default function EmailScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const common = useThemedStyles(makeCommon);
  const s = useThemedStyles(makeEmailStyles);

  const handleNext = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setAlert({ title: t("Invalid email"), message: t("Please enter a valid email address.") });
      return;
    }
    setLoading(true);
    try {
      const { challenge, expiresAt } = await requestEmailOtp(trimmed);
      navigation.navigate("OTP", { email: trimmed, challenge, expiresAt: expiresAt * 1000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("Failed to send code. Please try again.");
      setAlert({ title: t("Error"), message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FadeInView style={common.backHeader} delay={0} duration={420}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={28} color={colors.white} weight="regular" />
          </TouchableOpacity>
        </FadeInView>

        <FadeInView delay={90} duration={500} style={{ flex: 1 }}>
          <View style={s.contentWrapper}>
            <View style={s.topSection}>
              <Text style={[common.title, fontStyles.bold]}>
                {t("Join us via") + " "}
                <Text style={[common.title, common.titleAccent, fontStyles.bold]}>{t("email")}</Text>
              </Text>
              <Text style={[common.subtitle, fontStyles.medium]}>
                {t("We'll send you a code on your email to verify you")}
              </Text>
              <View style={s.inputWrapper}>
                <TextInput
                  style={[s.input, fontStyles.medium]}
                  placeholder={t("Enter your email")}
                  placeholderTextColor={colors.ink + "88"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
              </View>
            </View>

            <View>
              <View style={s.ctaContainer}>
                <TouchableOpacity
                  style={[common.button, loading && common.buttonDisabled]}
                  activeOpacity={0.85}
                  onPress={handleNext}
                  disabled={loading}
                >
                  <Text style={[common.buttonText, fontStyles.semiBold]}>
                    {loading ? t("Sending…") : t("Next")}
                  </Text>
                </TouchableOpacity>
              </View>
              <LegalFooter />
            </View>
          </View>
        </FadeInView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={!!alert}
        title={alert?.title ?? ""}
        message={alert?.message}
        onClose={() => setAlert(null)}
      />
    </ScreenBackground>
  );
}
