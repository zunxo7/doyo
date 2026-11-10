/**
 * The app's font family names.
 *
 * A frozen module-level constant, NOT a fresh object per call. This used to
 * return an object literal, which meant a new identity on every render at all
 * 53 call sites — and since it is also passed down as a `fonts` prop, it
 * silently defeated memoisation in every child that received it.
 *
 * For styling, prefer `fontStyles` from ../styles/fonts: those are registered
 * StyleSheet entries, so they cost no allocation at all.
 */
const FONTS = Object.freeze({
  regular: "Montserrat_400Regular",
  medium: "Montserrat_500Medium",
  semiBold: "Montserrat_600SemiBold",
  bold: "Montserrat_700Bold",
  extraBold: "Montserrat_800ExtraBold",
  black: "Montserrat_900Black",
} as const);

export function useFontFamilies() {
  return FONTS;
}
