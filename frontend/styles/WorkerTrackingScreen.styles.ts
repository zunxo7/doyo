import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeTrackingStyles = (c: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: "#0b0b0c",
    },
    map: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "#0b0b0c",
    },
    mapHidden: {
      opacity: 0,
    },
    // Subtle veil to lift the map style a touch
    mapLighten: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.mapVeil,
    },

    // ---- Live tracking subtitle (under the sheet title) ----
    liveRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 6,
    },
    liveDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: c.accent,
    },
    liveSubText: {
      flex: 1,
      fontSize: 13,
      color: c.whiteSubtle,
      letterSpacing: 0.26,
    },

    // ---- Map markers ----
    homeMarker: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.ink,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: c.paper,
    },
    workerMarker: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: c.paper,
    },

    // ---- Bottom sheet ----
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#1d1d1d",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 28,
      overflow: "hidden",
      zIndex: 3,
    },
    sheetPattern: {
      ...StyleSheet.absoluteFill,
      opacity: c.patternOpacity,
    },
    // Same as the home screen's drag handle
    handleArea: {
      alignItems: "center",
      paddingTop: 10,
      paddingBottom: 10,
    },
    // Top padding for the locked (no-handle) completed/rating content
    lockedTopPad: {
      paddingTop: 24,
    },
    handle: {
      width: 38,
      height: 4,
      borderRadius: 25,
      backgroundColor: "#4f5052",
    },
    title: {
      fontSize: 21,
      color: c.white,
      marginTop: 4,
    },
    trackingTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    trackingTitleInline: {
      flex: 1,
    },
    divider: {
      height: 1,
      backgroundColor: c.divider,
      marginTop: 16,
      marginBottom: 14,
    },

    // ---- Action buttons row ----
    actionsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "flex-start",
      paddingTop: 10,
      paddingBottom: 2,
    },
    actionItem: {
      alignItems: "center",
      gap: 7,
      width: 82,
    },
    actionCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    ratingBadge: {
      position: "absolute",
      top: -6,
      right: -10,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: c.paper,
      borderRadius: 9,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    ratingBadgeText: {
      fontSize: 11,
      color: c.ink,
    },
    actionLabel: {
      fontSize: 12.5,
      color: c.white,
      textAlign: "center",
    },

    // ---- Job summary (below the fold, revealed by dragging up) ----
    summaryTitle: {
      fontSize: 16,
      color: c.white,
      marginBottom: 10,
    },
    summaryTitleInside: {
      fontSize: 16,
      color: c.white,
    },
    summaryTitlePill: {
      borderRadius: 16,
      backgroundColor: "#343434",
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
    },
    startCodeBox: {
      alignItems: "center",
      backgroundColor: c.accentFill,
      borderWidth: 1,
      borderColor: c.accentLine,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 14,
    },
    startCodeLabel: {
      fontSize: 12,
      color: c.whiteSubtle,
    },
    startCodeValue: {
      fontSize: 34,
      lineHeight: 40,
      color: c.white,
      marginTop: 2,
    },
    startCodeHint: {
      fontSize: 12,
      color: c.whiteSubtle,
      marginTop: 4,
      textAlign: "center",
    },
    summaryCard: {
      borderRadius: 16,
      backgroundColor: "#343434",
      paddingVertical: 4,
      overflow: "hidden",
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    summaryLabel: {
      fontSize: 13.5,
      color: c.whiteSubtle,
    },
    summaryValue: {
      fontSize: 13.5,
      color: c.white,
      maxWidth: "60%",
    },
    cancelJobButton: {
      backgroundColor: c.danger,
      borderRadius: 12,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
    },
    cancelJobText: {
      fontSize: 15,
      color: "#ffffff",
      letterSpacing: 0.3,
    },

    // ---- Work-in-progress (after the worker arrives) ----
    completeJobButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.accent,
      borderRadius: 12,
      height: 50,
      marginTop: 16,
    },
    completeJobText: {
      fontSize: 15,
      color: c.white,
      letterSpacing: 0.3,
    },

    // ---- Cancel flow sheet ----
    cancelOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: "flex-end",
      zIndex: 30,
    },
    cancelScrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.scrim,
    },
    cancelSheet: {
      width: "100%",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: "#1d1d1d",
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 30,
      overflow: "hidden",
    },
    cancelAvatarWrap: {
      alignSelf: "center",
      marginBottom: 12,
    },
    cancelTitle: {
      fontSize: 19,
      color: c.white,
      textAlign: "center",
    },
    cancelSubtitle: {
      fontSize: 14,
      color: c.whiteSubtle,
      textAlign: "center",
      marginTop: 4,
    },
    cancelActionsRow: {
      flexDirection: "row",
      justifyContent: "space-evenly",
      marginTop: 22,
      marginBottom: 24,
    },
    cancelCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    waitButton: {
      backgroundColor: c.accent,
      borderRadius: 12,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    waitButtonText: {
      fontSize: 16,
      color: c.white,
      letterSpacing: 0.3,
    },
    reasonList: {
      marginTop: 16,
      marginBottom: 20,
    },
    reasonRow: {
      paddingVertical: 15,
    },
    reasonDivider: {
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    reasonText: {
      fontSize: 14.5,
      color: c.white,
    },

    // ---- Job completed / rating (swapped inside the tracking sheet) ----
    completedBadge: {
      alignSelf: "center",
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
      marginBottom: 16,
    },
    completedTitle: {
      fontSize: 23,
      color: c.white,
      textAlign: "center",
    },
    completedSubtitle: {
      fontSize: 14,
      color: c.whiteSubtle,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 20,
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    completedButton: {
      backgroundColor: c.accent,
      borderRadius: 12,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 18,
    },
    completedButtonText: {
      fontSize: 16,
      color: c.white,
      letterSpacing: 0.3,
    },
    summaryValueHighlight: {
      color: c.accent,
      fontSize: 15,
    },

    // ---- Rating sheet ----
    rateAvatarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginTop: 6,
      marginBottom: 4,
    },
    rateAvatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    rateWord: {
      fontSize: 22,
      color: c.white,
    },
    rateName: {
      fontSize: 13.5,
      color: c.whiteSubtle,
      marginTop: 2,
    },
    starsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      marginTop: 18,
      marginBottom: 4,
    },
    complimentTagsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 9,
      marginTop: 18,
    },
    complimentTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 22,
      backgroundColor: "#272727",
    },
    complimentTagActive: {
      backgroundColor: c.accent,
    },
    complimentTagText: {
      fontSize: 13,
      color: c.whiteSubtle,
    },
    complimentTagTextActive: {
      color: c.white,
    },
    commentInput: {
      height: 50,
      borderRadius: 12,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: "#4c4d4f",
      paddingHorizontal: 16,
      fontSize: 14.5,
      color: c.ink,
      marginTop: 18,
    },
  });
