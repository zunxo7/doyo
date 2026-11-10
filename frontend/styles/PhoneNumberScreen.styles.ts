import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makePhoneNumberStyles = (c: Palette) =>
  StyleSheet.create({
    contentWrapper: {
      flex: 1,
      paddingTop: 0,
      paddingHorizontal: 22,
      justifyContent: "space-between",
    },
    topSection: {
      gap: 10,
      paddingTop: 5,
      paddingBottom: 6,
    },
    inputWrapper: {
      marginTop: 14,
      paddingVertical: 12,
    },
    input: {
      backgroundColor: c.paper,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      color: c.ink,
    },
    ctaContainer: {
      alignItems: "stretch",
    },
  });
