import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeProfileStyles = (c: Palette) =>
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

    // ---- Avatar + header (matches the worker Account screen) ----
    avatarSection: {
      alignItems: "center",
      paddingTop: 10,
      paddingBottom: 0,
    },
    headerName: {
      fontSize: 20,
      color: c.white,
      marginTop: 12,
    },
    // Inline rating badge under the name (star + value)
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
      backgroundColor: "#343434",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    ratingValue: {
      fontSize: 12.5,
      color: c.white,
    },
    ratingDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: c.border,
      marginVertical: 1,
    },

    // ---- Section headers (identical to the worker Account screen) ----
    sectionLabel: {
      fontSize: 13.5,
      color: c.white,
      letterSpacing: 0.3,
      marginBottom: 10,
      marginTop: 22,
    },
    sectionGap: {
      height: 0,
    },

    // ---- Separate info cards ----
    card: {
      gap: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderRadius: 16,
      backgroundColor: "#343434",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowDivider: {},
    rowIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    rowTextBlock: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 11.5,
      color: c.whiteSubtle,
    },
    rowValue: {
      fontSize: 14.5,
      color: c.white,
      marginTop: 2,
    },
    pointsCard: {
      borderRadius: 18,
      backgroundColor: "#343434",
      padding: 14,
      overflow: "hidden",
    },
    pointsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    pointsLabel: {
      color: c.whiteSubtle,
      fontSize: 12,
    },
    pointsValue: {
      color: c.white,
      fontSize: 38,
      lineHeight: 43,
    },
    pointsIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    rulesGrid: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },
    rulesColumn: {
      flex: 1,
      borderRadius: 14,
      backgroundColor: "#343434",
      paddingHorizontal: 11,
      paddingVertical: 10,
    },
    rulesColumnFull: {
      paddingHorizontal: 13,
    },
    rulesTitle: {
      color: c.white,
      fontSize: 12.5,
      marginBottom: 6,
    },
    ruleText: {
      color: c.whiteSubtle,
      fontSize: 10.8,
      lineHeight: 16,
    },
    inviteButton: {
      height: 48,
      borderRadius: 16,
      backgroundColor: c.accent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 10,
    },
    inviteText: {
      color: c.white,
      fontSize: 15,
    },
    redeemOpenButton: {
      height: 48,
      borderRadius: 16,
      backgroundColor: "#343434",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    rewardRows: {
      flexDirection: "row",
      gap: 10,
    },
    rewardButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      backgroundColor: "#343434",
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 10,
    },
    rewardWide: {
      marginTop: 10,
    },
    rewardText: {
      flex: 1,
      color: c.white,
      fontSize: 12.5,
    },
    rewardCost: {
      color: c.whiteSubtle,
      fontSize: 12,
    },
    rewardOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: "flex-end",
      zIndex: 50,
      elevation: 50,
    },
    rewardBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.58)",
    },
    rewardSheet: {
      backgroundColor: "#1d1d1d",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 28,
      gap: 10,
    },
    rewardSheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    rewardSheetTitle: {
      color: c.white,
      fontSize: 20,
    },
    rewardSheetSub: {
      color: c.whiteSubtle,
      fontSize: 12.5,
      marginTop: 3,
    },
    rewardClose: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
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
    },
    rewardOptionLocked: {
      opacity: 0.62,
    },
    rewardOptionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
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
    rewardOptionCost: {
      color: c.accent,
      fontSize: 16,
      minWidth: 34,
      textAlign: "right",
    },
    // Inline editable name field — sits where the value would
    nameInput: {
      backgroundColor: c.paper,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: c.ink,
      marginTop: 6,
    },
    // Tappable save affordance that only appears while the name is dirty
    saveChip: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },

    // ---- Language rows (settingRow — identical to worker) ----
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    optionIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    optionLabel: {
      flex: 1,
      fontSize: 15,
      color: c.white,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.fgBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    radioActive: {
      borderColor: c.accent,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.accent,
    },
  });
