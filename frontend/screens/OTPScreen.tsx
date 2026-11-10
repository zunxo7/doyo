import React, { useRef, useState, useEffect } from "react";
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
import LegalFooter from "../components/LegalFooter";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeOtpStyles } from "../styles/OTPScreen.styles";
import { makeCommon } from "../styles/common";
import {
  getResendState,
  incrementResend,
  clearResendState,
  saveUser,
  saveSessionToken,
} from "../services/auth";
import { findAccountByAuth, requestEmailOtp, verifyEmailOtp } from "../services/onboarding";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "OTP">;
  route: RouteProp<RootStackParamList, "OTP">;
};

const OTP_LENGTH = 4;
const RESEND_COOLDOWN_MS = 30000;

export default function OTPScreen({ navigation, route }: Props) {
  const { email, challenge: initialChallenge, expiresAt } = route.params;
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [resending, setResending] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(initialChallenge);
  const [currentExpiresAt, setCurrentExpiresAt] = useState(expiresAt);
  const [resendCount, setResendCount] = useState(0);
  const [resendBlockedUntil, setResendBlockedUntil] = useState<number | undefined>();
  const [cooldownUntil, setCooldownUntil] = useState(() => Date.now() + RESEND_COOLDOWN_MS);
  const [now, setNow] = useState(Date.now());
  const [verifying, setVerifying] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const common = useThemedStyles(makeCommon);
  const s = useThemedStyles(makeOtpStyles);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
    getResendState(email).then((state) => {
      setResendCount(state.count);
      setResendBlockedUntil(state.blockedUntil);
    });
  }, []);

  // Tick once a second while the resend cooldown is counting down.
  useEffect(() => {
    if (now >= cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [now, cooldownUntil]);

  const cooldownMsLeft = Math.max(0, cooldownUntil - now);
  const cooldownActive = cooldownMsLeft > 0;
  const cooldownSecondsLeft = Math.ceil(cooldownMsLeft / 1000);

  const isExpired = () => Date.now() > currentExpiresAt;

  const handleChange = (text: string) => {
    setCode(text.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH));
  };

  useEffect(() => {
    if (code.length === OTP_LENGTH && !verifying) void handleVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleVerify = async () => {
    const entered = code;
    if (entered.length < OTP_LENGTH) {
      setAlert({ title: t("Incomplete"), message: t("Please enter all 4 digits.") });
      return;
    }
    if (isExpired()) {
      setAlert({ title: t("Code expired"), message: t("This code has expired. Please request a new one.") });
      setCode("");
      return;
    }
    setVerifying(true);
    try {
      // Verify the code server-side; success returns a signed session token.
      let token: string;
      try {
        const result = await verifyEmailOtp(email, entered, currentChallenge);
        token = result.token;
      } catch (otpError) {
        setAlert({
          title: t("Wrong code"),
          message: otpError instanceof Error ? otpError.message : t("The code you entered is incorrect. Please try again."),
        });
        setCode("");
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }
      await saveSessionToken(token);
      await clearResendState(email);
      const lookup = await findAccountByAuth(email, email);
      if (lookup.found && lookup.account) {
        await saveUser({
          id: lookup.account.id,
          email: lookup.account.email ?? email,
          name: lookup.account.name,
          phone: lookup.account.phone,
          role: lookup.account.type,
          gender: lookup.account.gender,
          onboardingStatus: lookup.status,
        });
        const acct = lookup.account;
        const status = (lookup.status || "").toLowerCase();
        if (acct.type === "customer") {
          navigation.reset({ index: 0, routes: [{ name: "CustomerHome", params: { name: acct.name ?? "" } }] });
        } else if (status === "approved") {
          // Already approved — skip the review screen entirely (no flash)
          navigation.reset({ index: 0, routes: [{ name: "WorkerHome", params: { name: acct.name } }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: "WorkerLocked", params: { status: lookup.status } }] });
        }
        return;
      }
      navigation.navigate("Role", { uid: email, email, phone: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("Please check your connection and try again.");
      setAlert({ title: t("Could not continue"), message });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendBlockedUntil && Date.now() < resendBlockedUntil) {
      const hoursLeft = Math.ceil((resendBlockedUntil - Date.now()) / (1000 * 60 * 60));
      setAlert({
        title: t("Too many attempts"),
        message: t("You've used all resend attempts. Try again in {hours} hour(s).", { hours: hoursLeft }),
      });
      return;
    }
    if (resendCount >= 2) {
      setAlert({ title: t("Too many attempts"), message: t("You can only resend the code twice.") });
      return;
    }
    setResending(true);
    try {
      const { challenge, expiresAt: newExpires } = await requestEmailOtp(email);
      const state = await incrementResend(email);
      setCurrentChallenge(challenge);
      setCurrentExpiresAt(newExpires * 1000);
      setResendCount(state.count);
      setResendBlockedUntil(state.blockedUntil);
      setCode("");
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
      setTimeout(() => inputRef.current?.focus(), 100);
      setAlert({ title: t("Code sent"), message: t("A new code was sent to {email}", { email }) });
    } catch {
      setAlert({ title: t("Error"), message: t("Failed to resend code. Please try again.") });
    } finally {
      setResending(false);
    }
  };

  const resendBlocked = !!(resendBlockedUntil && Date.now() < resendBlockedUntil) || resendCount >= 2;
  const resendDisabled = resending || resendBlocked || cooldownActive;
  const resendLabel = resending
    ? t("Sending…")
    : cooldownActive
      ? t("Resend in {sec}s", { sec: cooldownSecondsLeft })
      : resendBlocked
        ? t("No resends left")
        : t("Resend Code ({count} left)", { count: 2 - resendCount });

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
                {t("Enter the") + " "}
                <Text style={[common.title, common.titleAccent, fontStyles.bold]}>{t("code")}</Text>
              </Text>
              <Text style={[common.subtitle, fontStyles.medium]}>
                {t("We sent your code via email to") + "\n"}
                <Text style={[common.subtitle, s.subtitleEmail, fontStyles.medium]}>{email}</Text>
              </Text>

              <View style={s.otpWrap}>
                <View style={[s.otpRow, { pointerEvents: "none" }]}>
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                    const char = code[i] ?? "";
                    const isActive = focused && i === Math.min(code.length, OTP_LENGTH - 1);
                    return (
                      <View
                        key={i}
                        style={[s.otpBox, char ? s.otpBoxFilled : null, isActive && s.otpBoxActive]}
                      >
                        <Text style={[s.otpDigit, fontStyles.bold]}>{char}</Text>
                      </View>
                    );
                  })}
                </View>
                <TextInput
                  ref={inputRef}
                  style={s.hiddenInput}
                  value={code}
                  onChangeText={handleChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  selectionColor="transparent"
                  caretHidden
                />
              </View>
            </View>

            <View>
              <View style={s.ctaContainer}>
                <TouchableOpacity
                  style={[common.button, verifying && common.buttonDisabled]}
                  activeOpacity={0.85}
                  onPress={handleVerify}
                  disabled={verifying}
                >
                  <Text style={[common.buttonText, fontStyles.semiBold]}>
                    {verifying ? t("Checking...") : t("Verify")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[common.button, s.resendWhite, resendDisabled && common.buttonDisabled]}
                  activeOpacity={0.85}
                  onPress={handleResend}
                  disabled={resendDisabled}
                >
                  <Text style={[common.buttonText, s.resendWhiteText, fontStyles.semiBold]}>
                    {resendLabel}
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
