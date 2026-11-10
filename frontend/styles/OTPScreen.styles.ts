import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeOtpStyles = (c: Palette) =>
  StyleSheet.create({
    contentWrapper: {
      flex: 1,
      paddingTop: 0,
      paddingHorizontal: 22,
      justifyContent: "space-between",
    },
    topSection: {
      gap: 10,
      paddingTop: 5,
      paddingBottom: 18,
    },
    subtitleEmail: {
      color: c.accent,
    },
    otpWrap: {
      marginTop: 16,
      position: "relative",
    },
    otpRow: {
      flexDirection: "row",
      gap: 12,
    },
    otpBox: {
      flex: 1,
      backgroundColor: "#272727",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      borderRadius: 12,
      height: 72,
      alignItems: "center",
      justifyContent: "center",
    },
    otpDigit: {
      fontSize: 36,
      color: c.white,
      includeFontPadding: false,
    },
    otpBoxFilled: {
      borderWidth: 2,
      borderColor: c.accent,
    },
    otpBoxActive: {
      borderWidth: 2,
      borderColor: c.accent,
    },
    // Single invisible input overlaying the boxes; captures typing + full-code
    // paste so no individual box ever flashes the whole code.
    hiddenInput: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0,
      color: "transparent",
    },
    ctaContainer: {
      alignItems: "stretch",
      gap: 12,
    },
    // White resend button styled like the "Continue with Email" button.
    resendWhite: {
      backgroundColor: "#37383a",
      flexDirection: "row",
      gap: 10,
    },
    resendWhiteText: {
      color: c.white,
      lineHeight: 20,
    },
  });
