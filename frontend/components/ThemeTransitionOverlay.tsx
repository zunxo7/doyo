import React, { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet } from "react-native";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSettings } from "../contexts/SettingsContext";
import { palettes } from "../styles/colors";

/**
 * Full-screen veil that briefly washes over the app whenever the theme or
 * language changes, so the swap dissolves in instead of snapping. The veil is
 * tinted with the *incoming* theme's background, then fades back out to reveal
 * the freshly re-themed / re-translated screen underneath.
 *
 * Rendered inside a Modal so it sits in its own window — this guarantees it
 * covers EVERYTHING (native map, elevated bottom sheets, status bar), which a
 * plain root-level View can't do on Android because react-native-screens draws
 * the active screen's native content above sibling views regardless of zIndex.
 */
export default function ThemeTransitionOverlay() {
  const { settings } = useSettings();
  const opacity = useSharedValue(0);
  // Modal is only mounted during the wash, so it never blocks touches at rest
  const [active, setActive] = useState(false);

  // Skip the very first render — only animate on actual changes
  const prev = useRef({ theme: settings.theme, language: settings.language });

  useEffect(() => {
    const changed =
      prev.current.theme !== settings.theme || prev.current.language !== settings.language;
    prev.current = { theme: settings.theme, language: settings.language };
    if (!changed) return;

    opacity.value = 0;
    setActive(true);
    opacity.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }, finished => {
        if (finished) runOnJS(setActive)(false);
      }),
    );
  }, [settings.theme, settings.language, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Modal visible={active} transparent statusBarTranslucent animationType="none" onRequestClose={() => {}}>
      <Reanimated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: palettes[settings.theme].navy, pointerEvents: "none" },
          style,
        ]}
      />
    </Modal>
  );
}
