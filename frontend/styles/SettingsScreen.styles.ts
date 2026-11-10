import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeSettingsStyles = (c: Palette) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingTop: 50,
      paddingHorizontal: 18,
      paddingBottom: 8,
    },
    backButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#272727",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    headerTitle: {
      fontSize: 20,
      color: c.white,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 40,
    },

    sectionTitle: {
      fontSize: 16,
      color: c.white,
      marginBottom: 4,
    },
    sectionHint: {
      fontSize: 12,
      color: c.whiteSubtle,
      marginBottom: 12,
    },
    optionCard: {
      gap: 10,
      marginBottom: 26,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderRadius: 16,
      backgroundColor: "#343434",
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    optionDivider: {},
    optionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    paymentLogoTile: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: "#ffffff",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    paymentLogo: {
      width: 28,
      height: 28,
    },
    cashLogoText: {
      color: c.ink,
      fontSize: 9,
    },
    optionTextBlock: {
      flex: 1,
    },
    optionLabel: {
      flex: 1,
      fontSize: 15,
      color: c.white,
    },
    optionSub: {
      fontSize: 11.5,
      lineHeight: 16,
      color: c.whiteSubtle,
      marginTop: 3,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: "#4c4d4f",
      alignItems: "center",
      justifyContent: "center",
    },
    radioActive: {
      borderColor: c.accent,
    },
    radioDot: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: c.accent,
    },

    noteRow: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: "#37383a",
      borderWidth: 1,
      borderColor: "#4c4d4f",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginTop: -14,
      marginBottom: 26,
    },
    noteText: {
      flex: 1,
      fontSize: 11.5,
      color: c.whiteSubtle,
      lineHeight: 16,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: c.danger,
      borderRadius: 14,
      minHeight: 52,
      marginTop: 20,
    },
    logoutText: {
      color: c.white,
      fontSize: 16,
    },
    deleteAccountButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 48,
      marginTop: 10,
      marginBottom: 4,
    },
    deleteAccountText: {
      color: c.danger,
      fontSize: 14,
    },
    toggleTrack: {
      width: 48,
      height: 26,
      borderRadius: 18,
      padding: 2,
      justifyContent: "center",
    },
    toggleThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.white,
    },
  });
