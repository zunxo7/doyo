import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, CalendarCheck, EnvelopeSimple, Phone, Star, User } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import EditableAvatar from "../components/EditableAvatar";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeProfileStyles } from "../styles/ProfileScreen.styles";
import { getStoredUser, saveUser, type StoredUser } from "../services/auth";
import { avatarOwnerKeyFor, getAvatar, restoreAvatarFromRemote } from "../services/avatar";
import { fetchCustomerBookings, getCurrentUserId, uploadCustomerPhoto, workerPhotoUrl } from "../services/bidding";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "Profile">;
  route: RouteProp<RootStackParamList, "Profile">;
};

export default function ProfileScreen({ navigation, route }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const s = useThemedStyles(makeProfileStyles);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [name, setName] = useState(route.params?.name ?? "");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [bookings, setBookings] = useState(0);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);

  useEffect(() => {
    getStoredUser().then(async stored => {
      if (!stored) return;
      setUser(stored);
      if (stored.name) setName(stored.name);
      const ownerKey = avatarOwnerKeyFor(stored);
      const saved = await getAvatar(ownerKey);
      setPhotoUri(saved ?? stored.photoUri ?? null);
      setBookings(stored.bookings ?? 0);

      const id = await getCurrentUserId(stored.name ?? "guest");
      // Both modes upload to the same object under the same id, so this is the
      // account's picture — not a worker-only one. Without it a reinstall left
      // the customer profile blank while worker mode restored it fine.
      if (!saved) {
        const restored = await restoreAvatarFromRemote(ownerKey, workerPhotoUrl(id));
        if (restored) setPhotoUri(restored);
      }
      const count = await fetchCustomerBookings(id);
      setBookings(count);
      if (count !== (stored.bookings ?? 0)) {
        await saveUser({ ...stored, bookings: count });
      }
    });
  }, []);

  const rating = user?.rating ?? 5.0;
  const avatarOwnerKey = avatarOwnerKeyFor(user);
  const trimmed = name.trim();
  const email = user?.email ?? t("Not signed in");
  const phone = user?.phone ?? t("Not added");

  const savePhoto = async (uri: string) => {
    setPhotoUri(uri);
    if (!user) return;
    const id = await getCurrentUserId(user.name ?? name ?? "guest");
    const uploaded = await uploadCustomerPhoto(id, uri);
    const updated = uploaded
      ? { ...user, photoUri: uri, photoUrl: `${uploaded}${uploaded.includes("?") ? "&" : "?"}v=${Date.now()}` }
      : { ...user, photoUri: uri };
    await saveUser(updated);
    setUser(updated);
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FadeInView style={s.headerRow} delay={0} duration={600} keepRasterized>
          <TouchableOpacity
            style={s.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.85}
          >
            <ArrowLeft size={22} color={colors.white} weight="bold" />
          </TouchableOpacity>
          <Text style={[s.headerTitle, fontStyles.bold]}>{t("Profile")}</Text>
        </FadeInView>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <FadeInView delay={120} duration={700} keepRasterized>
            <View style={s.avatarSection}>
              <EditableAvatar photoUri={photoUri} ownerKey={avatarOwnerKey} onPick={savePhoto} size={88} />
              <Text style={[s.headerName, fontStyles.bold]} numberOfLines={1}>
                {trimmed || t("Your name")}
              </Text>
              <View style={s.ratingRow}>
                <Star size={13} color="#ffd400" weight="fill" />
                <Text style={[s.ratingValue, fontStyles.semiBold]}>{rating.toFixed(1)}</Text>
              </View>
            </View>

            <Text style={[s.sectionLabel, fontStyles.semiBold]}>{t("Account Info")}</Text>
            <View style={s.card}>
              <View style={s.row}>
                <View style={s.rowIconWrap}>
                  <User size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={s.rowTextBlock}>
                  <Text style={[s.rowLabel, fontStyles.medium]}>{t("Name")}</Text>
                  <Text style={[s.rowValue, fontStyles.semiBold]} numberOfLines={1}>
                    {trimmed || t("Your name")}
                  </Text>
                </View>
              </View>

              <View style={s.row}>
                <View style={s.rowIconWrap}>
                  <EnvelopeSimple size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={s.rowTextBlock}>
                  <Text style={[s.rowLabel, fontStyles.medium]}>{t("Email")}</Text>
                  <Text style={[s.rowValue, fontStyles.semiBold]} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
              </View>

              <View style={s.row}>
                <View style={s.rowIconWrap}>
                  <Phone size={20} color={colors.accent} weight="fill" />
                </View>
                <View style={s.rowTextBlock}>
                  <Text style={[s.rowLabel, fontStyles.medium]}>{t("Phone")}</Text>
                  <Text style={[s.rowValue, fontStyles.semiBold]} numberOfLines={1}>
                    {phone}
                  </Text>
                </View>
              </View>
            </View>

            <FadeInView delay={260} duration={700} keepRasterized>
              <Text style={[s.sectionLabel, fontStyles.semiBold]}>{t("Activity")}</Text>
              <View style={s.card}>
                <ProfileInfoRow Icon={CalendarCheck} label={t("Completed bookings")} value={String(bookings)} fonts={fonts} />
              </View>
            </FadeInView>
          </FadeInView>
        </ScrollView>
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

function ProfileInfoRow({
  Icon,
  label,
  value,
  fonts,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: "fill" | "bold" | "regular" }>;
  label: string;
  value: string;
  fonts: ReturnType<typeof useFontFamilies>;
}) {
  const s = useThemedStyles(makeProfileStyles);
  const colors = useColors();
  return (
    <View style={s.row}>
      <View style={s.rowIconWrap}>
        <Icon size={20} color={colors.accent} weight="fill" />
      </View>
      <View style={s.rowTextBlock}>
        <Text style={[s.rowLabel, fontStyles.medium]}>{label}</Text>
        <Text style={[s.rowValue, fontStyles.semiBold]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}
