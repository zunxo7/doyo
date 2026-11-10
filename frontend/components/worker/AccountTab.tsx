import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Briefcase, EnvelopeSimple, Phone, Star, User } from "phosphor-react-native";
import EditableAvatar from "../EditableAvatar";
import { useFontFamilies } from "../../hooks/useFontFamilies";
import { useSettings } from "../../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../../hooks/useColors";
import { makeWorkerStyles } from "../../styles/WorkerHomeScreen.styles";
import { getStoredUser, type StoredUser } from "../../services/auth";
import { avatarOwnerKeyFor } from "../../services/avatar";
import { getCurrentUserId, uploadWorkerPhoto } from "../../services/bidding";
import { fontStyles } from "../../styles/fonts";

type Props = {
  name: string;
  workerId: string;
  jobsCompleted: number;
  rating: string;
  /** Resolved once by WorkerHomeScreen — this tab remounts on every visit. */
  photoUri: string | null;
  onPhotoChange: (uri: string) => void;
};

export default function AccountTab({ name, jobsCompleted, rating, photoUri, onPhotoChange }: Props) {
  const fonts = useFontFamilies();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);
  const { t } = useSettings();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  const email = user?.email || t("Not signed in");
  const phone = user?.phone || t("Not added");
  const avatarOwnerKey = avatarOwnerKeyFor(user);

  const savePhoto = async (uri: string) => {
    onPhotoChange(uri);
    if (!user) return;
    const workerId = await getCurrentUserId(user.name ?? name);
    await uploadWorkerPhoto(workerId, uri);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.tabContent, s.tabContentPadded]}>
      <View style={s.accountHeader}>
        <EditableAvatar photoUri={photoUri} ownerKey={avatarOwnerKey} onPick={savePhoto} size={88} />
        <Text style={[s.accountName, fontStyles.bold]}>{name}</Text>
        <View style={s.accountBadgeRow}>
          <Star size={13} color="#ffd400" weight="fill" />
          <Text style={[s.accountBadgeText, fontStyles.semiBold]}>
            {rating}
          </Text>
        </View>
      </View>

      <Text style={[s.sectionLabel, fontStyles.semiBold]}>{t("Account Info")}</Text>
      <View style={s.accountMenu}>
        <View style={s.infoRow}>
          <View style={s.accountRowIcon}>
            <User size={20} color={colors.accent} weight="fill" />
          </View>
          <View style={s.infoTextBlock}>
            <Text style={[s.infoLabel, fontStyles.medium]}>{t("Name")}</Text>
            <Text style={[s.infoValue, fontStyles.semiBold]} numberOfLines={1}>
              {name}
            </Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <View style={s.accountRowIcon}>
            <EnvelopeSimple size={20} color={colors.accent} weight="fill" />
          </View>
          <View style={s.infoTextBlock}>
            <Text style={[s.infoLabel, fontStyles.medium]}>{t("Email")}</Text>
            <Text style={[s.infoValue, fontStyles.semiBold]} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <View style={s.accountRowIcon}>
            <Phone size={20} color={colors.accent} weight="fill" />
          </View>
          <View style={s.infoTextBlock}>
            <Text style={[s.infoLabel, fontStyles.medium]}>{t("Phone")}</Text>
            <Text style={[s.infoValue, fontStyles.semiBold]} numberOfLines={1}>
              {phone}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[s.sectionLabel, fontStyles.semiBold]}>{t("Trust & Activity")}</Text>
      <View style={s.accountMenu}>
        <View style={s.infoRow}>
          <View style={s.accountRowIcon}>
            <Briefcase size={20} color={colors.accent} weight="fill" />
          </View>
          <View style={s.infoTextBlock}>
            <Text style={[s.infoLabel, fontStyles.medium]}>{t("Completed jobs")}</Text>
            <Text style={[s.infoValue, fontStyles.semiBold]}>{t("{n} jobs", { n: jobsCompleted })}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
