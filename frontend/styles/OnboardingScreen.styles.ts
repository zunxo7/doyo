import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeOnboardingStyles = (c: Palette) =>
  StyleSheet.create({
    logoContainer: {
      alignItems: "center",
      paddingTop: 50,
    },
    logo: {
      width: 120,
      height: 36,
    },
    launchBanner: {
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: 14,
      backgroundColor: "#343434",
      overflow: "hidden",
    },
    launchBannerTouch: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingHorizontal: 13,
      paddingVertical: 11,
    },
    launchIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    launchTitle: {
      color: c.white,
      fontSize: 13,
    },
    launchText: {
      color: c.whiteSubtle,
      fontSize: 11,
      marginTop: 2,
    },
    launchLearnText: {
      color: c.accent,
      fontSize: 10.5,
      marginTop: 4,
    },
    launchSheetOverlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 50,
      elevation: 50,
    },
    launchSheetBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    launchSheet: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: "#1d1d1d",
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 58,
      paddingBottom: 22,
    },
    launchSheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    launchSheetIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    launchSheetTitle: {
      color: c.white,
      fontSize: 19,
    },
    launchSheetTimer: {
      color: c.whiteSubtle,
      fontSize: 12,
      marginTop: 3,
    },
    launchOfferRows: {
      gap: 10,
    },
    launchOfferRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 14,
      backgroundColor: "#343434",
      paddingHorizontal: 13,
      paddingVertical: 12,
    },
    launchOfferIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: "#1d1d1d",
      alignItems: "center",
      justifyContent: "center",
    },
    launchOfferTitle: {
      color: c.white,
      fontSize: 13.5,
    },
    launchOfferBody: {
      color: c.whiteSubtle,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: 2,
    },
    launchOfferHighlight: {
      color: c.accent,
    },
    launchSheetFootnote: {
      color: c.whiteSubtle,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 14,
      textAlign: "center",
    },
    contentWrapper: {
      flex: 1,
      paddingTop: 40,
    },
    slide: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
      gap: 24,
    },
    illustration: {
      width: 320,
      height: 215,
      // Text cannot shrink, so the picture is what gives way when the screen
      // is short or dense. Without this the last line of the body ran past
      // the slide and was cut in half.
      flexShrink: 1,
    },
    textBlock: {
      alignItems: "center",
      gap: 10,
      width: "100%",
      paddingHorizontal: 18,
      paddingVertical: 4,
      // Never sacrificed to make room for the illustration.
      flexShrink: 0,
    },
    title: {
      fontSize: 32,
      color: c.white,
      textAlign: "center",
    },
    roleTextBlock: {
      gap: 2,
    },
    roleTitle: {
      fontSize: 28,
    },
    titleAccent: {
      color: c.accent,
    },
    body: {
      fontSize: 12,
      color: c.whiteSubtle,
      textAlign: "center",
      lineHeight: 18,
    },
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      paddingVertical: 20,
      paddingHorizontal: 10,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotActive: {
      backgroundColor: c.accent,
    },
    dotInactive: {
      backgroundColor: "#4f5052",
    },
    ctaContainer: {
      alignItems: "center",
      paddingBottom: 12,
      paddingHorizontal: 20,
      gap: 10,
    },
    authButton: {
      flexDirection: "row",
      gap: 10,
    },
    authButtonText: {
      lineHeight: 20,
    },
    emailButton: {
      backgroundColor: "#37383a",
    },
    emailButtonText: {
      color: c.white,
      lineHeight: 20,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 45,
    },
    footerText: {
      fontSize: 12,
      color: c.white,
      textAlign: "center",
      lineHeight: 18,
    },
    footerLink: {
      textDecorationLine: "underline",
    },
  });
