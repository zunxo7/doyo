import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { X } from "phosphor-react-native";
import { useT } from "../contexts/SettingsContext";
import { useColors } from "../hooks/useColors";
import { fontStyles } from "../styles/fonts";

const RETURN_URL = /^https?:\/\/[^/]+\/paypal\/return/;
const CANCEL_URL = /^https?:\/\/[^/]+\/paypal\/cancel/;
// PayPal's page is styled for light, whatever the app's theme.
const CHECKOUT_BG = "#ffffff";

type Props = {
  url: string | null;
  /** Shows the sheet with a spinner before the PayPal page's address is known. */
  opening?: boolean;
  title?: string;
  onApproved: () => void;
  onCancel: () => void;
};

export default function PayPalCheckout({ url, opening = false, title, onApproved, onCancel }: Props) {
  const t = useT();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const finished = useRef(false);

  useEffect(() => {
    finished.current = false;
  }, [url]);

  /** Returns false once PayPal hands back to Doyo, so its redirect never renders. */
  const watch = (next: string) => {
    const approved = RETURN_URL.test(next);
    if (!approved && !CANCEL_URL.test(next)) return true;
    if (!finished.current) {
      finished.current = true;
      if (approved) onApproved();
      else onCancel();
    }
    return false;
  };

  return (
    <Modal visible={Boolean(url) || opening} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.wrap, { paddingTop: insets.top + 8, backgroundColor: colors.navy }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.white }, fontStyles.bold]}>{title ?? t("Pay with PayPal")}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={22} color={colors.white} weight="bold" />
          </TouchableOpacity>
        </View>
        {url ? (
          <WebView
            source={{ uri: url }}
            onShouldStartLoadWithRequest={request => watch(request.url)}
            onNavigationStateChange={state => void watch(state.url)}
            startInLoadingState
            renderLoading={() => <Opening label={t("Opening PayPal…")} color={colors.accent} />}
            javaScriptEnabled
            domStorageEnabled
            incognito
            setSupportMultipleWindows={false}
            style={styles.web}
          />
        ) : (
          <Opening label={t("Opening PayPal…")} color={colors.accent} />
        )}
      </View>
    </Modal>
  );
}

function Opening({ label, color }: { label: string; color: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.loading]}>
      <ActivityIndicator color={color} size="large" />
      <Text style={[styles.loadingText, fontStyles.medium]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: CHECKOUT_BG,
  },
  loadingText: {
    color: "#545d68",
    fontSize: 15,
  },
  web: {
    backgroundColor: CHECKOUT_BG,
  },
});
