import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  ListRenderItem,
  StyleSheet,
} from "react-native";
import Reanimated, { FadeIn, FadeOut, withTiming } from "react-native-reanimated";
import AppLogo from "../components/AppLogo";
import { StatusBar } from "expo-status-bar";
import { StackNavigationProp } from "@react-navigation/stack";
import { Broom, EnvelopeSimple, Gift, GoogleLogoIcon, Sparkle } from "phosphor-react-native";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import CustomAlert from "../components/CustomAlert";
import LegalOverlay from "../components/LegalOverlay";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeOnboardingStyles } from "../styles/OnboardingScreen.styles";
import { makeCommon } from "../styles/common";
import { saveUser } from "../services/auth";
import { GoogleSignInCancelled, signInWithGoogle } from "../services/googleAuth";
import { findAccountByAuth } from "../services/onboarding";
import { getAppConfig, getCachedAppConfig, getLaunchWindow, type AppConfig } from "../services/appConfig";
import LaunchCountdown from "../components/LaunchCountdown";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = { navigation: StackNavigationProp<RootStackParamList, "Onboarding"> };

const SLIDES = [
  {
    key: "1",
    illustration: require("../assets/images/OnboardingPlan.webp"),
    titleWhite: "Let Doyo ",
    titleAccent: "Do It",
    body: "Type what you need in English, Urdu or Roman Urdu. Doyo plans the job.",
  },
  {
    key: "2",
    illustration: require("../assets/images/OnboardingNegotiate.webp"),
    titleWhite: "Doyo ",
    titleAccent: "Negotiates",
    body: "Nearby workers send offers. Doyo bargains for you and never goes over your limit.",
  },
  {
    key: "3",
    illustration: require("../assets/images/OnboardingPayAfter.webp"),
    titleWhite: "Pay ",
    titleAccent: "After",
    body: "Link PayPal once. You pay the final price only when the work is done.",
  },
];

const launchSheetEnter = () => {
  "worklet";
  return {
    initialValues: {
      transform: [{ translateY: -420 }],
    },
    animations: {
      transform: [{ translateY: withTiming(0, { duration: 260 }) }],
    },
  };
};

const launchSheetExit = () => {
  "worklet";
  return {
    initialValues: {
      transform: [{ translateY: 0 }],
    },
    animations: {
      transform: [{ translateY: withTiming(-420, { duration: 200 }) }],
    },
  };
};

export default function OnboardingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const [legalOverlay, setLegalOverlay] = useState<"terms" | "privacy" | null>(null);
  const [launchSheetOpen, setLaunchSheetOpen] = useState(false);
  // From the cache, not the bundled defaults: the default campaign is enabled,
  // so the gift banner painted and then vanished when the server said it was
  // off. Splash awaits getAppConfig() before routing here.
  const [appConfig, setAppConfig] = useState<AppConfig>(getCachedAppConfig);
  const [nowTick, setNowTick] = useState(Date.now());
  const flatListRef = useRef<FlatList>(null);
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const common = useThemedStyles(makeCommon);
  const s = useThemedStyles(makeOnboardingStyles);
  const launchWindow = getLaunchWindow(appConfig, nowTick);

  useEffect(() => {
    let active = true;
    getAppConfig().then(config => {
      if (active) setAppConfig(config);
    });
    // 60s: the seconds are rendered by <LaunchCountdown/>, which owns its own
    // 1Hz tick. This only needs to notice the campaign opening or closing.
    const timer = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  }).current;

  const renderSlide: ListRenderItem<typeof SLIDES[0]> = ({ item }) => (
    <View style={[s.slide, { width }]}>
      <Image source={item.illustration} style={s.illustration} resizeMode="contain" />
      <View style={s.textBlock}>
        <Text style={[s.title, fontStyles.bold]}>
          {t(item.titleWhite)}
          <Text style={[s.title, s.titleAccent, fontStyles.bold]}>{t(item.titleAccent)}</Text>
        </Text>
        <Text style={[s.body, fontStyles.medium]}>{t(item.body)}</Text>
      </View>
    </View>
  );

  const handleGoogleContinue = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      const lookup = await findAccountByAuth(user.email, user.uid);
      if (!lookup.found || !lookup.account) {
        navigation.navigate("PhoneNumber", user);
        return;
      }
      const account = lookup.account;
      await saveUser({
        id: account.id,
        email: account.email ?? user.email,
        name: account.name ?? user.name ?? undefined,
        phone: account.phone,
        role: account.type,
        gender: account.gender,
        onboardingStatus: lookup.status,
        // Signing in always opens booking; workers switch with Worker mode in the menu.
        mode: "customer",
      });
      navigation.reset({ index: 0, routes: [{ name: "CustomerHome", params: { name: account.name ?? "" } }] });
    } catch (error) {
      if (error instanceof GoogleSignInCancelled) return;
      const message = error instanceof Error ? error.message : t("Sign-in failed. Please try again.");
      setAlert({ title: `Google ${t("sign-in failed")}`, message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <FadeInView style={s.logoContainer} delay={0} duration={480}>
        <AppLogo iconSize={32} fontSize={24} />
      </FadeInView>

      {launchWindow.active ? (
        <FadeInView delay={80} duration={520} style={s.launchBanner}>
          <TouchableOpacity style={s.launchBannerTouch} activeOpacity={0.86} onPress={() => setLaunchSheetOpen(true)}>
            <View style={s.launchIcon}>
              <Gift size={18} color={colors.white} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
            <Text style={[s.launchTitle, fontStyles.bold]}>
                {t("Launch Offer")}
              </Text>
              <Text style={[s.launchText, fontStyles.medium]}>
                {t("Gift Ending In:")} <LaunchCountdown endsAt={launchWindow.endsAt} t={t} />
              </Text>
              <Text style={[s.launchLearnText, fontStyles.semiBold]}>
                {t("Tap to learn more")}
              </Text>
            </View>
          </TouchableOpacity>
        </FadeInView>
      ) : null}

      <FadeInView delay={100} duration={500} style={s.contentWrapper}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        />
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === activeIndex ? s.dotActive : s.dotInactive]} />
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={200} duration={460} style={s.ctaContainer}>
        <TouchableOpacity
          style={[common.button, s.authButton, loading && common.buttonDisabled]}
          activeOpacity={0.85}
          onPress={handleGoogleContinue}
          disabled={loading}
        >
          <GoogleLogoIcon size={22} color={colors.white} weight="bold" />
          <Text style={[common.buttonText, s.authButtonText, fontStyles.semiBold]}>
            {loading ? t("Connecting...") : "Continue with Google"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[common.button, s.authButton, s.emailButton]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("Email")}
        >
          <EnvelopeSimple size={22} color={colors.white} weight="bold" />
          <Text style={[common.buttonText, s.emailButtonText, fontStyles.semiBold]}>
            {t("Continue with Email")}
          </Text>
        </TouchableOpacity>
      </FadeInView>

      <FadeInView delay={300} duration={440} style={s.footer}>
        <Text style={[s.footerText, fontStyles.regular]}>
          {t("Joining our app means you agree with our") + " "}
          <Text
            style={[s.footerText, s.footerLink, fontStyles.regular]}
            onPress={() => setLegalOverlay("terms")}
          >
            {t("Terms & Conditions")}
          </Text>
          {" " + t("and") + " "}
          <Text
            style={[s.footerText, s.footerLink, fontStyles.regular]}
            onPress={() => setLegalOverlay("privacy")}
          >
            {t("Privacy Policy")}
          </Text>
        </Text>
      </FadeInView>

      <CustomAlert
        visible={!!alert}
        title={alert?.title ?? ""}
        message={alert?.message}
        onClose={() => setAlert(null)}
      />
      <LegalOverlay
        visible={!!legalOverlay}
        onClose={() => setLegalOverlay(null)}
      />
      {launchSheetOpen ? (
        <View style={s.launchSheetOverlay}>
          <Reanimated.View
            style={s.launchSheetBackdrop}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(160)}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setLaunchSheetOpen(false)} />
          </Reanimated.View>
          <Reanimated.View
            style={s.launchSheet}
            entering={launchSheetEnter}
            exiting={launchSheetExit}
          >
            <View style={s.launchSheetHeader}>
              <View style={s.launchSheetIcon}>
                <Gift size={23} color={colors.white} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.launchSheetTitle, fontStyles.bold]}>
                  {t("Launch Offer")}
                </Text>
                <Text style={[s.launchSheetTimer, fontStyles.semiBold]}>
                  {t("Gift Ending In:")} <LaunchCountdown endsAt={launchWindow.endsAt} t={t} />
                </Text>
              </View>
            </View>

            <View style={s.launchOfferRows}>
              <LaunchOfferRow
                Icon={Broom}
                title={t("For workers")}
                body={t("Workers pay 0% commission for the first month and keep everything they earn.")}
                highlight={t("0% commission")}
                fonts={fonts}
              />
              <LaunchOfferRow
                Icon={Sparkle}
                title={t("For customers")}
                body={t("Customers receive 50% launch discount for the whole launch month.")}
                highlight={t("50% launch discount")}
                fonts={fonts}
              />
            </View>
            <Text style={[s.launchSheetFootnote, fontStyles.medium]}>
              {t("This is a limited-time launch offer. Standard commission and pricing apply after the gift period ends.")}
            </Text>
          </Reanimated.View>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

function LaunchOfferRow({
  Icon,
  title,
  body,
  highlight,
  fonts,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: "fill" | "bold" | "regular" }>;
  title: string;
  body: string;
  highlight?: string;
  fonts: ReturnType<typeof useFontFamilies>;
}) {
  const colors = useColors();
  const s = useThemedStyles(makeOnboardingStyles);
  const highlightIndex = highlight ? body.indexOf(highlight) : -1;
  return (
    <View style={s.launchOfferRow}>
      <View style={s.launchOfferIcon}>
        <Icon size={20} color={colors.accent} weight="fill" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.launchOfferTitle, fontStyles.bold]}>{title}</Text>
        <Text style={[s.launchOfferBody, fontStyles.medium]}>
          {highlight && highlightIndex >= 0 ? (
            <>
              {body.slice(0, highlightIndex)}
              <Text style={[s.launchOfferHighlight, fontStyles.bold]}>{highlight}</Text>
              {body.slice(highlightIndex + highlight.length)}
            </>
          ) : (
            body
          )}
        </Text>
      </View>
    </View>
  );
}
