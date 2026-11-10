import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeChatStyles = (c: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: "#1d1d1d",
    },
    // ---- Header ----
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingTop: 50,
      paddingHorizontal: 20,
      paddingBottom: 10,
      backgroundColor: "#1d1d1d",
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    headerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#3d3d3f",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    headerAvatarImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    headerTextBlock: {
      flex: 1,
    },
    headerName: {
      fontSize: 21,
      lineHeight: 25,
      color: c.white,
    },
    headerRole: {
      fontSize: 14.5,
      lineHeight: 18.5,
      color: "#9f9fa3",
    },

    // ---- Messages ----
    messagesContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      gap: 8,
      flexGrow: 1,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 96,
    },
    emptyText: {
      color: "#9f9fa3",
      fontSize: 18,
    },
    bubble: {
      maxWidth: "78%",
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleWorker: {
      alignSelf: "flex-start",
      backgroundColor: "#3a3b3d",
      borderBottomLeftRadius: 5,
    },
    bubbleMine: {
      alignSelf: "flex-end",
      backgroundColor: c.accent,
      borderBottomRightRadius: 5,
    },
    bubbleRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    bubbleText: {
      fontSize: 14.5,
      lineHeight: 20,
      flexShrink: 1,
    },
    bubbleTextWorker: {
      color: c.white,
    },
    bubbleTextMine: {
      color: c.white,
    },
    bubbleTime: {
      fontSize: 10,
    },
    bubbleTimeWorker: {
      color: c.whiteSubtle,
    },
    bubbleTimeMine: {
      color: "rgba(255,255,255,0.7)",
    },

    // ---- Quick replies ----
    quickRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: 8,
      paddingHorizontal: 22,
      paddingBottom: 14,
    },
    quickChip: {
      borderWidth: 2,
      borderColor: c.accent,
      backgroundColor: "transparent",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    quickChipText: {
      fontSize: 14,
      color: c.white,
    },

    // ---- Input ----
    inputBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 16,
      backgroundColor: "#242426",
    },
    input: {
      flex: 1,
      minHeight: 50,
      backgroundColor: "#3a3b3d",
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 17,
      color: c.white,
    },
    sendButton: {
      width: 50,
      height: 50,
      borderRadius: 13,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      backgroundColor: c.accent,
      opacity: 0.65,
    },
  });
