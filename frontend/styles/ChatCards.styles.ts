import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

/** The surface every card in the chat shares, so the job, offers and the booking read as one set. */
export const CARD_SURFACE = "#2b2b2d";
export const CARD_LINE = "rgba(255,255,255,0.08)";
const TILE = "#222224";

export const makeChatCardStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      marginLeft: 40,
      borderRadius: 20,
      backgroundColor: CARD_SURFACE,
      borderWidth: 1,
      borderColor: CARD_LINE,
      padding: 16,
      overflow: "hidden",
    },
    cardBooked: {
      borderColor: c.accent,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: TILE,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    iconImage: {
      width: 34,
      height: 34,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: c.white,
      fontSize: 17,
    },
    sub: {
      color: c.whiteSubtle,
      fontSize: 13,
      marginTop: 2,
    },
    priceBlock: {
      alignItems: "flex-end",
    },
    price: {
      color: c.white,
      fontSize: 22,
      lineHeight: 26,
    },
    priceCaption: {
      color: c.whiteSubtle,
      fontSize: 11.5,
      marginTop: 1,
    },
    label: {
      color: c.accent,
      fontSize: 12.5,
      marginBottom: 10,
    },
    tiles: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    tile: {
      flex: 1,
      minWidth: 0,
      borderRadius: 12,
      backgroundColor: TILE,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    tileLabel: {
      color: c.whiteSubtle,
      fontSize: 11.5,
    },
    tileValue: {
      color: c.white,
      fontSize: 14.5,
      marginTop: 2,
    },
    tileValueLink: {
      color: c.accent,
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 3,
    },
    metaText: {
      color: c.whiteSubtle,
      fontSize: 13,
    },
    actions: {
      flexDirection: "row",
      gap: 9,
      marginTop: 14,
    },
    secondary: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      backgroundColor: "#3a3b3d",
      alignItems: "center",
      justifyContent: "center",
    },
    primary: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 15,
    },
  });
