import React from "react";
import { Image, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import AppLogo from "../components/AppLogo";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useThemedStyles } from "../hooks/useColors";
import { makeOnboardingStyles } from "../styles/OnboardingScreen.styles";
import { makeCommon } from "../styles/common";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "Role">;
  route: RouteProp<RootStackParamList, "Role">;
};

export default function RoleScreen({ navigation, route }: Props) {
  const { uid, email, name, phone } = route.params;
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const { height } = useWindowDimensions();
  const s = useThemedStyles(makeOnboardingStyles);
  const common = useThemedStyles(makeCommon);

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <FadeInView style={s.logoContainer} delay={0} duration={480}>
        <AppLogo iconSize={32} fontSize={24} />
      </FadeInView>

      <FadeInView delay={100} duration={600} style={s.contentWrapper}>
        <View style={[s.slide, { marginTop: height * 0.05 }]}>
          <Image
            source={require("../assets/images/Illustration4.webp")}
            style={s.illustration}
            resizeMode="contain"
          />
          <View style={[s.textBlock, s.roleTextBlock]}>
            <Text style={[s.title, s.roleTitle, fontStyles.bold]} numberOfLines={1} adjustsFontSizeToFit>
              {t("Are you a") + " "}
              <Text style={[s.title, s.roleTitle, s.titleAccent, fontStyles.bold]}>{t("customer")}</Text>
            </Text>
            <Text style={[s.title, s.roleTitle, fontStyles.bold]} numberOfLines={1} adjustsFontSizeToFit>
              {t("or a") + " "}
              <Text style={[s.title, s.roleTitle, s.titleAccent, fontStyles.bold]}>{t("worker")}</Text>
              {"?"}
            </Text>
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={200} duration={460} style={s.ctaContainer}>
        <TouchableOpacity
          style={common.button}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("CustomerName", { uid, email, name, phone })}
        >
          <Text style={[common.buttonText, fontStyles.semiBold]}>{t("Customer")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[common.button, s.emailButton]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("WorkerPersonalInfo", { uid, email, name, phone })}
        >
          <Text style={[common.buttonText, s.emailButtonText, fontStyles.semiBold]}>{t("Worker")}</Text>
        </TouchableOpacity>
      </FadeInView>

      {/* Empty footer — reserve the same space as the language screen's footer */}
      <View style={s.footer}>
        <View style={{ height: 36 }} />
      </View>
    </ScreenBackground>
  );
}
