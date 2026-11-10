import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import type { Palette } from "../styles/colors";
import { fontStyles } from "../styles/fonts";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  initialValue: number;
  /** Lowest permitted amount for this particular price context. */
  minimumValue?: number;
  onClose: () => void;
  onSubmit: (value: number) => void;
}

/**
 * Top-sheet price input, themed like the app's other sheets. Slides down from
 * the top (so the keyboard never covers it) over a fading scrim.
 */
export default function PriceInputAlert({
  visible,
  title,
  message,
  initialValue,
  minimumValue = 50,
  onClose,
  onSubmit,
}: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [text, setText] = useState(String(initialValue));
  const [mounted, setMounted] = useState(visible);
  const anim = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText(String(initialValue));
      setMounted(true);
      anim.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      anim.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Scrim fades; the sheet slides — they're intentionally decoupled
  const scrimStyle = useAnimatedStyle(() => ({ opacity: anim.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (anim.value - 1) * 480 }],
  }));

  const parsed = parseInt(text.replace(/[^0-9]/g, ""), 10);
  const valid = Number.isFinite(parsed) && parsed >= minimumValue && parsed <= 100000;

  const submit = () => {
    if (!valid) return;
    onSubmit(parsed);
    onClose();
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      // autoFocus races the modal window on Android — focus once it's shown
      onShow={() => setTimeout(() => inputRef.current?.focus(), 80)}
    >
      <View style={s.overlay}>
        <Reanimated.View style={[s.scrim, scrimStyle]} />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <Reanimated.View style={[s.sheet, sheetStyle]}>
          <Text style={[s.title, fontStyles.bold]}>{title}</Text>
          {!!message && (
            <Text style={[s.message, fontStyles.medium]}>{message}</Text>
          )}

          <Text style={[s.minimumHint, fontStyles.medium]}>Minimum PKR{minimumValue}</Text>

          <View style={s.inputRow}>
            <Text style={[s.currency, fontStyles.semiBold]}>PKR</Text>
            <TextInput
              ref={inputRef}
              style={[s.input, fontStyles.semiBold]}
              value={text}
              onChangeText={value => setText(value.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="0"
              placeholderTextColor={colors.ink + "55"}
            />
          </View>

          <TouchableOpacity
            style={[s.setButton, !valid && s.setButtonDisabled]}
            activeOpacity={0.9}
            disabled={!valid}
            onPress={submit}
          >
            <Text style={[s.setButtonText, fontStyles.semiBold]}>{t("Set price")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelButton} activeOpacity={0.85} onPress={onClose}>
            <Text style={[s.cancelButtonText, fontStyles.semiBold]}>{t("Cancel")}</Text>
          </TouchableOpacity>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-start",
    },
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.scrim,
    },
    sheet: {
      backgroundColor: "#1d1d1d",
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 58,
      paddingBottom: 22,
      overflow: "hidden",
    },
    title: {
      fontSize: 19,
      color: c.white,
    },
    message: {
      fontSize: 13,
      color: c.whiteSubtle,
      marginTop: 3,
    },
    minimumHint: {
      fontSize: 12,
      color: c.whiteSubtle,
      marginTop: 10,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.paper,
      borderRadius: 10,
      paddingHorizontal: 14,
      marginTop: 14,
      marginBottom: 14,
    },
    currency: {
      fontSize: 16,
      color: c.ink,
      opacity: 0.55,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 22,
      color: c.ink,
    },
    setButton: {
      backgroundColor: c.accent,
      borderRadius: 12,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    setButtonDisabled: {
      opacity: 0.5,
    },
    setButtonText: {
      fontSize: 15,
      color: c.white,
      letterSpacing: 0.3,
    },
    cancelButton: {
      backgroundColor: "#37383a",
      borderRadius: 12,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },
    cancelButtonText: {
      fontSize: 15,
      color: c.white,
      letterSpacing: 0.3,
    },
  });
