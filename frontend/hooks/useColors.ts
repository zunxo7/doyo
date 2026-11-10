import { useMemo } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { palettes, type Palette } from "../styles/colors";

/** Active palette for the current theme preference. */
export function useColors(): Palette {
  const { settings } = useSettings();
  return palettes[settings.theme];
}

/**
 * Build a themed StyleSheet from a factory. The factory is called with the
 * active palette and memoised per theme, so converted screens re-style
 * instantly when the theme flips (the crossfade overlay masks the swap).
 */
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const palette = useColors();
  return useMemo(() => factory(palette), [factory, palette]);
}
