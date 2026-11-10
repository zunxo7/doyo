import React, { useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { PaypalLogo } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import CustomAlert from "../components/CustomAlert";
import FadeInView from "../components/FadeInView";
import PayPalCheckout from "../components/PayPalCheckout";
import ScreenBackground from "../components/ScreenBackground";
import { useSettings, useT } from "../contexts/SettingsContext";
import { useThemedStyles } from "../hooks/useColors";
import { RootStackParamList } from "../navigation/types";
import { confirmPayPalLink, startPayPalLink } from "../services/payments";
import { makeCommon } from "../styles/common";
import { fontStyles } from "../styles/fonts";
import { makeLinkPayPalStyles } from "../styles/LinkPayPalScreen.styles";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "LinkPayPal">;
  route: RouteProp<RootStackParamList, "LinkPayPal">;
};

export default function LinkPayPalScreen({ navigation, route }: Props) {
  const t = useT();
  const { settings } = useSettings();
  const common = useThemedStyles(makeCommon);
  const s = useThemedStyles(makeLinkPayPalStyles);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const linkId = useRef<string | null>(null);

  const finish = () => navigation.reset({ index: 0, routes: [{ name: "CustomerHome", params: { name: route.params.name } }] });

  const start = async () => {
    setBusy(true);
    try {
      const session = await startPayPalLink();
      linkId.current = session.id;
      setUrl(session.checkoutUrl);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  const approved = async () => {
    setUrl(null);
    try {
      const { linked } = await confirmPayPalLink(linkId.current ?? "");
      if (linked) finish();
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />
      <View style={s.content}>
        <FadeInView delay={80} duration={460} style={s.top}>
          <View style={s.logo}>
            <PaypalLogo size={40} color="#003087" weight="fill" />
          </View>
          <Text style={[common.title, fontStyles.bold]}>{t("Link your PayPal")}</Text>
          <Text style={[common.subtitle, fontStyles.medium]}>
            {t("Nothing is charged now. Doyo only charges you after a job is done.")}
          </Text>
        </FadeInView>
        <FadeInView delay={200} duration={440} style={s.actions}>
          <TouchableOpacity style={[common.button, busy && common.buttonDisabled]} activeOpacity={0.85} disabled={busy} onPress={() => void start()}>
            <Text style={[common.buttonText, fontStyles.semiBold]}>{busy ? t("Opening PayPal") : t("Link PayPal")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.skip} activeOpacity={0.8} onPress={finish}>
            <Text style={[s.skipText, fontStyles.semiBold]}>{t("Skip for now")}</Text>
          </TouchableOpacity>
        </FadeInView>
      </View>
      <PayPalCheckout
        url={url}
        title={t("Link PayPal")}
        onApproved={() => void approved()}
        onCancel={() => {
          setUrl(null);
          setBusy(false);
        }}
      />
      <CustomAlert
        visible={failed}
        title={t("Couldn't link PayPal")}
        message={t("You can skip this and link it on your first booking.")}
        onClose={() => setFailed(false)}
        buttons={[{ label: t("OK"), primary: true, onPress: () => setFailed(false) }]}
      />
    </ScreenBackground>
  );
}
