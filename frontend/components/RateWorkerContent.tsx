import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Reanimated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Clock, ShieldCheck, Smiley, Sparkle, Star, UserCircle } from "phosphor-react-native";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeTrackingStyles } from "../styles/WorkerTrackingScreen.styles";
import { fontStyles } from "../styles/fonts";

interface Props {
  /** Name of the person being rated (worker for customers, customer for workers). */
  name: string;
  gender?: "male" | "female";
  /** Workers pick compliments; customers only leave a star rating. */
  showCompliments?: boolean;
  onSend: (rating: number, compliments: string[]) => void;
}

// English source strings double as i18n keys
const RATING_WORDS = ["", "Poor", "Could be better", "Good", "Great", "Excellent"];

const COMPLIMENTS = [
  { label: "Clean & thorough", Icon: Sparkle },
  { label: "Polite worker", Icon: Smiley },
  { label: "On time", Icon: Clock },
  { label: "Careful with items", Icon: ShieldCheck },
];

const STAR_COLOR = "#ffd400";

/**
 * Rating content shared by the customer and worker tracking sheets. Workers
 * also get the compliment chips; customers leave stars only.
 */
export default function RateWorkerContent({ name, gender, showCompliments = false, onSend }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const ts = useThemedStyles(makeTrackingStyles);
  const [rating, setRating] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);

  const firstName = name.split(" ")[0];

  const toggle = (label: string) => {
    setSelected(prev => (prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]));
  };

  return (
    <Reanimated.View
      renderToHardwareTextureAndroid
      needsOffscreenAlphaCompositing
      entering={FadeIn.duration(240)}
    >
      <View style={ts.rateAvatarRow}>
        <View style={ts.rateAvatar}>
          <UserCircle size={42} color={gender === "female" ? colors.accent : colors.ink} weight="fill" />
        </View>
        <View style={{ flex: 1 }}>
          <Reanimated.Text
            key={rating}
            entering={FadeIn.duration(200)}
            style={[ts.rateWord, fontStyles.bold]}
          >
            {t(RATING_WORDS[rating] || "Rate {name}", { name: firstName })}
          </Reanimated.Text>
          <Text style={[ts.rateName, fontStyles.medium]} numberOfLines={1}>
            {t("How was {name}?", { name: firstName })}
          </Text>
        </View>
      </View>

      <View style={ts.starsRow}>
        {[1, 2, 3, 4, 5].map(i => (
          <StarButton
            key={i}
            active={i <= rating}
            inactiveColor={colors.fgFaint}
            onPress={() => setRating(i)}
          />
        ))}
      </View>

      {showCompliments ? (
        <Reanimated.View style={ts.complimentTagsWrap} layout={LinearTransition.duration(180)}>
          {COMPLIMENTS.map(({ label, Icon }) => {
            const active = selected.includes(label);
            return (
              <TouchableOpacity
                key={label}
                style={[ts.complimentTag, active && ts.complimentTagActive]}
                activeOpacity={0.85}
                onPress={() => toggle(label)}
              >
                <Icon size={16} color={active ? colors.white : colors.accent} weight="fill" />
                <Text
                  style={[ts.complimentTagText, active && ts.complimentTagTextActive, fontStyles.semiBold]}
                >
                  {t(label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Reanimated.View>
      ) : null}

      <TouchableOpacity
        style={ts.completedButton}
        activeOpacity={0.9}
        onPress={() => onSend(rating, selected)}
      >
        <Text style={[ts.completedButtonText, fontStyles.semiBold]}>{t("Send rating")}</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

function StarButton({
  active,
  inactiveColor,
  onPress,
}: {
  active: boolean;
  inactiveColor: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        scale.value = withSpring(1.25, { damping: 8, stiffness: 320 }, () => {
          scale.value = withSpring(1, { damping: 10, stiffness: 300 });
        });
        onPress();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Reanimated.View style={animatedStyle}>
        <Star
          size={40}
          color={active ? STAR_COLOR : inactiveColor}
          weight={active ? "fill" : "regular"}
        />
      </Reanimated.View>
    </TouchableOpacity>
  );
}
