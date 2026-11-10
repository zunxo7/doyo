import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CheckCircle, Clock, LockKey } from "phosphor-react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { AppConfig, getAppConfig } from "../services/appConfig";
import { findWorkerApplicationByPhone } from "../services/onboarding";
import { getStoredUser, saveUser, clearUser } from "../services/auth";
import { getCachedAppConfig } from "../services/appConfig";
import { RootStackParamList } from "../navigation/types";
import { makeWorkerLockedStyles } from "../styles/WorkerLockedScreen.styles";
import { makeCommon } from "../styles/common";
import { fontStyles } from "../styles/fonts";

// How often we re-check the worker's application status while they wait. Kept
// short so approval flips the screen over within seconds — no app restart.
const STATUS_POLL_MS = 20000;

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "WorkerLocked">;
  route: RouteProp<RootStackParamList, "WorkerLocked">;
};

const CONFIG_POLL_MS = 45000;
const FALLBACK_RELEASE_MESSAGE = {
  title: "Doyo\nis Live",
  accentText: "Doyo",
  status: "Install the store app",
  cardTitle: "Move to the official app",
  steps: [
    "Uninstall this early access app.",
    "Open Google Play Store or the App Store and search for Doyo.",
    "Install Doyo, then log back in with the same email and phone number.",
  ],
};
function renderTitle(
  text: string,
  accentText: string,
  fonts: ReturnType<typeof useFontFamilies>,
  s: ReturnType<typeof makeWorkerLockedStyles>,
) {
  if (!accentText || !text.includes(accentText)) {
    return <Text style={[s.title, fontStyles.bold]}>{text}</Text>;
  }

  const [beforeAccent, ...afterParts] = text.split(accentText);
  return (
    <Text style={[s.title, fontStyles.bold]}>
      {beforeAccent}
      <Text style={[s.title, s.titleAccent, fontStyles.bold]}>{accentText}</Text>
      {afterParts.join(accentText)}
    </Text>
  );
}

// Long enough to read the review screen before the demo approves it.
const DEMO_REVIEW_MS = 5000;

export default function WorkerLockedScreen({ navigation, route }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerLockedStyles);
  const common = useThemedStyles(makeCommon);
  const rawStatus = (route.params?.status ?? "").toLowerCase();
  const [showReleaseInstructions, setShowReleaseInstructions] = useState<boolean | null>(null);
  const [lockedScreen, setLockedScreen] = useState<AppConfig["lockedScreen"] | null>(null);
  // Live worker-application status (submitted / approved / rejected). Seeded
  // from the route param, then kept fresh by polling the backend.
  const [appStatus, setAppStatus] = useState<string>(rawStatus || "submitted");
  const [workerName, setWorkerName] = useState<string>("");
  // Review accounts never file an application, so several of this screen's
  // assumptions do not hold for them. Held in a ref as well because the status
  // poll is a useCallback that must not be rebuilt when this flips.
  const isReview = !!getCachedAppConfig().reviewLocation;
  const isReviewRef = useRef(isReview);
  isReviewRef.current = isReview;
  const mountedRef = useRef(false);
  const fetchingRef = useRef(false);
  const releaseMessage = lockedScreen?.release ?? FALLBACK_RELEASE_MESSAGE;

  const isRejected = appStatus.includes("reject");
  const isApproved = appStatus.includes("approv");

  // Copy for the worker-specific states (not driven by the global release config)
  const APPROVED = {
    title: "Application\nApproved",
    accent: "Approved",
    status: "You're approved",
    cardTitle: "",
    steps: [] as string[],
  };
  const REVIEW = {
    title: "Application\nin Review",
    accent: "Review",
    status: "Under review",
    cardTitle: "What happens next",
    steps: [
      "Our team is verifying your CNIC and the details you submitted.",
      "This usually takes up to 24 hours.",
      "You'll be let in automatically the moment you're approved — just keep the app installed.",
    ],
  };
  const REJECTED = {
    title: "Application\nNot Approved",
    accent: "",
    status: "Not approved",
    cardTitle: "What you can do",
    steps: [
      "Unfortunately your application wasn't approved this time.",
      "Reach out to our support team if you think this was a mistake.",
    ],
  };

  // Approval beats everything — once they're in, show them they're in.
  const mode: "approved" | "release" | "rejected" | "review" =
    isApproved
      ? "approved"
      : showReleaseInstructions === true
      ? "release"
      : isRejected
      ? "rejected"
      : "review";

  const view =
    mode === "approved"
      ? APPROVED
      : mode === "release"
      ? {
          title: releaseMessage.title,
          accent: releaseMessage.accentText,
          status: releaseMessage.status,
          cardTitle: releaseMessage.cardTitle,
          steps: releaseMessage.steps,
        }
      : mode === "rejected"
      ? REJECTED
      : REVIEW;

  const refreshConfig = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const config = await getAppConfig();
      if (mountedRef.current) {
        setShowReleaseInstructions(config.releaseInstallInstructionsEnabled);
        setLockedScreen(config.lockedScreen);
      }
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Poll the worker's real application status. The moment admin approves it the
  // screen flips to the "Approved" state (with a Continue button) live — no
  // re-login or app restart needed.
  const checkWorkerStatus = useCallback(async () => {
    try {
      const user = await getStoredUser();
      if (user?.name) setWorkerName(user.name);
      if (!user?.phone || isReviewRef.current) return;
      const lookup = await findWorkerApplicationByPhone(user.phone);
      if (!mountedRef.current) return;
      // Server has no application for this phone (e.g. it was reset/deleted).
      // Don't sit on "in review" forever — clear the stale local session and
      // send them back to the start.
      // A reviewer walks this screen without ever filing an application, so
      // "no application" is expected rather than a stale session. Wiping it
      // logged them straight out mid-demo.
      if (!lookup.found && !isReviewRef.current) {
        await clearUser();
        navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] });
        return;
      }
      const next = (lookup.status || "").toLowerCase();
      if (next && next !== "not_found") {
        setAppStatus(next);
        // Persist approval locally so a reload goes straight to WorkerHome
        // instead of flashing this screen and asking to Continue again.
        if (next === "approved") {
          const stored = await getStoredUser();
          if (stored && (stored.onboardingStatus || "").toLowerCase() !== "approved") {
            await saveUser({ ...stored, onboardingStatus: "approved" });
          }
        }
      }
    } catch {
      // Transient failure — keep waiting and retry on the next tick.
    }
  }, [navigation]);

  useEffect(() => {
    mountedRef.current = true;
    refreshConfig();
    checkWorkerStatus();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshConfig();
        checkWorkerStatus();
      }
    });

    const configPoll = setInterval(refreshConfig, CONFIG_POLL_MS);
    const statusPoll = setInterval(checkWorkerStatus, STATUS_POLL_MS);

    return () => {
      mountedRef.current = false;
      appStateSubscription.remove();
      clearInterval(configPoll);
      clearInterval(statusPoll);
    };
  }, [refreshConfig, checkWorkerStatus]);

  useEffect(() => {
    if (!isReview) return;
    const approve = setTimeout(() => setAppStatus("approved"), DEMO_REVIEW_MS);
    return () => clearTimeout(approve);
  }, [isReview]);

  const PanelIcon = mode === "approved" ? CheckCircle : mode === "review" ? Clock : LockKey;
  const enterWorkerModeForReview = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "WorkerHome", params: { name: workerName || undefined } }],
    });
  };

  const goToWorkerHome = async () => {
    const stored = await getStoredUser();
    if (stored && (stored.onboardingStatus || "").toLowerCase() !== "approved") {
      await saveUser({ ...stored, onboardingStatus: "approved" });
    }
    navigation.reset({ index: 0, routes: [{ name: "WorkerHome", params: { name: workerName || stored?.name || undefined } }] });
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <ScrollView style={s.scroller} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0} duration={180} style={s.panel} translateYDistance={0}>
          <View style={s.iconWrap}>
            <PanelIcon size={58} color={colors.accent} weight="regular" />
          </View>
        </FadeInView>

        <FadeInView delay={90} duration={460} style={s.textBlock}>
          {renderTitle(view.title, view.accent, fonts, s)}
        </FadeInView>

        {mode !== "review" && mode !== "approved" && (
          <FadeInView delay={180} duration={440} style={s.statusWrap}>
            <View style={s.statusPill}>
              <Text style={[s.statusText, fontStyles.semiBold]}>{t(view.status)}</Text>
            </View>
          </FadeInView>
        )}

        {mode === "approved" ? (
          <FadeInView delay={270} duration={440}>
            <Text style={[s.approvedSub, fontStyles.medium]}>
              {t("You're verified and ready to go. Tap continue to start receiving jobs.")}
            </Text>
          </FadeInView>
        ) : view.steps.length > 0 ? (
          <FadeInView delay={270} duration={440} style={s.instructionsCard}>
            <Text style={[s.instructionsTitle, fontStyles.bold]}>{t(view.cardTitle)}</Text>
            {view.steps.map((step, index) => (
              <View key={step} style={s.stepRow}>
                <View style={s.stepNumber}>
                  <Text style={[s.stepNumberText, fontStyles.bold]}>{index + 1}</Text>
                </View>
                <Text style={[s.stepText, fontStyles.medium]}>{t(step)}</Text>
              </View>
            ))}
          </FadeInView>
        ) : null}
      </ScrollView>

      {mode === "approved" ? (
        <FadeInView delay={340} duration={420} style={s.bottomBar}>
          <TouchableOpacity
            style={common.button}
            activeOpacity={0.9}
            onPress={isReview ? enterWorkerModeForReview : goToWorkerHome}
          >
            <Text style={[common.buttonText, fontStyles.semiBold]}>
              {isReview ? t("Continue demo flow") : t("Continue")}
            </Text>
          </TouchableOpacity>
        </FadeInView>
      ) : null}
    </ScreenBackground>
  );
}
