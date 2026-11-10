import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ArrowLeft } from "phosphor-react-native";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import LegalFooter from "../components/LegalFooter";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { saveUser } from "../services/auth";
import { findAccountByPhone } from "../services/onboarding";
import { RootStackParamList } from "../navigation/types";
import { makeCommon } from "../styles/common";
import { makePhoneNumberStyles } from "../styles/PhoneNumberScreen.styles";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "PhoneNumber">;
  route: RouteProp<RootStackParamList, "PhoneNumber">;
};

function normalizePhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

/**
 * The number App Review types.
 *
 * Doyo serves one city and a Pakistani mobile is how a worker actually
 * reaches a customer, so the format stays strict for everyone else. A store
 * reviewer has no such number, and this screen rejected every attempt they
 * could make.
 *
 * Only the Apple path needs it. A reviewer signing in with Apple gets a
 * private-relay identity with no account behind it, so this screen is where
 * they land. The email review account is recognised a screen earlier and never
 * arrives here — and must not, because account-lookup 409s when the account on
 * file carries a different number than the one typed.
 */
const REVIEW_PHONE = "0000000";

function isValidPakistaniMobile(value: string) {
  return /^03\d{9}$/.test(value) || value === REVIEW_PHONE;
}

export default function PhoneNumberScreen({ navigation, route }: Props) {
  const { email, name } = route.params;
  const uid = route.params.uid ?? email;
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const common = useThemedStyles(makeCommon);
  const s = useThemedStyles(makePhoneNumberStyles);

  const handleContinue = async () => {
    const trimmedPhone = phone.trim();

    if (!isValidPakistaniMobile(trimmedPhone)) {
      setAlert({ title: t("Invalid phone number"), message: t("Enter an 11 digit Pakistani WhatsApp number like 03351234567.") });
      return;
    }

    setLoading(true);
    try {
      const lookup = await findAccountByPhone(trimmedPhone, email, uid);

      if (lookup.found) {
        const account = lookup.account;
        await saveUser({
          id: account?.id ?? uid,
          googleUid: uid,
          email,
          name: name ?? account?.name,
          phone: trimmedPhone,
          role: account?.type ?? "worker",
          gender: account?.gender,
          onboardingStatus: lookup.status,
        });
        const status = (lookup.status || "").toLowerCase();
        if (account?.type === "customer") {
          navigation.reset({ index: 0, routes: [{ name: "CustomerHome", params: { name: account?.name ?? name ?? "" } }] });
        } else if (status === "approved") {
          navigation.reset({ index: 0, routes: [{ name: "WorkerHome", params: { name: account?.name ?? name } }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: "WorkerLocked", params: { status: lookup.status } }] });
        }
        return;
      }

      navigation.navigate("Role", { uid, email, name, phone: trimmedPhone });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("Please check your connection and try again.");
      setAlert({ title: t("Could not continue"), message });
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

        <View style={s.contentWrapper}>
          <FadeInView delay={90} duration={500} style={{ flex: 1 }}>
            <View style={s.topSection}>
              <Text style={[common.title, fontStyles.bold]}>
                {t("Enter your") + " "}
                <Text style={[common.title, common.titleAccent, fontStyles.bold]}>{t("phone number")}</Text>
              </Text>
              <Text style={[common.subtitle, fontStyles.medium]}>
                {t("Use your WhatsApp number")}
              </Text>
              <View style={s.inputWrapper}>
                <TextInput
                  style={[s.input, fontStyles.medium]}
                  placeholder="03351234567"
                  placeholderTextColor={colors.ink + "88"}
                  value={phone}
                  onChangeText={(value) => setPhone(normalizePhoneInput(value))}
                  keyboardType="phone-pad"
                  maxLength={11}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={200} duration={440} style={s.ctaContainer}>
            <TouchableOpacity
              style={[common.button, loading && common.buttonDisabled]}
              activeOpacity={0.85}
              onPress={handleContinue}
              disabled={loading}
            >
              <Text style={[common.buttonText, fontStyles.semiBold]}>
                {loading ? t("Checking...") : t("Continue")}
              </Text>
            </TouchableOpacity>
          </FadeInView>
          <LegalFooter />
        </View>
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
