import React, { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { fontStyles } from "../styles/fonts";

type Props = { visible: boolean; progress: number };

// Shown before the settings context exists, so the colours are the dark theme's own values.
const CARD = "#343434";
const TRACK = "#4a4b4d";
const ACCENT = "#00baf0";

/** The update download, in the same card as the app's alerts, with a bar that fills as it arrives. */
export default function UpdateOverlay({ visible, progress }: Props) {
  // Never sits empty: the bar starts with a sliver so it reads as working from the first frame.
  const fill = useSharedValue(0.06);
  useEffect(() => {
    fill.value = withTiming(Math.max(0.06, Math.min(1, progress)), { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [progress, fill]);
  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={[styles.title, fontStyles.bold]}>Updating Doyo</Text>
          <Text style={[styles.message, fontStyles.medium]}>Getting the latest version. Doyo restarts when it is ready.</Text>
          <View style={styles.track}>
            <Reanimated.View style={[styles.bar, barStyle]} />
          </View>
          <Text style={[styles.percent, fontStyles.semiBold]}>{Math.round(Math.min(1, progress) * 100)}%</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 24,
    width: "100%",
  },
  title: {
    fontSize: 18,
    color: "#ffffff",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 20,
    marginBottom: 20,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: TRACK,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  percent: {
    marginTop: 10,
    fontSize: 12.5,
    color: "rgba(255,255,255,0.62)",
    textAlign: "right",
  },
});
