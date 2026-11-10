import { StyleSheet } from "react-native";

/**
 * Font families as registered StyleSheet entries.
 *
 * `style={[s.thing, { fontFamily: fonts.medium }]}` allocated a fresh object
 * for every styled Text on every render — 536 of them across the app — and a
 * new object identity defeats React Native's style diffing. These are
 * registered once, so `style={[s.thing, fontStyles.medium]}` allocates nothing.
 *
 * Keep in sync with `useFontFamilies` in ../hooks/useFontFamilies.
 */
export const fontStyles = StyleSheet.create({
  regular: { fontFamily: "Montserrat_400Regular" },
  medium: { fontFamily: "Montserrat_500Medium" },
  semiBold: { fontFamily: "Montserrat_600SemiBold" },
  bold: { fontFamily: "Montserrat_700Bold" },
  extraBold: { fontFamily: "Montserrat_800ExtraBold" },
  black: { fontFamily: "Montserrat_900Black" },
});
