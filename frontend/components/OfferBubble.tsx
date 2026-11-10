import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Star, UserCircle } from "phosphor-react-native";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeOfferBubbleStyles } from "../styles/OfferBubble.styles";
import { fontStyles } from "../styles/fonts";

export type OfferLine = {
  text: string;
  name?: string;
  avatar?: "male" | "female";
  price?: number;
  rating?: string;
  jobs?: string;
  minutesAway?: number;
};

type Props = {
  line: OfferLine;
  /** Shown while this is the worker's live offer and the customer is choosing. */
  onCounter?: () => void;
  onAccept?: () => void;
  /** A later offer from the same worker replaced this one. */
  superseded?: boolean;
};

/**
 * A worker's message in the chat. When it carries an offer, it is the offer: who they are, their
 * price and their words in one card, where they said it, so the conversation reads top to bottom.
 */
export default function OfferBubble({ line, onCounter, onAccept, superseded = false }: Props) {
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeOfferBubbleStyles);
  const actionable = Boolean(onAccept && onCounter);
  const facts = [line.jobs ? t("{jobs} jobs", { jobs: line.jobs }) : null, line.minutesAway != null ? t("{min} min away", { min: line.minutesAway }) : null].filter(Boolean);

  return (
    <View style={s.row}>
      <View style={s.avatar}>
        <UserCircle size={32} color={line.avatar === "female" ? colors.accent : colors.white} weight="fill" />
      </View>
      <View style={[s.card, actionable && s.cardLive]}>
        <View style={s.head}>
          <View style={s.who}>
            <Text style={[s.name, fontStyles.bold]} numberOfLines={1}>
              {line.name}
            </Text>
            {line.rating || facts.length ? (
              <View style={s.meta}>
                {line.rating ? (
                  <>
                    <Star size={12} color="#ffd400" weight="fill" />
                    <Text style={[s.metaText, fontStyles.semiBold]}>{line.rating}</Text>
                  </>
                ) : null}
                {facts.length ? <Text style={[s.metaText, fontStyles.medium]}>{`${line.rating ? " · " : ""}${facts.join(" · ")}`}</Text> : null}
              </View>
            ) : null}
          </View>
          {line.price != null ? (
            <Text style={[s.price, fontStyles.bold, superseded && s.priceGone]}>PKR{line.price.toLocaleString()}</Text>
          ) : null}
        </View>
        <Text style={[s.message, fontStyles.medium]}>{line.text}</Text>
        {actionable ? (
          <View style={s.actions}>
            <TouchableOpacity style={s.counter} activeOpacity={0.85} onPress={onCounter}>
              <Text style={[s.actionText, fontStyles.semiBold]}>{t("Counter")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.accept} activeOpacity={0.9} onPress={onAccept}>
              <Text style={[s.actionText, fontStyles.semiBold]}>{t("Accept")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}
