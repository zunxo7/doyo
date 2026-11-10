import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeCustomerNameStyles = (c: Palette) =>
  StyleSheet.create({
    contentWrapper: {
      flex: 1,
      justifyContent: "space-between",
      paddingHorizontal: 22,
      paddingTop: 0,
      paddingBottom: 45,
    },
    topSection: {
      gap: 10,
      paddingTop: 5,
      paddingBottom: 18,
    },
    textBlock: {
      alignItems: "flex-start",
      gap: 8,
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
