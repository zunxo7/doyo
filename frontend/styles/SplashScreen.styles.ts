import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeSplashStyles = (c: Palette) =>
  StyleSheet.create({
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 25,
      paddingHorizontal: 20,
    },
    logoSection: {
      alignItems: "center",
      gap: 15,
    },
    appIcon: {
      width: 65,
      height: 65,
      borderRadius: 14,
    },
    footer: {
      width: "100%",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 50,
    },
    footerText: {
      fontSize: 12,
      color: c.white,
      textAlign: "center",
    },
  });
