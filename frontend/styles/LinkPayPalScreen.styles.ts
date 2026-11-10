import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeLinkPayPalStyles = (c: Palette) =>
  StyleSheet.create({
    content: {
      flex: 1,
      justifyContent: "space-between",
      paddingHorizontal: 22,
      paddingTop: 96,
      paddingBottom: 45,
    },
    top: {
      alignItems: "flex-start",
      gap: 10,
    },
    logo: {
      width: 68,
      height: 68,
      borderRadius: 18,
      backgroundColor: "#ffffff",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    actions: {
      alignItems: "stretch",
      gap: 6,
    },
    skip: {
      alignItems: "center",
      paddingVertical: 12,
    },
    skipText: {
      color: c.whiteSubtle,
      fontSize: 15,
    },
  });
