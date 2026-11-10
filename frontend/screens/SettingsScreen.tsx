import React, { useState } from "react";
import {
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Reanimated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ArrowCounterClockwise, ArrowLeft, Bell, MoneyWavy, Moon, PaypalLogo, SignOut, Translate, Trash } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { useSettings } from "../contexts/SettingsContext";
import { makeSettingsStyles } from "../styles/SettingsScreen.styles";
import type { PaymentPref, ThemePref } from "../services/settings";
import { RootStackParamList } from "../navigation/types";
import { clearUser, getStoredUser } from "../services/auth";
import { deleteAccount } from "../services/bidding";
import { useNotificationPermission } from "../hooks/useNotificationPermission";
import CustomAlert from "../components/CustomAlert";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "Settings">;
};

const THEMES: { value: ThemePref; label: string; subKey: string }[] = [
  { value: "dark", label: "Dark", subKey: "" },
];

const PAYMENT_METHODS: { value: PaymentPref; label: string; logo?: ImageSourcePropType }[] = [
  { value: "PayPal", label: "PayPal" },
  { value: "Cash", label: "Cash" },
];

function Radio({ active, s }: { active: boolean; s: ReturnType<typeof makeSettingsStyles> }) {
  return (
    <View style={[s.radio, active && s.radioActive]}>
      {active ? <View style={s.radioDot} /> : null}
    </View>
  );
}

function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) {
  const colors = useColors();
  const s = useThemedStyles(makeSettingsStyles);
  const anim = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    anim.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [anim, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(anim.value, [0, 1], ["#4c4d4f", colors.accent]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(anim.value, [0, 1], [0, 22]) }],
  }));

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onValueChange(!value)}>
      <Reanimated.View style={[s.toggleTrack, trackStyle]}>
        <Reanimated.View style={[s.toggleThumb, thumbStyle]} />
      </Reanimated.View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const fonts = useFontFamilies();
  const colors = useColors();
  const s = useThemedStyles(makeSettingsStyles);
  const { settings, setTheme, setDefaultPayment, t } = useSettings();

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [pushBlockedAlert, setPushBlockedAlert] = useState(false);
  const { on: notificationsOn, toggle: toggleNotifications } = useNotificationPermission();

  // Same gate as going online without background location: when the OS refuses
  // the switch comes back and the alert points at the only place that can
  // change it.
  const handleNotificationsToggle = async (value: boolean) => {
    if (!(await toggleNotifications(value))) setPushBlockedAlert(true);
  };

  const handleLogout = async () => {
    await clearUser();
    navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] });
  };

  // Required in-app by both stores (App Store 5.1.1(v), Play data deletion).
  // The server decides WHICH account from the verified identity, so this can
  // only ever remove the signed-in user's own.
  const handleDeleteAccount = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      const user = await getStoredUser();
      if (!user?.id) throw new Error(t("You are not signed in."));
      await deleteAccount(user.id, user.role === "worker" ? "worker" : "customer");
      await clearUser();
      navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] });
    } catch (error) {
      // Most often: a job is still live, which the server refuses to orphan.
      setDeleteError(error instanceof Error ? error.message : t("Could not delete your account."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style="light" />

      <FadeInView style={s.headerRow} delay={0} duration={600} keepRasterized>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.85}
        >
          <ArrowLeft size={22} color={colors.white} weight="bold" />
        </TouchableOpacity>
        <Text style={[s.headerTitle, fontStyles.bold]}>{t("Settings")}</Text>
      </FadeInView>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <FadeInView delay={220} duration={700} keepRasterized>
          <Text style={[s.sectionTitle, fontStyles.bold]}>{t("Theme")}</Text>
          <Text style={[s.sectionHint, fontStyles.medium]}>
            {t("Choose how Doyo looks on your phone")}
          </Text>
          <View style={s.optionCard}>
            {THEMES.map((theme, index) => (
              <TouchableOpacity
                key={theme.value}
                style={[s.optionRow, index > 0 && s.optionDivider]}
                activeOpacity={0.8}
                onPress={() => setTheme(theme.value)}
              >
                <View style={s.optionIconWrap}>
                  <Moon size={20} color={colors.accent} weight="fill" />
                </View>
                <Text style={[s.optionLabel, fontStyles.semiBold]}>
                  {t(theme.label)}
                </Text>
                <Radio active={settings.theme === theme.value} s={s} />
              </TouchableOpacity>
            ))}
          </View>
        </FadeInView>

        <FadeInView delay={320} duration={700} keepRasterized>
          <Text style={[s.sectionTitle, fontStyles.bold]}>{t("Default Payment")}</Text>
          <Text style={[s.sectionHint, fontStyles.medium]}>
            {t("Used automatically when you start a new request")}
          </Text>
          <View style={s.optionCard}>
            {PAYMENT_METHODS.map((method, index) => {
              const selected = settings.defaultPayment === method.value;
              return (
                <TouchableOpacity
                  key={method.value}
                  style={[s.optionRow, index > 0 && s.optionDivider]}
                  activeOpacity={0.8}
                  onPress={() => setDefaultPayment(method.value)}
                >
                  <View style={s.paymentLogoTile}>
                    {method.logo ? (
                      <Image
                        source={method.logo}
                        style={s.paymentLogo}
                        resizeMode="contain"
                        resizeMethod="resize"
                      />
                    ) : (
                      method.value === "PayPal" ? (
                        <PaypalLogo size={22} color="#003087" weight="fill" />
                      ) : (
                        <MoneyWavy size={19} color="#16a34a" weight="fill" />
                      )
                    )}
                  </View>
                  <Text style={[s.optionLabel, fontStyles.semiBold]}>{t(method.label)}</Text>
                  <Radio active={selected} s={s} />
                </TouchableOpacity>
              );
            })}
          </View>
        </FadeInView>

        <FadeInView delay={420} duration={700} keepRasterized>
          <Text style={[s.sectionTitle, fontStyles.bold]}>{t("App")}</Text>
          <View style={s.optionCard}>
            <View style={s.optionRow}>
              <View style={s.optionIconWrap}>
                <Bell size={20} color={colors.accent} weight="fill" />
              </View>
              <View style={s.optionTextBlock}>
                <Text style={[s.optionLabel, fontStyles.semiBold]}>{t("Notifications")}</Text>
                <Text style={[s.optionSub, fontStyles.medium]}>{t("Job updates and offer alerts")}</Text>
              </View>
              <Toggle value={notificationsOn} onValueChange={value => void handleNotificationsToggle(value)} />
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={520} duration={700} keepRasterized>
          <TouchableOpacity
            style={s.logoutButton}
            activeOpacity={0.85}
            onPress={handleLogout}
          >
            <SignOut size={20} color={colors.white} weight="bold" />
            <Text style={[s.logoutText, fontStyles.semiBold]}>{t("Logout")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.deleteAccountButton}
            activeOpacity={0.85}
            disabled={deleting}
            onPress={() => setConfirmDelete(true)}
          >
            <Trash size={18} color={colors.danger} weight="bold" />
            <Text style={[s.deleteAccountText, fontStyles.semiBold]}>
              {deleting ? t("Deleting...") : t("Delete account")}
            </Text>
          </TouchableOpacity>
        </FadeInView>
      </ScrollView>

      <CustomAlert
        visible={confirmDelete}
        title={t("Delete your account?")}
        message={t(
          "This permanently removes your profile, photos, bookings and saved details. It cannot be undone.",
        )}
        buttons={[
          { label: t("Cancel"), variant: "secondary" },
          { label: t("Delete account"), variant: "danger", onPress: handleDeleteAccount },
        ]}
        onClose={() => setConfirmDelete(false)}
      />

      <CustomAlert
        visible={pushBlockedAlert}
        title={t("Notifications are off")}
        message={t(
          "Doyo needs notification permission to tell you about offers and job updates. Open settings and turn notifications on.",
        )}
        buttons={[
          { label: t("Not now"), variant: "secondary" },
          {
            label: t("Open settings"),
            variant: "primary",
            onPress: () => void Linking.openSettings().catch(() => undefined),
          },
        ]}
        onClose={() => setPushBlockedAlert(false)}
      />

      <CustomAlert
        visible={!!deleteError}
        title={t("Could not delete your account")}
        message={deleteError ?? ""}
        buttons={[{ label: t("OK") }]}
        onClose={() => setDeleteError(null)}
      />
    </ScreenBackground>
  );
}
