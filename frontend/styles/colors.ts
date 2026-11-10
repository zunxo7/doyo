// Single theme for now. The factory architecture (Palette + make…Styles +
// useThemedStyles) stays in place so additional themes can be added later.
export type ThemeName = "dark";

/**
 * Single source of truth for colour. Style files build from a `Palette` via
 * the `make…Styles(c)` factory pattern + `useThemedStyles`. Raw hex and rgba()
 * literals still exist in the older style files and should move here.
 *
 * Roles (token names kept from the original dark design):
 *   navy            → primary screen background
 *   white           → primary foreground (text / icons on the background)
 *   whiteSubtle     → secondary foreground
 *   accent          → brand colour
 *   navyTransparent → transparent background (for gradients)
 *   surface         → raised container fill on the background
 *   surfaceSoft     → fainter container fill
 *   border          → hairline borders
 *   divider         → faint dividers
 *   handle          → drag-handle pill
 *   fgFaint         → disabled / faint foreground
 *   fgBorder        → empty checkbox / outline on the background
 *   accentSoft      → accent at ~50% (inactive chips)
 *   accentFaint     → accent tint fill (selected glow)
 *   accentLine      → accent-tinted border
 *   accentFill      → accent-tinted fill (active rows)
 *   ink             → fixed dark ink (never themed) — text on accent / light chips
 *   paper           → fixed white (never themed) — avatars, input fields
 */
export interface Palette {
  navy: string;
  white: string;
  whiteSubtle: string;
  accent: string;
  navyTransparent: string;
  surface: string;
  surfaceSoft: string;
  /** Solid (opaque) versions of the surfaces — used where translucency looks muddy */
  surfaceSolid: string;
  surfaceSolidSoft: string;
  accentFillSolid: string;
  border: string;
  divider: string;
  handle: string;
  fgFaint: string;
  fgBorder: string;
  accentSoft: string;
  accentFaint: string;
  accentLine: string;
  accentFill: string;
  mapVeil: string;
  danger: string;
  scrim: string;
  band: string;
  timerFill: string;
  /** Border for cards and containers. */
  cardBorder: string;
  ink: string;
  paper: string;
  /** Opacity for the decorative cleaning-icons pattern (numeric, not a colour) */
  patternOpacity: number;
}

export const darkPalette: Palette = {
  navy: "#0b0b0c",
  white: "#ffffff",
  whiteSubtle: "rgba(255,255,255,0.7)",
  accent: "#00baf0",
  navyTransparent: "rgba(11,11,12,0)",
  surface: "rgba(255,255,255,0.08)",
  surfaceSoft: "rgba(255,255,255,0.06)",
  surfaceSolid: "#143a5c",
  surfaceSolidSoft: "#0f3556",
  accentFillSolid: "#0f4d68",
  border: "rgba(255,255,255,0.14)",
  divider: "rgba(255,255,255,0.1)",
  handle: "rgba(255,255,255,0.57)",
  fgFaint: "rgba(255,255,255,0.5)",
  fgBorder: "rgba(255,255,255,0.65)",
  accentSoft: "rgba(0,186,240,0.5)",
  accentFaint: "rgba(0,186,240,0.18)",
  accentLine: "rgba(0,186,240,0.35)",
  accentFill: "rgba(0,186,240,0.16)",
  mapVeil: "transparent",
  danger: "#a3262d",
  scrim: "rgba(0,0,0,0.48)",
  band: "#2c4e6c",
  timerFill: "rgba(10,47,80,0.32)",
  cardBorder: "#00baf0",
  ink: "#0a2f50",
  paper: "#ffffff",
  patternOpacity: 0.08,
};

export const palettes: Record<ThemeName, Palette> = {
  dark: darkPalette,
};

/**
 * Back-compat default export. Any file not yet migrated to the themed factory
 * pattern still `import { colors }` and renders with the dark palette, so the
 * app keeps working while screens are converted.
 */
export const colors = darkPalette;
