import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeLoyaltyStyles = (c: Palette) =>
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
      paddingTop: 16,
      paddingBottom: 40,
    },
    pointsCard: {
      borderRadius: 18,
      backgroundColor: "#343434",
      padding: 16,
      overflow: "hidden",
    },
    pointsLabel: {
      color: c.whiteSubtle,
      fontSize: 13,
    },
    pointsValueRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
    },
    pointsValue: {
      color: c.white,
      fontSize: 42,
      lineHeight: 48,
    },
    shopButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 48,
      borderRadius: 14,
      backgroundColor: c.accent,
      marginTop: 14,
    },
    shopButtonText: {
      color: c.white,
      fontSize: 15,
    },
    pointsIcon: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    sectionLabel: {
      fontSize: 13.5,
      color: c.white,
      letterSpacing: 0.3,
      marginBottom: 10,
      marginTop: 22,
    },
    // A label that shares its line with a badge; the row carries the spacing.
    sectionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
      marginTop: 22,
    },
    sectionLabelInRow: {
      marginBottom: 0,
      marginTop: 0,
    },
    infoCard: {
      borderRadius: 18,
      backgroundColor: "#343434",
      padding: 14,
      gap: 10,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 38,
    },
    infoIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    infoText: {
      flex: 1,
      color: c.white,
      fontSize: 13.5,
      lineHeight: 18,
    },
    rewardOption: {
      minHeight: 68,
      borderRadius: 16,
      backgroundColor: "#343434",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 13,
      paddingVertical: 10,
      marginBottom: 12,
    },
    // A reward already redeemed and waiting to be booked with.
    rewardHeld: {
      borderWidth: 1.5,
      borderColor: c.accent,
    },
    rewardExpiring: {
      color: "#f27878",
    },
    rewardUse: {
      borderRadius: 10,
      backgroundColor: c.accent,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    rewardRemove: {
      backgroundColor: c.danger,
    },
    rewardUseText: {
      color: c.white,
      fontSize: 12.5,
    },
    rewardOptionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    rewardTextBlock: {
      flex: 1,
    },
    rewardOptionTitle: {
      color: c.white,
      fontSize: 14.5,
    },
    rewardOptionSub: {
      color: c.whiteSubtle,
      fontSize: 11.5,
      marginTop: 3,
    },
    shopOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    shopScrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.scrim,
    },
    shopSheet: {
      backgroundColor: "#1d1d1d",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 32,
    },
    shopHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    shopHeaderText: {
      flex: 1,
    },
    shopTitle: {
      color: c.white,
      fontSize: 19,
    },
    shopClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#37383a",
      alignItems: "center",
      justifyContent: "center",
    },
    shopItem: {
      minHeight: 68,
      borderRadius: 16,
      backgroundColor: "#343434",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 13,
      paddingVertical: 10,
      marginBottom: 10,
    },
    // Holds the section's place when nothing has been redeemed yet.
    rewardEmpty: {
      minHeight: 68,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: "#4c4d4f",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    shopItemLocked: {
      opacity: 0.45,
    },
    shopFootNudge: {
      color: c.accent,
    },
    shopFoot: {
      color: c.whiteSubtle,
      fontSize: 11.5,
      textAlign: "center",
      marginTop: 6,
    },
  });
