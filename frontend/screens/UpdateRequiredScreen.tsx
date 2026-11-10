import React from "react";
import { Image, Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import AppLogo from "../components/AppLogo";
import { useSettings, useT } from "../contexts/SettingsContext";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useThemedStyles } from "../hooks/useColors";
import { RootStackParamList } from "../navigation/types";
import { makeCommon } from "../styles/common";
import { makeOnboardingStyles } from "../styles/OnboardingScreen.styles";
import { makeUpdateRequiredStyles } from "../styles/UpdateRequiredScreen.styles";
import { fontStyles } from "../styles/fonts";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.doyo.demo";

async function openStore() {
  if (Platform.OS === "android") {
    // market:// opens the Play Store app directly; web URL is the fallback.
    try {
      await Linking.openURL("market://details?id=com.doyo.demo");
      return;
    } catch {
      /* store app unavailable — fall through to the web link */
    }
  }
  Linking.openURL(PLAY_STORE_URL).catch(() => undefined);
}

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "UpdateRequired">;
  route: RouteProp<RootStackParamList, "UpdateRequired">;
};

export default function UpdateRequiredScreen({ route }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const s = useThemedStyles(makeUpdateRequiredStyles);
  const onboarding = useThemedStyles(makeOnboardingStyles);
  const common = useThemedStyles(makeCommon);
  const { currentVersion, latestVersion } = route.params;
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play";

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <FadeInView style={onboarding.logoContainer} delay={0} duration={480}>
        <AppLogo iconSize={32} fontSize={24} />
      </FadeInView>

      <FadeInView delay={100} duration={600} style={onboarding.contentWrapper}>
        <View style={[onboarding.slide, s.slide]}>
          <Image
            source={require("../assets/images/Illustration6.webp")}
            style={onboarding.illustration}
            resizeMode="contain"
          />

          <View style={onboarding.textBlock}>
            <Text style={[onboarding.title, s.title, fontStyles.bold]}>
              {t("Please")} <Text style={onboarding.titleAccent}>{t("update")}</Text>
            </Text>
            <Text style={[onboarding.body, s.message, fontStyles.medium]}>
              {t("Please install the latest version from {store} to continue using Doyo.", { store: storeName })}
            </Text>
          </View>

          <View style={s.versionCard}>
            <View style={s.versionRow}>
              <Text style={[s.versionLabel, fontStyles.medium]}>{t("Installed")}</Text>
              <Text style={[s.versionValue, fontStyles.semiBold]}>v{currentVersion}</Text>
            </View>
            <View style={s.versionRow}>
              <Text style={[s.versionLabel, fontStyles.medium]}>{t("Latest")}</Text>
              <Text style={[s.versionValue, fontStyles.semiBold]}>v{latestVersion}</Text>
            </View>
          </View>

          <TouchableOpacity style={[common.button, { marginTop: 18, alignSelf: "stretch" }]} activeOpacity={0.86} onPress={openStore}>
            <Text style={[common.buttonText, fontStyles.bold]}>
              {t("Open {store}", { store: storeName })}
            </Text>
          </TouchableOpacity>
        </View>
      </FadeInView>

      <View style={onboarding.footer} />
    </ScreenBackground>
  );
}
