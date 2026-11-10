import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeUpdateRequiredStyles = (c: Palette) =>
  StyleSheet.create({
    slide: {
      flex: 1,
      justifyContent: "center",
      marginTop: 0,
      paddingBottom: 8,
    },
    title: {
      lineHeight: 39,
    },
    message: {
      fontSize: 14,
      lineHeight: 21,
    },
    versionCard: {
      width: "100%",
      maxWidth: 320,
      borderRadius: 16,
      backgroundColor: "#343434",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
    },
    versionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    },
    versionLabel: {
      color: c.whiteSubtle,
      fontSize: 12,
    },
    versionValue: {
      color: c.white,
      fontSize: 13,
      textAlign: "right",
    },
  });
