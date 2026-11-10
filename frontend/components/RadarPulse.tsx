import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Reanimated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useThemedStyles } from "../hooks/useColors";
import type { Palette } from "../styles/colors";

type Props = {
  /** Screen Y of the point the rings radiate from */
  pinPointY: number;
};

/**
 * Searching radar rings radiating from the map pin. Render BEFORE the pin in
 * the tree so the rings stay underneath it.
 */
export default function RadarPulse({ pinPointY }: Props) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={[s.anchor, { top: pinPointY, pointerEvents: "none" }]}>
      <Ring delay={0} />
      <Ring delay={700} />
      <Ring delay={1400} />
    </View>
  );
}

function Ring({ delay }: { delay: number }) {
  const s = useThemedStyles(makeStyles);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2100, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [delay, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 0.15, 1], [0, 1, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.18, 1]) }],
  }));

  return <Reanimated.View style={[s.ring, ringStyle]} />;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    anchor: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
    },
    ring: {
      position: "absolute",
      top: -140, // center the ring on the anchor point
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: c.accentFill,
      borderWidth: 1.5,
      borderColor: c.accentLine,
    },
  });
