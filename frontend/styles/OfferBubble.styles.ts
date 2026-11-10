import { StyleSheet } from "react-native";
import type { Palette } from "./colors";
import { CARD_LINE as LINE, CARD_SURFACE as CARD } from "./ChatCards.styles";

export const makeOfferBubbleStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    avatar: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    photo: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    card: {
      flexShrink: 1,
      width: "86%",
      borderRadius: 20,
      borderBottomLeftRadius: 6,
      backgroundColor: CARD,
      borderWidth: 1,
      borderColor: LINE,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 13,
      overflow: "hidden",
    },
    cardLive: {
      borderColor: c.accent,
    },
    head: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    who: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      color: c.white,
      fontSize: 15.5,
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
    },
    metaText: {
      color: c.whiteSubtle,
      fontSize: 12.5,
    },
    price: {
      color: c.white,
      fontSize: 22,
      lineHeight: 26,
    },
    priceGone: {
      color: c.whiteSubtle,
      textDecorationLine: "line-through",
    },
    message: {
      color: c.white,
      fontSize: 15,
      lineHeight: 21,
      marginTop: 9,
    },
    messagePrice: {
      color: c.accent,
    },
    actions: {
      flexDirection: "row",
      gap: 9,
      marginTop: 12,
    },
    counter: {
      flex: 1,
      height: 44,
      borderRadius: 14,
      backgroundColor: "#3a3b3d",
      alignItems: "center",
      justifyContent: "center",
    },
    accept: {
      flex: 1,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    actionText: {
      color: "#ffffff",
      fontSize: 15,
    },
  });
