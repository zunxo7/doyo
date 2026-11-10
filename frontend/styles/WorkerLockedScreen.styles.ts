import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeWorkerLockedStyles = (c: Palette) =>
  StyleSheet.create({
    scroller: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: 86,
      paddingBottom: 34,
      gap: 22,
    },
    panel: {
      alignItems: "center",
    },
    iconWrap: {
      width: 118,
      height: 118,
      borderRadius: 34,
      backgroundColor: "#343434",
      alignItems: "center",
      justifyContent: "center",
    },
    textBlock: {
      alignItems: "center",
    },
    title: {
      color: c.white,
      fontSize: 34,
      textAlign: "center",
      lineHeight: 42,
    },
    titleAccent: {
      color: c.accent,
    },
    statusWrap: {
      alignItems: "center",
    },
    statusPill: {
      minHeight: 44,
      borderRadius: 999,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    statusText: {
      color: c.white,
      fontSize: 13,
      textTransform: "uppercase",
    },
    instructionsCard: {
      marginTop: 4,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 16,
      backgroundColor: "#343434",
      gap: 12,
    },
    instructionsTitle: {
      color: c.accent,
      fontSize: 15,
      textAlign: "center",
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    stepNumberText: {
      color: c.white,
      fontSize: 13,
    },
    stepText: {
      flex: 1,
      color: c.white,
      fontSize: 13,
      lineHeight: 20,
    },
    approvedSub: {
      color: c.whiteSubtle,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      paddingHorizontal: 8,
    },
    bottomBar: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 45,
      alignItems: "center",
    },
    continueButton: {
      backgroundColor: c.accent,
      borderRadius: 14,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    continueButtonText: {
      color: c.white,
      fontSize: 16,
      letterSpacing: 0.3,
    },
  });
