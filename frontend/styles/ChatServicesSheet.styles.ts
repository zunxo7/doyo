import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeChatServicesSheetStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 50,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    backdropTap: {
      flex: 1,
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: "#1d1d1d",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#4a4b4d",
      marginBottom: 6,
    },
    title: {
      color: c.white,
      fontSize: 18,
      marginBottom: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 16,
      backgroundColor: "#343434",
      padding: 12,
    },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#4a4b4d",
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      color: c.white,
      fontSize: 15,
    },
    rowSub: {
      color: c.whiteSubtle,
      fontSize: 12,
      marginTop: 2,
    },
    rowPrice: {
      color: c.accent,
      fontSize: 12,
    },
    details: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
    },
    detailsText: {
      color: c.accent,
      fontSize: 14,
    },
  });
