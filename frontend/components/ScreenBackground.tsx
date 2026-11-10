import React, { useId } from "react";
import { View, Image, StyleSheet, useWindowDimensions } from "react-native";
import { SvgXml } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import { useColors } from "../hooks/useColors";
import { useSettings } from "../contexts/SettingsContext";

const BACKGROUND_OVERSCAN = 96;

/** Soft radial glow orb (same look as the home bottom sheet). */
function GlowOrb({
  size,
  color,
  style,
  intensity = 0.12,
}: {
  size: number;
  color: string;
  style?: object;
  intensity?: number;
}) {
  const id = useId();
  return (
    <Svg width={size} height={size} pointerEvents="none" style={[style, { backgroundColor: "transparent" }]}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={intensity} />
          <Stop offset="60%" stopColor={color} stopOpacity={intensity * 0.45} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Radial vignette matching the Figma design exactly.
 * Formula derived from the Figma gradientTransform matrix:
 *   matrix(0, H/20, -W/20, 0, W/2, H/2)
 * This maps r=10 gradient-space ellipse to a screen-filling ellipse.
 */
const buildVignetteSvg = (w: number, h: number) => `
<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <defs>
    <radialGradient id="grad" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="10"
      gradientTransform="matrix(0 ${h / 20} ${-(w / 20)} 0 ${w / 2} ${h / 2})">
      <stop stop-color="rgba(57,56,56,0)" offset="0"/>
      <stop stop-color="rgba(29,28,28,0.5)" offset="0.5"/>
      <stop stop-color="rgba(14,14,14,0.75)" offset="0.75"/>
      <stop stop-color="rgba(7,7,7,0.875)" offset="0.875"/>
      <stop stop-color="rgba(0,0,0,1)" offset="1"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#grad)" opacity="0.15"/>
</svg>`;

interface Props {
  children: React.ReactNode;
  patternOpacity?: number;
  /** Glassmorphism variant: indigo gradient + colour orbs, like the home sheet */
  glass?: boolean;
  /** Black customer-home style background for onboarding/auth surfaces. */
  variant?: "navy" | "black" | "sheet";
  hideOrbs?: boolean;
  showPattern?: boolean;
  flat?: boolean;
}

export default function ScreenBackground({ children, patternOpacity, glass, variant = "black", hideOrbs, showPattern, flat }: Props) {
  const { width, height } = useWindowDimensions();
  const colors = useColors();
  const { settings } = useSettings();
  const isDark = settings.theme === "dark";
  const isBlack = variant === "black";
  const baseColor = variant === "sheet" ? "#1d1d1d" : (isBlack ? "#0b0b0c" : colors.navy);
  const backgroundHeight = height + BACKGROUND_OVERSCAN * 2;
  const vignetteSvg = buildVignetteSvg(width, backgroundHeight);

  return (
    <View style={[styles.root, { backgroundColor: baseColor }]}>
      {/* Base background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]} />

      {isBlack && !flat ? (
        <>
          <LinearGradient
            colors={["#151516", "#0b0b0c", "#050505"]}
            locations={[0, 0.48, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {!hideOrbs && (
            <>
              <GlowOrb size={320} color="#00BAF0" style={{ position: "absolute", top: -110, right: -145 }} intensity={0.13} />
              <GlowOrb size={300} color="#1d4068" style={{ position: "absolute", top: 210, left: -150 }} intensity={0.12} />
            </>
          )}
        </>
      ) : null}

      {showPattern ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={require("../assets/images/BackgroundPatternNeutral.png")}
            style={{
              position: "absolute",
              top: -BACKGROUND_OVERSCAN,
              width,
              height: backgroundHeight,
              opacity: patternOpacity ?? 0.045,
            }}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Glass variant: indigo gradient + colour orbs (matches the home sheet) */}
      {glass ? (
        <>
          <LinearGradient
            colors={["#13234d", "#15203a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <GlowOrb size={340} color="#00BAF0" style={{ position: "absolute", top: 50, left: -130 }} />
          <GlowOrb size={320} color="#7E57FF" style={{ position: "absolute", top: 240, right: -140 }} />
          <GlowOrb size={300} color="#FF8A4C" style={{ position: "absolute", bottom: -40, left: 20 }} intensity={0.1} />
        </>
      ) : null}

      {/* Radial vignette — dark edges, clear centre. Dark theme only: on a
          light canvas it just dirties the edges into gray sludge. */}
      {isDark && variant !== "sheet" && !flat ? (
        <SvgXml
          xml={vignetteSvg}
          width={width}
          height={backgroundHeight}
          style={[StyleSheet.absoluteFill, { top: -BACKGROUND_OVERSCAN }]}
        />
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b0b0c",
  },
  base: {
    backgroundColor: "#0b0b0c",
  },
});
