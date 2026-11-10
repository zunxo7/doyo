import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { MapPin, Star, UserCircle } from "phosphor-react-native";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeChatCardStyles } from "../styles/ChatCards.styles";
import { fontStyles } from "../styles/fonts";

/** The app's cleaning-tools pattern, faint inside a card, at the size it has on the screen behind. */
export function CardPattern() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Image
        source={require("../assets/images/BackgroundPatternNeutral.png")}
        style={{ position: "absolute", top: -40, left: -30, width: 352, height: 768, opacity: 0.06 }}
        resizeMode="cover"
      />
    </View>
  );
}

const SERVICE_IMAGES = {
  home: require("../assets/images/HomeServicesIcon.webp"),
  vehicle: require("../assets/images/VehicleServicesIcon.webp"),
  furniture: require("../assets/images/FurnitureServicesIcon.webp"),
  barber: require("../assets/images/BarberServicesIcon.webp"),
};

type JobProps = {
  service: keyof typeof SERVICE_IMAGES;
  title: string;
  summary: string;
  address: string;
  worker: string;
  ask: number;
  limit: number;
  payment: string;
  editable: boolean;
  busy: boolean;
  onTogglePayment: () => void;
  onChange: () => void;
  onBook: () => void;
};

/** The job Doyo is about to book: what, where, the price it opens at and never passes, and how it is paid. */
export function JobCard({ service, title, summary, address, worker, ask, limit, payment, editable, busy, onTogglePayment, onChange, onBook }: JobProps) {
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeChatCardStyles);
  return (
    <View style={s.card}>
      <CardPattern />
      <View style={s.head}>
        <View style={s.icon}>
          <Image source={SERVICE_IMAGES[service]} style={s.iconImage} resizeMode="contain" />
        </View>
        <View style={s.titleBlock}>
          <Text style={[s.title, fontStyles.bold]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[s.sub, fontStyles.medium]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <View style={s.priceBlock}>
          <Text style={[s.price, fontStyles.bold]}>PKR{ask.toLocaleString()}</Text>
          <Text style={[s.priceCaption, fontStyles.medium]}>{t("to start")}</Text>
        </View>
      </View>

      <View style={s.place}>
        <MapPin size={15} color={colors.accent} weight="fill" />
        <Text style={[s.placeText, fontStyles.medium]} numberOfLines={1}>
          {address}
        </Text>
      </View>

      <View style={s.tiles}>
        <View style={s.tile}>
          <Text style={[s.tileLabel, fontStyles.medium]}>{t("Worker")}</Text>
          <Text style={[s.tileValue, fontStyles.semiBold]} numberOfLines={1}>
            {worker}
          </Text>
        </View>
        <View style={s.tile}>
          <Text style={[s.tileLabel, fontStyles.medium]}>{t("Never over")}</Text>
          <Text style={[s.tileValue, fontStyles.semiBold]} numberOfLines={1}>
            PKR{limit.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity style={s.tile} activeOpacity={0.8} disabled={!editable} onPress={onTogglePayment}>
          <Text style={[s.tileLabel, fontStyles.medium]}>{t("Pay with")}</Text>
          <Text style={[s.tileValue, s.tileValueLink, fontStyles.semiBold]} numberOfLines={1}>
            {payment}
          </Text>
        </TouchableOpacity>
      </View>

      {editable ? (
        <View style={s.actions}>
          <TouchableOpacity style={s.secondary} activeOpacity={0.85} onPress={onChange}>
            <Text style={[s.buttonText, fontStyles.semiBold]}>{t("Change")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.primary} activeOpacity={0.9} disabled={busy} onPress={onBook}>
            <Text style={[s.buttonText, fontStyles.semiBold]}>{t("Book it")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

type BookedProps = {
  name: string;
  avatar?: "male" | "female";
  rating: string;
  minutesAway: number;
  price: number;
  saved: number;
  onTrack: () => void;
};

/** Who Doyo booked and for how much, with the way into tracking. */
export function BookedCard({ name, avatar, rating, minutesAway, price, saved, onTrack }: BookedProps) {
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeChatCardStyles);
  return (
    <View style={[s.card, s.cardBooked]}>
      <CardPattern />
      <Text style={[s.label, fontStyles.semiBold]}>{t("Booked")}</Text>
      <View style={s.head}>
        <View style={s.icon}>
          <UserCircle size={36} color={avatar === "female" ? colors.accent : colors.white} weight="fill" />
        </View>
        <View style={s.titleBlock}>
          <Text style={[s.title, fontStyles.bold]} numberOfLines={1}>
            {name}
          </Text>
          <View style={s.meta}>
            <Star size={12} color="#ffd400" weight="fill" />
            <Text style={[s.metaText, fontStyles.medium]}>
              {rating} · {t("{min} min away", { min: minutesAway })}
            </Text>
          </View>
        </View>
        <View style={s.priceBlock}>
          <Text style={[s.price, fontStyles.bold]}>PKR{price.toLocaleString()}</Text>
          {saved > 0 ? <Text style={[s.priceCaption, fontStyles.medium]}>{t("Saved PKR{amount}", { amount: saved.toLocaleString() })}</Text> : null}
        </View>
      </View>
      <View style={s.actions}>
        <TouchableOpacity style={s.primary} activeOpacity={0.9} onPress={onTrack}>
          <Text style={[s.buttonText, fontStyles.semiBold]}>{t("Track on map")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
