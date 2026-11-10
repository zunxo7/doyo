import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { House } from "phosphor-react-native";
import { useColors, useThemedStyles } from "../hooks/useColors";
import type { Palette } from "../styles/colors";

const BOX = 48;
const ORB = 38;
const GAP = 8;
const SHADOW_H = 7;
/** Total height of the artwork — anchor offset derives from this */
export const PIN_HEIGHT = BOX + GAP + SHADOW_H;

/**
 * The location marker: an accent orb with a house icon that gently hovers,
 * plus a soft ground shadow that breathes in sync (marks the exact point).
 */
export default function LocationPin({ floating = true }: { floating?: boolean }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const bob = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      bob.value = 0;
      bob.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      return () => cancelAnimation(bob);
    }, [bob])
  );

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * bob.value }, { scale: 1 + 0.06 * bob.value }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - 0.35 * bob.value }],
    opacity: 0.45 - 0.28 * bob.value,
  }));

  return (
    <View style={[s.wrap, floating && s.floating, { pointerEvents: "none" }]}>
      <Reanimated.View style={[s.pinGroup, pinStyle]}>
        <View style={s.orb} />
        <View style={s.iconWrap}>
          <House size={18} color={colors.white} weight="fill" />
        </View>
      </Reanimated.View>
      <Reanimated.View style={[s.shadow, shadowStyle]} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
    },
    floating: {
      marginTop: -PIN_HEIGHT,
    },
    pinGroup: {
      width: BOX,
      height: BOX,
      alignItems: "center",
      justifyContent: "center",
    },
    orb: {
      position: "absolute",
      width: ORB,
      height: ORB,
      borderRadius: ORB / 2,
      backgroundColor: c.accent,
      borderWidth: 3,
      borderColor: c.white,
    },
    iconWrap: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    shadow: {
      width: 22,
      height: SHADOW_H,
      marginTop: GAP,
      borderRadius: SHADOW_H / 2,
      backgroundColor: "#000",
    },
  });
