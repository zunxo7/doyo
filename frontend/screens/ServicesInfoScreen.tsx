import React, { useEffect, useMemo, useState } from "react";
import { AppState, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, BaseballCap, Broom, Car, CaretRight, CheckCircle, ClipboardText, Clock, Couch, MapPin, Scissors, Toolbox } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import VehicleScopeSheet from "../components/VehicleScopeSheet";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { useSettings, useT } from "../contexts/SettingsContext";
import { makeServicesInfoStyles } from "../styles/ServicesInfoScreen.styles";
import { DEFAULT_APP_CONFIG, formatOperatingHours, getAppConfig, type AppConfig } from "../services/appConfig";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "ServicesInfo">;
};

type ScopeSelection =
  | { type: "home" }
  | { type: "vehicle" }
  | { type: "furniture" }
  | { type: "barber" };

const SERVICE_RULES = [
  {
    title: "Who brings equipment",
    sub: "For cleaning, the customer provides the equipment and supplies. Barbers bring their own tools.",
    Icon: Toolbox,
  },
  {
    title: "Only requested work",
    sub: "Workers only do the service and scope you selected. Extra work must not be added during the job.",
    Icon: CheckCircle,
  },
  {
    title: "Scope is shared with workers",
    sub: "The same scope shown here is shown to workers so they follow Doyo standards.",
    Icon: ClipboardText,
  },
  {
    title: "Accept branded workers only",
    sub: "Only accept a worker who is wearing the Doyo brand cap.",
    Icon: BaseballCap,
  },
] as const;

const SCOPE_CARDS = [
  {
    title: "Home services",
    sub: "Regular and deep home cleaning scopes.",
    Icon: Broom,
    scope: { type: "home" } satisfies ScopeSelection,
    wide: true,
  },
  {
    title: "Vehicle services",
    sub: "Exterior and interior vehicle cleaning areas.",
    Icon: Car,
    scope: { type: "vehicle" } satisfies ScopeSelection,
    wide: true,
  },
  {
    title: "Shifting services",
    sub: "What is and is not covered when moving furniture.",
    Icon: Couch,
    scope: { type: "furniture" } satisfies ScopeSelection,
    wide: true,
  },
  {
    title: "Barber services",
    sub: "What a barber visit at home covers.",
    Icon: Scissors,
    scope: { type: "barber" } satisfies ScopeSelection,
    wide: true,
  },
] as const;

export default function ServicesInfoScreen({ navigation }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const { settings } = useSettings();
  const s = useThemedStyles(makeServicesInfoStyles);
  const isUrdu = settings.language === "ur";
  const rtlText = isUrdu ? s.rtlText : null;
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [scopeOpen, setScopeOpen] = useState<ScopeSelection | null>(null);
  const [lastScope, setLastScope] = useState<ScopeSelection>({ type: "vehicle" });
  const availabilityRules = useMemo(() => [
    {
      title: "Service area",
      sub: `Currently serving ${appConfig.serviceArea.label} only.`,
      Icon: MapPin,
    },
    {
      title: "Operating hours",
      sub: formatOperatingHours(appConfig),
      Icon: Clock,
    },
  ], [appConfig]);
  const openScope = (scope: ScopeSelection) => {
    setLastScope(scope);
    setScopeOpen(scope);
  };

  useEffect(() => {
    const load = () => getAppConfig().then(setAppConfig).catch(() => undefined);
    load();
    // Also on foreground: the displayed operating hours are server config, and
    // a mount-only fetch left them showing the built-in defaults until the app
    // was killed and relaunched.
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") load();
    });
    return () => sub.remove();
  }, []);

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
        <Text style={[s.headerTitle, rtlText, fontStyles.bold]} numberOfLines={2}>
          {t("Learn about our services")}
        </Text>
      </FadeInView>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <FadeInView delay={150} duration={700} keepRasterized>
          <View style={s.noteCardTop}>
            <Text style={[s.noteTitle, rtlText, fontStyles.semiBold]}>{t("How Doyo services work")}</Text>
            <Text style={[s.noteText, rtlText, fontStyles.medium]}>
              {t("Know what workers bring, what they clean, and how scope is controlled before you book.")}
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={300} duration={700} keepRasterized>
          <Text style={[s.sectionLabel, rtlText, fontStyles.semiBold]}>{t("Service standards")}</Text>
          <View style={s.rulesList}>
            {SERVICE_RULES.map(({ title, sub, Icon }) => (
              <View key={title} style={s.ruleCard}>
                <View style={s.iconWrap}>
                  <Icon size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={s.ruleTextBlock}>
                  <Text style={[s.ruleTitle, rtlText, fontStyles.semiBold]}>{t(title)}</Text>
                  <Text style={[s.ruleSub, rtlText, fontStyles.medium]}>{t(sub)}</Text>
                </View>
              </View>
            ))}
          </View>
        </FadeInView>

        <FadeInView delay={450} duration={700} keepRasterized>
          <Text style={[s.sectionLabel, rtlText, fontStyles.semiBold]}>{t("Availability")}</Text>
          <View style={s.rulesList}>
            {availabilityRules.map(({ title, sub, Icon }) => (
              <View key={title} style={s.ruleCard}>
                <View style={s.iconWrap}>
                  <Icon size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={s.ruleTextBlock}>
                  <Text style={[s.ruleTitle, rtlText, fontStyles.semiBold]}>{t(title)}</Text>
                  <Text style={[s.ruleSub, rtlText, fontStyles.medium]}>{t(sub)}</Text>
                </View>
              </View>
            ))}
          </View>
        </FadeInView>

        <FadeInView delay={560} duration={700} keepRasterized>
          <Text style={[s.sectionLabel, rtlText, fontStyles.semiBold]}>{t("Scope guide")}</Text>
          <View style={s.scopeGrid}>
            {SCOPE_CARDS.map(({ title, sub, Icon, scope, wide }) => (
              <TouchableOpacity
                key={title}
                style={[s.scopeCard, wide && s.scopeCardWide]}
                activeOpacity={0.86}
                onPress={() => openScope(scope)}
              >
                <View style={s.iconWrap}>
                  <Icon size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={wide ? s.scopeTextBlock : undefined}>
                  <Text style={[s.scopeTitle, rtlText, fontStyles.semiBold]}>{t(title)}</Text>
                  <Text style={[s.scopeSub, rtlText, fontStyles.medium]}>{t(sub)}</Text>
                </View>
                {wide ? <CaretRight size={19} color={colors.white} weight="bold" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </FadeInView>
      </ScrollView>

      <VehicleScopeSheet
        visible={!!scopeOpen}
        scopeType={lastScope.type}
        onClose={() => setScopeOpen(null)}
      />
    </ScreenBackground>
  );
}
