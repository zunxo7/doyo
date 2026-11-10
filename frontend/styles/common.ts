import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeCommon = (c: Palette) =>
  StyleSheet.create({
    title: {
      fontSize: 32,
      color: c.white,
    },
    titleAccent: {
      color: c.accent,
    },
    subtitle: {
      fontSize: 12,
      color: c.white,
      lineHeight: 18,
    },
    button: {
      backgroundColor: c.accent,
      height: 52,
      width: "100%",
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    buttonText: {
      color: c.white,
      fontSize: 16,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    backHeader: {
      paddingTop: 50,
      paddingLeft: 18,
      paddingBottom: 4,
    },
    screenPadding: {
      paddingHorizontal: 20,
    },
    // Empty space reserved below the bottom button — matches the role/language
    // screens' footer so the CTA never sits flush against the screen edge.
    footerSpace: {
      height: 88,
    },
    // Terms & Privacy footer shown beneath the bottom button on onboarding
    // screens. Mirrors the OnboardingScreen footer treatment.
    footer: {
      paddingHorizontal: 20,
      // Match the welcome (Onboarding) screen's gap above the footer:
      // its button container's paddingBottom (12) + footer paddingTop (10).
      paddingTop: 22,
      paddingBottom: 45,
    },
    footerText: {
      fontSize: 12,
      color: c.white,
      textAlign: "center" as const,
      lineHeight: 18,
    },
    footerLink: {
      textDecorationLine: "underline" as const,
    },
  });
