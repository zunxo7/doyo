import React, { useState } from "react";
import { Text, ViewStyle, StyleProp } from "react-native";
import FadeInView from "./FadeInView";
import LegalOverlay from "./LegalOverlay";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT } from "../contexts/SettingsContext";
import { useThemedStyles } from "../hooks/useColors";
import { makeCommon } from "../styles/common";
import { fontStyles } from "../styles/fonts";

type Props = {
  /** Fade-in delay so it can match the screen's stagger. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * "By continuing you agree to our Terms & Privacy" footer used across the
 * onboarding screens. Owns its own LegalOverlay state so each screen just
 * drops it in below the bottom button.
 */
export default function LegalFooter({ delay = 300, style }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const common = useThemedStyles(makeCommon);
  const [legalOverlay, setLegalOverlay] = useState<"terms" | "privacy" | null>(null);

  return (
    <FadeInView delay={delay} duration={440} style={[common.footer, style]}>
      <Text style={[common.footerText, fontStyles.regular]}>
        {t("By continuing you agree to our") + " "}
        <Text
          style={[common.footerText, common.footerLink, fontStyles.regular]}
          onPress={() => setLegalOverlay("terms")}
        >
          {t("Terms & Conditions")}
        </Text>
        {" " + t("and") + " "}
        <Text
          style={[common.footerText, common.footerLink, fontStyles.regular]}
          onPress={() => setLegalOverlay("privacy")}
        >
          {t("Privacy Policy")}
        </Text>
      </Text>

      <LegalOverlay
        visible={!!legalOverlay}
        onClose={() => setLegalOverlay(null)}
      />
    </FadeInView>
  );
}
