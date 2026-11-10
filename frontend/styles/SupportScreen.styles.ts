import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeSupportStyles = (c: Palette) =>
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
      paddingTop: 12,
      paddingBottom: 40,
    },
    intro: {
      fontSize: 13.5,
      color: c.whiteSubtle,
      lineHeight: 19,
      marginBottom: 6,
    },

    label: {
      fontSize: 13,
      color: c.white,
      marginBottom: 10,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 22,
    },
    chip: {
      backgroundColor: "#343434",
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    chipActive: {
      backgroundColor: c.accent,
    },
    chipText: {
      fontSize: 13,
      color: c.whiteSubtle,
    },
    chipTextActive: {
      color: c.white,
    },

    textArea: {
      backgroundColor: c.paper,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 15,
      color: c.ink,
      minHeight: 118,
      textAlignVertical: "top",
      marginTop: 14,
      marginBottom: 14,
    },
    attachmentButton: {
      height: 48,
      borderRadius: 12,
      backgroundColor: "#343434",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      marginBottom: 14,
    },
    attachmentButtonText: {
      color: c.white,
      fontSize: 14,
    },
    attachmentPreview: {
      minHeight: 58,
      borderRadius: 12,
      backgroundColor: "#343434",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 8,
      marginBottom: 14,
    },
    attachmentImage: {
      width: 42,
      height: 42,
      borderRadius: 9,
      backgroundColor: "#1d1d1d",
    },
    attachmentTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    attachmentTitle: {
      color: c.white,
      fontSize: 13.5,
    },
    attachmentSub: {
      color: c.whiteSubtle,
      fontSize: 10.5,
      marginTop: 2,
    },
    attachmentRemove: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },

    reportButton: {
      marginTop: 14,
      minHeight: 68,
      borderRadius: 16,
      backgroundColor: "#343434",
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    reportTextBlock: {
      flex: 1,
    },
    reportTitle: {
      color: c.white,
      fontSize: 14.5,
    },
    reportSub: {
      color: c.whiteSubtle,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: 3,
    },

    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: c.accent,
      borderRadius: 12,
      height: 50,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitText: {
      fontSize: 16,
      color: c.white,
      letterSpacing: 0.3,
    },

    noteCard: {
      marginTop: 14,
      borderRadius: 16,
      backgroundColor: "#343434",
      paddingHorizontal: 16,
      paddingVertical: 14,
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
    helpLabel: {
      marginTop: 18,
    },
    infoLabel: {
      marginTop: 22,
    },
    helpGrid: {
      gap: 10,
    },
    helpPair: {
      flexDirection: "row",
      gap: 10,
    },
    helpCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderRadius: 16,
      backgroundColor: "#343434",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    helpCardWide: {
      minHeight: 74,
    },
    helpCardHalf: {
      flex: 1,
      minHeight: 112,
      alignItems: "flex-start",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: 12,
    },
    helpIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    helpTextBlock: {
      flex: 1,
    },
    helpTitle: {
      color: c.white,
      fontSize: 14.5,
    },
    helpSub: {
      color: c.whiteSubtle,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: 3,
    },
    reportOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      elevation: 50,
    },
    reportBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.52)",
    },
    reportSheet: {
      backgroundColor: "#1d1d1d",
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 58,
      paddingBottom: 22,
      overflow: "hidden",
    },
    reportSheetTitle: {
      color: c.white,
      fontSize: 19,
      marginBottom: 14,
    },
    cancelButton: {
      backgroundColor: "#37383a",
      borderRadius: 12,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },
    cancelButtonText: {
      fontSize: 15,
      color: c.white,
      letterSpacing: 0.3,
    },
  });
