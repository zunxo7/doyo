import React, { useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { CaretDoubleRight, Check } from "phosphor-react-native";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeSlideToCompleteStyles } from "../styles/SlideToComplete.styles";
import { fontStyles } from "../styles/fonts";

const SPRING = { damping: 22, stiffness: 240, mass: 0.9 };
const THUMB = 46;
const PAD = 4;

type Props = {
  label: string;
  onComplete: () => void;
};

/**
 * Drag-to-confirm slider — used for irreversible actions (like completing a job)
 * so an accidental tap can't trigger them. The thumb springs back unless dragged
 * (almost) all the way across.
 *
 * Built on react-native-gesture-handler (not PanResponder) so it works reliably
 * inside the draggable bottom sheet, and the pan only activates after real
 * horizontal movement — a plain tap can never complete the action.
 */
export default function SlideToComplete({ label, onComplete }: Props) {
  const fonts = useFontFamilies();
  const colors = useColors();
  const s = useThemedStyles(makeSlideToCompleteStyles);

  const [done, setDone] = useState(false);
  const x = useSharedValue(0);
  const maxX = useSharedValue(0);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    onComplete();
  };

  const pan = Gesture.Pan()
    // Only start once the finger has actually moved sideways — a tap never
    // activates the gesture, so it can't complete the action.
    .activeOffsetX([-12, 12])
    .onBegin(() => {
      "worklet";
      cancelAnimation(x);
    })
    .onUpdate(e => {
      "worklet";
      if (doneRef.current) return;
      x.value = Math.min(maxX.value, Math.max(0, e.translationX));
    })
    .onEnd(e => {
      "worklet";
      if (doneRef.current) return;
      const max = maxX.value;
      if (max > 0 && e.translationX >= max * 0.82) {
        x.value = withTiming(max, { duration: 140 }, finished => {
          if (finished) runOnJS(finish)();
        });
      } else {
        x.value = withSpring(0, SPRING);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB + PAD }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, Math.max(1, maxX.value) * 0.6], [1, 0], "clamp"),
  }));

  return (
    <View
      style={s.track}
      onLayout={e => {
        maxX.value = Math.max(0, e.nativeEvent.layout.width - THUMB - PAD * 2);
      }}
    >
      <Reanimated.View style={[s.fill, fillStyle]} />
      <Reanimated.Text
        style={[s.label, labelStyle, fontStyles.semiBold]}
        numberOfLines={1}
      >
        {label}
      </Reanimated.Text>
      <GestureDetector gesture={pan}>
        <Reanimated.View style={[s.thumb, thumbStyle]}>
          {done ? (
            <Check size={22} color={colors.white} weight="bold" />
          ) : (
            <CaretDoubleRight size={22} color={colors.white} weight="bold" />
          )}
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
}
