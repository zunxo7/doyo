import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeServicesInfoStyles = (c: Palette) =>
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
      flex: 1,
      fontSize: 20,
      color: c.white,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },
    noteCardTop: {
      borderRadius: 16,
      backgroundColor: "#343434",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    noteTitle: {
      color: c.white,
      fontSize: 14.5,
    },
    noteText: {
      color: c.whiteSubtle,
      fontSize: 11.5,
      lineHeight: 17,
      marginTop: 4,
    },
    sectionLabel: {
      color: c.white,
      fontSize: 13,
      marginTop: 18,
      marginBottom: 10,
    },
    rulesList: {
      gap: 10,
    },
    ruleCard: {
      minHeight: 74,
      borderRadius: 16,
      backgroundColor: "#343434",
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    ruleTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    ruleTitle: {
      color: c.white,
      fontSize: 14.5,
    },
    ruleSub: {
      color: c.whiteSubtle,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: 3,
    },
    scopeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    scopeCard: {
      width: "48.5%",
      minHeight: 132,
      borderRadius: 16,
      backgroundColor: "#343434",
      padding: 14,
      justifyContent: "space-between",
    },
    scopeCardWide: {
      width: "100%",
      minHeight: 96,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      justifyContent: "flex-start",
    },
    scopeTitle: {
      color: c.white,
      fontSize: 14.5,
      lineHeight: 19,
    },
    scopeSub: {
      color: c.whiteSubtle,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: 5,
    },
    scopeTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    rtlText: {
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
