import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Reanimated, { type AnimatedStyle } from "react-native-reanimated";
import type { StyleProp, ViewStyle } from "react-native";
import { useT } from "../contexts/SettingsContext";
import { useColors } from "../hooks/useColors";
import { getCachedAppConfig } from "../services/appConfig";
import { advanceReviewDemo } from "../services/bidding";
import { fontStyles } from "../styles/fonts";
import type { Palette } from "../styles/colors";

/** Height of the pill — parents need it to sit the bar above their sheet. */
export const DEMO_BAR_HEIGHT = 48;

type Props = {
  /** The reviewer's own id — customer id or worker id, depending on the side. */
  actorId: string;
  /** Which side of the booking the reviewer is looking at. */
  role: "customer" | "worker";
  /**
   * "floating" rides above a bottom sheet, exactly like the back button: the
   * parent owns the geometry and passes an animated transform through `style`.
   * "inline" is for screens with no sheet to sit above.
   */
  variant?: "floating" | "inline";
  /**
   * Reanimated's own style type, not StyleProp<ViewStyle>: the floating variant
   * is handed a useAnimatedStyle() handle, which stopped being assignable to a
   * plain ViewStyle.
   */
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
  /**
   * Overrides the server call. Used where there is no job to advance — the
   * "application under review" screen, where the step being skipped is an
   * admin approving them.
   */
  onPress?: () => void | Promise<void>;
};

/**
 * Performs the simulated worker's next step, so whoever is trying the demo
 * sets the pace. Every step of their own is still done by hand.
 */
export default function DemoFlowBar({ actorId, role, variant = "floating", style, onPress }: Props) {
  const t = useT();
  const colors = useColors();
  const s = makeStyles(colors);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!getCachedAppConfig().reviewLocation) return null;

  const advance = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    if (onPress) {
      await onPress();
      setBusy(false);
      return;
    }
    const result = await advanceReviewDemo(actorId, role);
    setBusy(false);
    // A refusal is usually "the next step is yours", which is information the
    // reviewer wants rather than an error to swallow.
    if (!result.ok) setNote(result.message ?? t("Nothing to advance right now."));
  };

  const body = (
    <>
      <TouchableOpacity
        style={[s.button, busy && s.buttonBusy]}
        onPress={advance}
        activeOpacity={0.85}
        disabled={busy}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={[s.label, fontStyles.semiBold]}>{t("Continue demo flow")}</Text>
        )}
      </TouchableOpacity>
      {note ? (
        <Text style={[s.note, fontStyles.medium]} numberOfLines={2}>
          {note}
        </Text>
      ) : null}
    </>
  );

  if (variant === "inline") {
    // The inline variant is never given an animated style — it has no sheet to
    // ride above — so a plain View is right here.
    return <View style={[s.inline, style as StyleProp<ViewStyle>]}>{body}</View>;
  }

  return (
    <Reanimated.View style={[s.floating, style]} pointerEvents="box-none">
      {body}
    </Reanimated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    // Mirrors floatingBack: pinned to the left gutter, lifted above the sheet
    // by an animated transform the parent supplies.
    floating: {
      position: "absolute",
      top: 0,
      left: 10,
      zIndex: 6,
      alignItems: "flex-start",
    },
    inline: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    button: {
      height: DEMO_BAR_HEIGHT,
      borderRadius: DEMO_BAR_HEIGHT / 2,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    buttonBusy: {
      opacity: 0.7,
    },
    label: {
      color: "#ffffff",
      fontSize: 15,
      letterSpacing: 0.2,
    },
    note: {
      color: "#ffffff",
      fontSize: 12,
      paddingTop: 6,
      paddingHorizontal: 4,
      maxWidth: 260,
    },
  });
