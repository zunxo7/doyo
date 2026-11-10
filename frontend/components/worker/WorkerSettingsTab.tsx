import React, { useEffect } from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Bell, Broom, Car, Couch, Moon, Scissors, ShoppingBag, SignOut, Translate } from "phosphor-react-native";
import { useFontFamilies } from "../../hooks/useFontFamilies";
import { useSettings } from "../../contexts/SettingsContext";
import { useNotificationPermission } from "../../hooks/useNotificationPermission";
import { useColors, useThemedStyles } from "../../hooks/useColors";
import CustomAlert from "../CustomAlert";
import { makeWorkerStyles } from "../../styles/WorkerHomeScreen.styles";
import { fetchWorkerServices, getCurrentUserId, updateWorkerServices } from "../../services/bidding";
import { fontStyles } from "../../styles/fonts";

// The same ids as worker onboarding; the server sends jobs only for these.
const WORKER_SERVICES = [
  { value: "home_cleaning", label: "Home cleaning", Icon: Broom },
  { value: "vehicle_cleaning", label: "Vehicle cleaning", Icon: Car },
  { value: "furniture_shifting", label: "Furniture shifting", Icon: Couch },
  { value: "barber", label: "Barber services", Icon: Scissors },
];

type Props = {
  onLogout: () => void;
  onSwitchToCustomer: () => void;
};

export default function WorkerSettingsTab({ onLogout, onSwitchToCustomer }: Props) {
  const fonts = useFontFamilies();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);
  const { settings, setTheme, t } = useSettings();

  const [pushBlockedAlert, setPushBlockedAlert] = React.useState(false);
  const [services, setServices] = React.useState<string[] | null>(null);
  const [servicesAlert, setServicesAlert] = React.useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId("worker")
      .then(fetchWorkerServices)
      .then(setServices)
      .catch(() => undefined);
  }, []);

  const toggleService = async (value: string) => {
    if (!services) return;
    const next = services.includes(value) ? services.filter(item => item !== value) : [...services, value];
    if (next.length === 0) {
      setServicesAlert(t("Keep at least one service so jobs can reach you."));
      return;
    }
    const previous = services;
    setServices(next);
    try {
      setServices(await updateWorkerServices(await getCurrentUserId("worker"), next));
    } catch (error) {
      setServices(previous);
      setServicesAlert(error instanceof Error && error.message ? t(error.message) : t("Please try again."));
    }
  };
  const { on: notificationsOn, toggle } = useNotificationPermission();

  // A worker whose phone is blocking notifications should see the switch off
  // and be told why, the same way going online without background location is.
  const toggleNotifications = async () => {
    if (!(await toggle(!notificationsOn))) setPushBlockedAlert(true);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.tabContent, s.tabContentPadded]}>
      <Text style={[s.workerSettingsSectionLabel, s.workerSettingsFirstSectionLabel, fontStyles.bold]}>
        {t("Services I provide")}
      </Text>
      <Text style={[s.workerSectionHint, fontStyles.medium]}>
        {t("You only get jobs for the services you pick")}
      </Text>
      <View style={s.accountMenu}>
        {WORKER_SERVICES.map(({ value, label, Icon }) => {
          const on = services?.includes(value) ?? false;
          return (
            <TouchableOpacity
              key={value}
              style={s.settingRow}
              activeOpacity={0.85}
              onPress={() => void toggleService(value)}
              disabled={!services}
            >
              <View style={s.accountRowIcon}>
                <Icon size={20} color={colors.accent} weight="fill" />
              </View>
              <View style={s.settingTextBlock}>
                <Text style={[s.settingLabel, fontStyles.semiBold]}>{t(label)}</Text>
              </View>
              <View style={[s.workerToggleTrack, on && s.workerToggleTrackActive]}>
                <View style={[s.workerToggleThumb, on && s.workerToggleThumbActive]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[s.workerSettingsSectionLabel, fontStyles.bold]}>{t("Theme")}</Text>
      <Text style={[s.workerSectionHint, fontStyles.medium]}>
        {t("Choose how Doyo looks on your phone")}
      </Text>
      <View style={s.accountMenu}>
        <TouchableOpacity style={s.settingRow} activeOpacity={0.85} onPress={() => setTheme("dark")}>
          <View style={s.accountRowIcon}>
            <Moon size={20} color={colors.accent} weight="fill" />
          </View>
          <View style={s.settingTextBlock}>
            <Text style={[s.settingLabel, fontStyles.semiBold]}>{t("Dark")}</Text>
          </View>
          <View style={[s.radio, s.radioActive]}>
            <View style={s.radioDot} />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={[s.workerSettingsSectionLabel, fontStyles.bold]}>{t("App")}</Text>
      <View style={s.accountMenu}>
        <TouchableOpacity style={s.settingRow} activeOpacity={0.85} onPress={() => void toggleNotifications()}>
          <View style={s.accountRowIcon}>
            <Bell size={20} color={colors.accent} weight="fill" />
          </View>
          <View style={s.settingTextBlock}>
            <Text style={[s.settingLabel, fontStyles.semiBold]}>{t("Notifications")}</Text>
            <Text style={[s.settingSub, fontStyles.medium]}>{t("Job updates and offer alerts")}</Text>
          </View>
          <View style={[s.workerToggleTrack, notificationsOn && s.workerToggleTrackActive]}>
            <View style={[s.workerToggleThumb, notificationsOn && s.workerToggleThumbActive]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Being verified to work does not stop you needing a cleaner. Switching
          only changes which side is on screen — approval is untouched, so
          coming back needs no re-verification. */}
      <TouchableOpacity style={s.workerSwitchButton} activeOpacity={0.9} onPress={onSwitchToCustomer}>
        <ShoppingBag size={19} color={colors.accent} weight="bold" />
        <Text style={[s.workerSwitchText, fontStyles.semiBold]}>{t("Customer mode")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.workerLogoutButton} activeOpacity={0.9} onPress={onLogout}>
        <SignOut size={19} color={colors.white} weight="bold" />
        <Text style={[s.workerLogoutText, fontStyles.semiBold]}>{t("Logout")}</Text>
      </TouchableOpacity>

      <CustomAlert
        visible={!!servicesAlert}
        title={t("Services not saved")}
        message={servicesAlert ?? undefined}
        onClose={() => setServicesAlert(null)}
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
    </ScrollView>
  );
}
