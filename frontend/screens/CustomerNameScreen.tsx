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
import { RouteProp } from "@react-navigation/native";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeCustomerNameStyles } from "../styles/CustomerNameScreen.styles";
import { makeCommon } from "../styles/common";
import { saveUser } from "../services/auth";
import { avatarOwnerKeyFor, clearAvatar } from "../services/avatar";
import { submitCustomerRegistration } from "../services/onboarding";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "CustomerName">;
  route: RouteProp<RootStackParamList, "CustomerName">;
};

export default function CustomerNameScreen({ navigation, route }: Props) {
  const { uid, email, phone, name: initialName } = route.params;
  const [name, setName] = useState(initialName ?? "");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const common = useThemedStyles(makeCommon);
  const s = useThemedStyles(makeCustomerNameStyles);

  const handleNext = async () => {
    if (!name.trim()) {
      setAlert({ title: t("Name required"), message: t("Please enter your name to continue.") });
      return;
    }
    setLoading(true);
    try {
      const trimmedName = name.trim();
      const result = await submitCustomerRegistration({ uid, email, phone, name: trimmedName });
      const customer = {
        id: result.customerId,
        googleUid: uid,
        email,
        phone,
        role: "customer" as const,
        name: trimmedName,
      };
      await clearAvatar(avatarOwnerKeyFor(customer));
      await saveUser(customer);
      navigation.reset({
        index: 0,
        routes: [{ name: "LinkPayPal", params: { name: trimmedName } }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("Something went wrong. Please try again.");
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

        <View style={s.contentWrapper}>
          <View style={s.topSection}>
            <FadeInView delay={80} duration={460} style={s.textBlock}>
              <Text style={[common.title, fontStyles.bold]}>
                {t("Welcome to") + " "}
                <Text style={[common.title, common.titleAccent, fontStyles.bold]}>Doyo!</Text>
              </Text>
              <Text style={[common.subtitle, fontStyles.medium]}>
                {t("Let's get acquainted")}
              </Text>
            </FadeInView>

            <FadeInView delay={150} duration={460} style={s.inputWrapper}>
              <TextInput
                style={[s.input, fontStyles.medium]}
                placeholder={t("Name")}
                placeholderTextColor={colors.ink + "88"}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
            </FadeInView>
          </View>

          <FadeInView delay={220} duration={440} style={s.ctaContainer}>
            <TouchableOpacity
              style={[common.button, loading && common.buttonDisabled]}
              activeOpacity={0.85}
              onPress={handleNext}
              disabled={loading}
            >
              <Text style={[common.buttonText, fontStyles.semiBold]}>
                {loading ? t("Saving…") : t("Next")}
              </Text>
            </TouchableOpacity>
          </FadeInView>
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
