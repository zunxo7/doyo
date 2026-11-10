import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ArrowLeft, Lightning, LightningSlash } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import FadeInView from "../components/FadeInView";
import CustomAlert from "../components/CustomAlert";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeCnicCaptureStyles } from "../styles/CnicCaptureScreen.styles";
import { fontStyles } from "../styles/fonts";
import { RootStackParamList } from "../navigation/types";
import { report } from "../services/clientErrors";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "CnicCapture">;
  route: RouteProp<RootStackParamList, "CnicCapture">;
};

/**
 * Photograph a CNIC without leaving this activity.
 *
 * The system camera is a separate activity, which backgrounds Doyo and lets
 * Android reclaim it mid-application. Everything here runs in-process, so
 * there is no background state for the OS to take.
 *
 * The frame is a guide, not a crop: the photo is kept whole because a human
 * reviews it, and a crop that clips a corner turns a readable document into a
 * rejected one.
 */
export default function CnicCaptureScreen({ navigation, route }: Props) {
  const { side } = route.params;
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeCnicCaptureStyles);

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const readyRef = useRef(false);

  const label = side === "front" ? t("CNIC Front") : t("CNIC Back");

  const capture = async () => {
    // takePictureAsync throws on Android if the preview is not up yet.
    if (busy || !readyRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) {
        setAlert({ title: t("Could not take the photo"), message: t("Please try again.") });
        return;
      }
      // popTo, not navigate: since React Navigation 7, navigate() from here
      // pushes a NEW form whose params are only these two, losing the email and
      // the phone the server requires. merge keeps the identity the form already
      // holds, and is off by default, so without it popTo would drop it too.
      navigation.popTo(
        "WorkerPersonalInfo",
        { capturedUri: photo.uri, capturedSide: side } as RootStackParamList["WorkerPersonalInfo"],
        { merge: true },
      );
    } catch (error) {
      report({
        kind: "cnic_capture_failed",
        message: "In-app CNIC capture failed",
        context: `${side} · ${error instanceof Error ? error.message : String(error)}`,
        stacktrace: error instanceof Error ? error.stack : undefined,
      });
      setAlert({ title: t("Could not take the photo"), message: t("Please try again.") });
    } finally {
      setBusy(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <FadeInView style={s.centered}>
          <Text style={[s.centeredText, fontStyles.regular]}>
            {t("Camera access is required to photograph your CNIC.")}
          </Text>
          <TouchableOpacity style={s.grantButton} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={[s.grantButtonText, fontStyles.semiBold]}>{t("Allow camera")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[s.centeredText, fontStyles.regular]}>{t("Go back")}</Text>
          </TouchableOpacity>
        </FadeInView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={s.camera}
        facing="back"
        enableTorch={torch}
        onCameraReady={() => {
          readyRef.current = true;
        }}
      />

      <View style={s.overlay} pointerEvents="none">
        <View style={s.frame} />
        <Text style={[s.hint, fontStyles.regular]}>{t("Fit the whole card inside the frame.")}</Text>
      </View>

      <FadeInView style={s.topBar}>
        <TouchableOpacity style={s.iconButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={22} color={colors.white} weight="bold" />
        </TouchableOpacity>
        <Text style={[s.sideLabel, fontStyles.semiBold]}>{label}</Text>
        <TouchableOpacity style={s.iconButton} onPress={() => setTorch(v => !v)} activeOpacity={0.8}>
          {torch ? (
            <LightningSlash size={22} color={colors.white} weight="bold" />
          ) : (
            <Lightning size={22} color={colors.white} weight="bold" />
          )}
        </TouchableOpacity>
      </FadeInView>

      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.shutter, busy && s.shutterBusy]}
          onPress={capture}
          disabled={busy}
          activeOpacity={0.85}
          accessibilityLabel={t("Take photo")}
        />
      </View>

      <CustomAlert
        visible={!!alert}
        title={alert?.title ?? ""}
        message={alert?.message}
        onClose={() => setAlert(null)}
      />
    </View>
  );
}
