import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

/** The CNIC is an ID-1 card: 85.6mm × 54mm. */
export const CARD_ASPECT = 85.6 / 54;

export const makeCnicCaptureStyles = (c: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.ink,
    },
    camera: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    // The guide sits above the preview and takes no touches, so the shutter
    // below it stays pressable.
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    frame: {
      width: "88%",
      aspectRatio: CARD_ASPECT,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.white,
      backgroundColor: "transparent",
    },
    hint: {
      color: c.white,
      fontSize: 15,
      textAlign: "center",
      marginTop: 18,
      paddingHorizontal: 32,
    },
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingTop: 14,
      gap: 12,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.scrim,
    },
    sideLabel: {
      color: c.white,
      fontSize: 16,
      flex: 1,
      textAlign: "center",
    },
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: "center",
      paddingBottom: 38,
      paddingTop: 18,
      gap: 10,
    },
    shutter: {
      width: 74,
      height: 74,
      borderRadius: 37,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.white,
      borderWidth: 4,
      borderColor: c.scrim,
    },
    shutterBusy: {
      opacity: 0.5,
    },
    // Permission and loading states share the preview's ground so there is no
    // flash of a themed background behind a black camera.
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 18,
    },
    centeredText: {
      color: c.white,
      fontSize: 16,
      textAlign: "center",
    },
    grantButton: {
      paddingHorizontal: 26,
      paddingVertical: 13,
      borderRadius: 26,
      backgroundColor: c.accent,
    },
    grantButtonText: {
      color: c.ink,
      fontSize: 16,
    },
  });
