import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeLegalOverlayStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
    },
    header: {
      paddingLeft: 24,
      paddingRight: 18,
      paddingBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      flex: 1,
      color: c.white,
      fontSize: 24,
    },
    headerSpacer: {
      width: 28,
    },
    backBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#272727",
      overflow: "hidden",
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 48,
    },
    section: {
      marginBottom: 18,
    },
    sectionTitle: {
      color: c.accent,
      fontSize: 16,
      lineHeight: 22,
      marginBottom: 8,
    },
    paragraph: {
      color: c.white,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 8,
    },
    body: {
      color: c.white,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 8,
    },
    bullet: {
      color: c.white,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 5,
      paddingLeft: 4,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 5,
    },
    bulletRowRtl: {
      flexDirection: "row-reverse",
    },
    bulletDot: {
      color: c.accent,
      fontSize: 16,
      lineHeight: 22,
    },
    bulletText: {
      flex: 1,
      color: c.white,
      fontSize: 14,
      lineHeight: 22,
    },
    quote: {
      color: c.white,
      fontSize: 14,
      lineHeight: 22,
      backgroundColor: c.accentFaint,
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 8,
    },
    finalLine: {
      color: c.accent,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      marginTop: 8,
    },
    updatedFooter: {
      backgroundColor: "#343434",
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(255,255,255,0.12)",
    },
    updatedFooterText: {
      color: c.white,
      fontSize: 12.5,
      lineHeight: 18,
      textAlign: "center",
    },
    indexList: {
      gap: 12,
    },
    indexCard: {
      minHeight: 82,
      borderRadius: 14,
      backgroundColor: "#343434",
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    indexCardRtl: {
      flexDirection: "row-reverse",
    },
    indexCopy: {
      flex: 1,
    },
    indexTitle: {
      color: c.white,
      fontSize: 15,
      lineHeight: 20,
      marginBottom: 4,
    },
    indexSummary: {
      color: c.whiteSubtle,
      fontSize: 12.5,
      lineHeight: 17,
    },
    indexSub: {
      color: c.whiteSubtle,
      fontSize: 12.5,
      lineHeight: 17,
    },
    doc: {
      gap: 2,
    },
    summary: {
      color: c.whiteSubtle,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 14,
    },
    rtlText: {
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
