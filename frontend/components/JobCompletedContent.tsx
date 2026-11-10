import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Reanimated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Check } from "phosphor-react-native";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeTrackingStyles } from "../styles/WorkerTrackingScreen.styles";
import { fontStyles } from "../styles/fonts";

export type CompletedRow = { label: string; value: string; highlight?: boolean };

interface Props {
  /** Descriptive line under the "Job Completed!" title. */
  subtitle: string;
  /** Summary rows (worker/customer, service, payment, total/earned…). */
  rows: CompletedRow[];
  /** Label for the primary button, e.g. "Rate Ali". */
  rateLabel: string;
  onRate: () => void;
}

/**
 * Job-completed content shared by the customer and worker tracking sheets —
 * identical look, the caller supplies the context (rows, subtitle, button).
 */
export default function JobCompletedContent({ subtitle, rows, rateLabel, onRate }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const ts = useThemedStyles(makeTrackingStyles);

  const checkScale = useSharedValue(0);
  useEffect(() => {
    checkScale.value = withDelay(
      120,
      withSequence(
        withTiming(1.18, { duration: 280, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [checkScale]);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  return (
    <Reanimated.View
      renderToHardwareTextureAndroid
      needsOffscreenAlphaCompositing
      entering={FadeIn.duration(240)}
    >
      <Reanimated.View style={[ts.completedBadge, checkStyle]}>
        <Check size={44} color={colors.white} weight="bold" />
      </Reanimated.View>

      <Text style={[ts.completedTitle, fontStyles.bold]}>{t("Job Completed!")}</Text>
      <Text style={[ts.completedSubtitle, fontStyles.medium]}>{subtitle}</Text>

      <View style={ts.summaryCard}>
        {rows.map(row => (
          <Row key={row.label} label={row.label} value={row.value} highlight={row.highlight} fonts={fonts} ts={ts} />
        ))}
      </View>

      <TouchableOpacity style={ts.completedButton} activeOpacity={0.9} onPress={onRate}>
        <Text style={[ts.completedButtonText, fontStyles.semiBold]}>{rateLabel}</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

function Row({
  label,
  value,
  highlight,
  fonts,
  ts,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  fonts: ReturnType<typeof useFontFamilies>;
  ts: ReturnType<typeof makeTrackingStyles>;
}) {
  return (
    <View style={ts.summaryRow}>
      <Text style={[ts.summaryLabel, fontStyles.medium]}>{label}</Text>
      <Text
        style={[ts.summaryValue, highlight && ts.summaryValueHighlight, fontStyles.semiBold]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
