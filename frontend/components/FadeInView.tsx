import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleProp, ViewStyle, type ViewProps } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

interface Props extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  translateYDistance?: number;
  style?: StyleProp<ViewStyle>;
  keepRasterized?: boolean;
}

export default function FadeInView({
  children,
  delay = 0,
  duration = 520,
  translateYDistance = 4,
  style,
  keepRasterized = false,
  ...viewProps
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(translateYDistance);
  // Rasterize to a GPU texture while animating — Android stutters when
  // re-compositing heavy subtrees per frame. Released after the animation
  // so static content renders at full quality.
  const [rasterize, setRasterize] = useState(false);
  const rasterizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(() => {
    opacity.value = 0;
    translateY.value = translateYDistance;

    setRasterize(true);
    if (rasterizeTimer.current) clearTimeout(rasterizeTimer.current);
    // Never retain static screen content as a hardware texture: stacked
    // navigation screens otherwise keep consuming Android GPU memory.
    rasterizeTimer.current = setTimeout(() => setRasterize(false), delay + duration + 60);

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: duration * 0.85, easing: Easing.out(Easing.quad) })
    );
  }, [delay, duration, keepRasterized, opacity, translateY, translateYDistance]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    play();
    return () => {
      if (rasterizeTimer.current) clearTimeout(rasterizeTimer.current);
    };
  }, [play]);

  return (
    <Reanimated.View {...viewProps} renderToHardwareTextureAndroid={rasterize} style={[animatedStyle, style]}>
      {children}
    </Reanimated.View>
  );
}
