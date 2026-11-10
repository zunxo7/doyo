import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeCnicStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    contentWrapper: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingBottom: 45,
      gap: 16,
    },
    titleBlock: {
      paddingTop: 12,
      paddingBottom: 4,
      gap: 6,
    },
    step: {
      fontSize: 11,
      color: c.accent,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    uploadCard: {
      borderRadius: 18,
      backgroundColor: "#343434",
      padding: 14,
      gap: 12,
    },
    uploadHeader: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    uploadTitle: {
      color: c.white,
      fontSize: 14,
    },
    selectedText: {
      color: c.accent,
      fontSize: 11,
      textTransform: "uppercase",
    },
    uploadArea: {
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: "#4c4d4f",
      backgroundColor: "#272727",
      height: 110,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    proofArea: {
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: "#4c4d4f",
      backgroundColor: "#272727",
      height: 210,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    uploadAreaActive: {
      borderColor: c.accent,
      backgroundColor: c.accentFaint,
    },
    emptyUpload: {
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    uploadHint: {
      fontSize: 13,
      color: c.whiteSubtle,
      textAlign: "center",
    },
    uploadHintActive: {
      color: c.accent,
    },
    previewImage: {
      width: "100%",
      height: "100%",
      borderRadius: 12,
    },
    uploadActions: {
      flexDirection: "row",
      gap: 10,
    },
    actionButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
    },
    singleActionButton: {
      flex: 0,
      width: "100%",
    },
    galleryButton: {
      backgroundColor: c.accent,
    },
    actionText: {
      color: c.ink,
      fontSize: 12,
      textAlign: "center",
    },
    galleryText: {
      color: c.white,
    },
    ctaContainer: {
      marginTop: "auto",
      paddingTop: 10,
    },
    // Fullscreen media preview — always dark backdrop regardless of theme
    previewOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.88)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      paddingVertical: 48,
    },
    previewClose: {
      position: "absolute",
      top: 48,
      right: 22,
      zIndex: 2,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    previewContent: {
      width: "100%",
      height: "82%",
      alignItems: "center",
      justifyContent: "center",
    },
    fullPreviewImage: {
      width: "100%",
      height: "100%",
    },
    previewVideo: {
      width: "100%",
      height: "100%",
    },
  });
