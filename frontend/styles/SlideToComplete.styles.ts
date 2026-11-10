import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeSlideToCompleteStyles = (c: Palette) =>
  StyleSheet.create({
    track: {
      height: 54,
      borderRadius: 14,
      backgroundColor: c.accentFill,
      borderWidth: 1,
      borderColor: c.accentLine,
      marginTop: 16,
      justifyContent: "center",
      overflow: "hidden",
    },
    fill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: c.accentFaint,
      borderRadius: 14,
    },
    label: {
      textAlign: "center",
      fontSize: 15,
      color: c.white,
      letterSpacing: 0.3,
    },
    thumb: {
      position: "absolute",
      left: 4,
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
  });
