import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeWorkerInfoStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingBottom: 45,
      gap: 12,
    },
    titleBlock: {
      paddingTop: 5,
      paddingBottom: 6,
      gap: 6,
    },
    step: {
      fontSize: 11,
      color: c.accent,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    input: {
      backgroundColor: c.paper,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      color: c.ink,
    },
    genderRow: {
      flexDirection: "row",
      gap: 10,
    },
    genderOption: {
      flex: 1,
      height: 52,
      borderRadius: 10,
      backgroundColor: "#272727",
      alignItems: "center",
      justifyContent: "center",
    },
    genderSelected: {
      backgroundColor: c.accent,
    },
    genderText: {
      fontSize: 15,
      color: c.whiteSubtle,
    },
    genderTextSelected: {
      color: c.white,
    },
    sectionLabel: {
      color: c.white,
      fontSize: 13,
      paddingTop: 4,
    },
    // Vertical checkmark-row list (matches the customer home vehicle rows)
    serviceList: {
      gap: 10,
    },
    // Two services to a row.
    serviceGridRow: {
      flexDirection: "row",
      gap: 10,
    },
    serviceTile: {
      flex: 1,
      minHeight: 96,
      borderRadius: 12,
      backgroundColor: "#272727",
      padding: 12,
      gap: 10,
      borderWidth: 1,
      borderColor: "#272727",
    },
    serviceTileTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    serviceIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    serviceIconActive: {
      backgroundColor: c.accent,
    },
    serviceRowActive: {
      backgroundColor: "#272727",
      borderWidth: 1,
      borderColor: c.accent,
    },
    serviceCheckedBox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    serviceEmptyBox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.fgBorder,
    },
    serviceName: {
      fontSize: 14,
      color: c.whiteSubtle,
      letterSpacing: 0.24,
    },
    serviceNameActive: {
      color: c.white,
    },
    ctaContainer: {
      // Pushed to the bottom of the scroll area (content uses flexGrow:1).
      marginTop: "auto",
      paddingTop: 8,
      alignItems: "stretch",
    },
  });
