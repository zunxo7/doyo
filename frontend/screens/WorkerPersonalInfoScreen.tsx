import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Check, ArrowLeft, ImageSquare, Broom, Car, Couch, Scissors } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { enterRiskyCall, leaveRiskyCall } from "../services/breadcrumbs";
import { shrinkForUpload } from "../services/images";
import { report } from "../services/clientErrors";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeWorkerInfoStyles } from "../styles/WorkerPersonalInfoScreen.styles";
import { makeCnicStyles } from "../styles/CNICUploadScreen.styles";
import { makeCommon } from "../styles/common";
import { saveUser, setActiveMode } from "../services/auth";
import { startDemoWorker } from "../services/bidding";
import { submitInAppWorkerApplication } from "../services/onboarding";
import { avatarOwnerKeyFor, clearAvatar } from "../services/avatar";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";
import { getCachedAppConfig } from "../services/appConfig";
import { clearDraft, keepPhoto, readDraft, saveDraft } from "../services/onboardingDraft";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "WorkerPersonalInfo">;
  route: RouteProp<RootStackParamList, "WorkerPersonalInfo">;
};

type CnicSide = "front" | "back";

const GENDERS = ["Male", "Female"];
const SERVICES = [
  { value: "home_cleaning", label: "Home cleaning", Icon: Broom },
  { value: "vehicle_cleaning", label: "Vehicle cleaning", Icon: Car },
  { value: "furniture_shifting", label: "Furniture shifting", Icon: Couch },
  { value: "barber", label: "Barber services", Icon: Scissors },
];

function formatDob(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join("/");
}

function formatCnic(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  const first = digits.slice(0, 5);
  const second = digits.slice(5, 12);
  const third = digits.slice(12, 13);

  if (third) return `${first}-${second}-${third}`;
  if (second) return `${first}-${second}`;
  return first;
}

function isValidDob(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const currentYear = new Date().getFullYear();

  if (year < 1940 || year > currentYear - 16) return false;
  if (month < 1 || month > 12) return false;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function isValidCnic(value: string) {
  return /^\d{5}-\d{7}-\d$/.test(value);
}

const PENDING_SIDE_KEY = "doyo_personal_info_pending_side";

export default function WorkerPersonalInfoScreen({ navigation, route }: Props) {
  const { email, name, phone = "" } = route.params;
  const uid = route.params.uid ?? email;
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const common = useThemedStyles(makeCommon);
  const s = useThemedStyles(makeWorkerInfoStyles);
  const cn = useThemedStyles(makeCnicStyles);

  // Read once, synchronously, so a resumed form never paints empty first.
  const [draft] = useState(() => {
    const saved = readDraft();
    return saved && saved.email === email ? saved : null;
  });

  // Both onboarding steps live on one screen — step 1 collects details, step 2
  // uploads the CNIC. The bottom button is shared so its position never shifts.
  const [step, setStep] = useState<1 | 2>(draft?.step ?? 1);
  // A store reviewer has no CNIC to photograph and no real name to give, and
  // being stopped here is exactly how the last submission came back rejected.
  // `reviewLocation` is sent to review identities and nobody else, so this
  // cannot loosen validation for a real applicant.
  const isReview = !!getCachedAppConfig().reviewLocation;
  const ctaLabel = isReview ? t("Continue demo flow") : null;

  // Pre-fill from the Google display name (if any) as a convenience — the
  // worker can freely overwrite it, and what they type is what gets saved.
  const [prefillFirst, ...prefillRest] = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const [firstName, setFirstName] = useState(draft?.firstName ?? prefillFirst ?? "");
  const [lastName, setLastName] = useState(draft?.lastName ?? prefillRest.join(" "));
  const [cnicNumber, setCnicNumber] = useState(draft?.cnicNumber ?? "");
  const [dob, setDob] = useState(draft?.dob ?? "");
  const [gender, setGender] = useState(draft?.gender ?? "Male");
  const [services, setServices] = useState<string[]>(draft?.services ?? ["home_cleaning"]);
  const [cnicFrontUri, setCnicFrontUri] = useState<string | null>(draft?.cnicFrontUri ?? null);
  const [cnicBackUri, setCnicBackUri] = useState<string | null>(draft?.cnicBackUri ?? null);
  // Which button took the photo, so the camera button can offer "Retake" only
  // when there is something it took.
  const [cnicSource, setCnicSource] = useState<Record<CnicSide, "camera" | "gallery" | null>>({
    front: draft?.cnicFrontSource ?? null,
    back: draft?.cnicBackSource ?? null,
  });
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);

  // Written on every change rather than on leaving a field: the kill arrives
  // with no warning, and the write is a synchronous few hundred bytes.
  useEffect(() => {
    if (isReview) return;
    saveDraft({
      email,
      uid,
      phone,
      name,
      step,
      firstName,
      lastName,
      cnicNumber,
      dob,
      gender,
      services,
      cnicFrontUri,
      cnicBackUri,
      cnicFrontSource: cnicSource.front,
      cnicBackSource: cnicSource.back,
    });
  }, [
    isReview, email, uid, phone, name, step, firstName, lastName, cnicNumber,
    dob, gender, services, cnicFrontUri, cnicBackUri, cnicSource,
  ]);

  const toggleService = (value: string) => {
    setServices((current) => (
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    ));
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    navigation.goBack();
  };

  const goToCnicStep = () => {
    // Straight through — nothing to fill in, every time.
    if (isReview) {
      setStep(2);
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !cnicNumber.trim() || !dob.trim() || !gender || !services.length) {
      setAlert({ title: t("Required fields"), message: t("Please fill in all required fields.") });
      return;
    }

    if (!isValidCnic(cnicNumber.trim())) {
      setAlert({ title: t("Invalid CNIC"), message: t("Enter CNIC in this format: 35202-1234567-1.") });
      return;
    }

    if (!isValidDob(dob.trim())) {
      setAlert({ title: t("Invalid date of birth"), message: t("Enter a valid date as DD/MM/YYYY. Workers must be at least 16.") });
      return;
    }

    setStep(2);
  };

  // Scheme and length only — a gallery path can name the phone's owner.
  const describeUri = (uri: string | null) => (uri ? `${uri.split(":")[0] || "?"}:${uri.length}` : "none");

  const setImageForSide = async (side: CnicSide, uri: string, source: "camera" | "gallery") => {
    // Out of the cache first: image-manipulator writes where the system
    // deletes under storage pressure, which is the pressure that kills us.
    uri = await keepPhoto(uri, side);
    setCnicSource(current => ({ ...current, [side]: source }));
    if (side === "front") {
      setCnicFrontUri(uri);
      return;
    }
    setCnicBackUri(uri);
  };

  // CnicCapture hands its photo back as params rather than a callback, so the
  // result survives this screen being re-created while the camera was open.
  const captured = route.params.capturedUri;
  const capturedSide = route.params.capturedSide;
  useEffect(() => {
    if (!captured || !capturedSide) return;
    let active = true;
    (async () => {
      const shrunk = await shrinkForUpload(captured);
      if (!active) return;
      await setImageForSide(capturedSide, shrunk, "camera");
      navigation.setParams({ capturedUri: undefined, capturedSide: undefined });
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captured, capturedSide]);

  /**
   * Recover a gallery pick that the activity died holding.
   *
   * Covers the activity-destroyed case only — the native side keeps the result
   * in memory, so a killed process has nothing to hand back and the draft is
   * what restores it. The side is read from disk because component state dies
   * with the process either way.
   */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Returns one result or null, never a list.
        const pending = await ImagePicker.getPendingResultAsync();
        const uri =
          pending && "assets" in pending && !pending.canceled && pending.assets?.length
            ? pending.assets[0].uri
            : null;
        if (!uri) return;
        const stored = await SecureStore.getItemAsync(PENDING_SIDE_KEY);
        const [side, source] = (stored ?? "front:camera").split(":") as [CnicSide, "camera" | "gallery"];
        const shrunk = await shrinkForUpload(uri);
        if (!active) return;
        await setImageForSide(side, shrunk, source ?? "camera");
        setAlert({
          title: t("Photo recovered"),
          message: t("Your phone closed Doyo while you were choosing a photo. It was saved."),
        });
      } catch {
        // Nothing pending, or the platform has no such concept (iOS).
      } finally {
        await SecureStore.deleteItemAsync(PENDING_SIDE_KEY).catch(() => undefined);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Capture in-process rather than through the system camera.
   *
   * A foreign camera activity puts this app in the background, where Android
   * reclaims it and takes the half-filled application with it. CnicCapture
   * renders the camera inside this activity, so there is no background state
   * to be killed in.
   */
  const openCamera = (side: CnicSide) => {
    navigation.navigate("CnicCapture", { side });
  };

  const openGallery = async (side: CnicSide) => {
    // No allowsEditing: it launches a third activity holding a full-size
    // bitmap, and the crop it offers is cosmetic on a document a human reviews.
    await SecureStore.setItemAsync(PENDING_SIDE_KEY, `${side}:gallery`).catch(() => undefined);
    enterRiskyCall("personal_info_gallery", `CNIC ${side}, gallery`);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.85,
      });
      if (!result.canceled) await setImageForSide(side, await shrinkForUpload(result.assets[0].uri), "gallery");
    } finally {
      // In `finally` or a throw leaves the crumb behind, and an error the user
      // already saw gets reported again as an OS kill that never happened.
      leaveRiskyCall("personal_info_gallery");
      await SecureStore.deleteItemAsync(PENDING_SIDE_KEY).catch(() => undefined);
    }
  };

  const submitApplication = async () => {
    // The demo has no application to approve, so the review screen approves itself.
    if (isReview) {
      const workerName = `${firstName} ${lastName}`.trim() || name || "Worker";
      try {
        await startDemoWorker({ email, name: workerName, phone });
        await setActiveMode("worker");
        navigation.reset({ index: 0, routes: [{ name: "WorkerLocked", params: { status: "Submitted for review" } }] });
      } catch {
        setAlert({ title: t("Error"), message: t("Something went wrong. Please try again.") });
      }
      return;
    }

    if (!cnicFrontUri || !cnicBackUri) {
      setAlert({ title: t("Photos required"), message: t("Please add both front and back CNIC photos.") });
      return;
    }
    setUploading(true);
    try {
      await submitInAppWorkerApplication({
        uid,
        email,
        phone,
        fullName: `${firstName} ${lastName}`.trim(),
        gender,
        dob: dob.trim(),
        cnicNumber: cnicNumber.trim(),
        services,
        cnicFrontUri,
        cnicBackUri,
      });
      const worker = {
        id: uid,
        googleUid: uid,
        email,
        // What the worker typed takes precedence; Google name was only a prefill.
        name: `${firstName} ${lastName}`.trim() || name || undefined,
        phone,
        role: "worker",
        onboardingStatus: "submitted_in_app",
      } as const;
      await clearAvatar(avatarOwnerKeyFor(worker));
      await saveUser(worker);
      // The application is in; nothing left to resume, and the copied
      // CNIC photos go with it.
      clearDraft();
      navigation.reset({
        index: 0,
        routes: [{ name: "WorkerLocked", params: { status: "Submitted for review" } }],
      });
    } catch (error) {
      // The alert only says "try again"; without this nothing records WHY, so a
      // worker who cannot submit is invisible to us.
      report({
        kind: "cnic_upload_failed",
        message: "Worker application upload failed",
        context: `${error instanceof Error ? error.message : String(error)} · front ${describeUri(cnicFrontUri)} · back ${describeUri(cnicBackUri)}`,
        stacktrace: error instanceof Error ? error.stack : undefined,
      });
      // The server names what it rejected ("Missing: Phone"); a generic retry
      // prompt only sends the worker round the same failure again.
      setAlert({
        title: t("Error"),
        message: error instanceof Error && error.message ? error.message : t("Upload failed. Please try again."),
      });
    } finally {
      setUploading(false);
    }
  };

  const renderCnicBox = (side: CnicSide, uri: string | null, delay: number) => (
    <FadeInView delay={delay} duration={460} style={cn.uploadCard}>
      <View style={cn.uploadHeader}>
        <Text style={[cn.uploadTitle, fontStyles.semiBold]}>
          {side === "front" ? t("CNIC Front") : t("CNIC Back")}
        </Text>
        {!!uri && (
          <Text style={[cn.selectedText, fontStyles.semiBold]}>{t("Selected")}</Text>
        )}
      </View>

      <View style={[cn.uploadArea, !!uri && cn.uploadAreaActive]}>
        {uri ? (
          <Image source={{ uri }} style={cn.previewImage} resizeMode="cover" />
        ) : (
          <View style={cn.emptyUpload}>
            <ImageSquare size={36} color={colors.white + "55"} weight="duotone" />
          </View>
        )}
      </View>

      <View style={cn.uploadActions}>
        <TouchableOpacity style={cn.actionButton} onPress={() => openCamera(side)} activeOpacity={0.8}>
          <Text style={[cn.actionText, fontStyles.semiBold]}>
            {cnicSource[side] === "camera" ? t("Retake") : t("Camera")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[cn.actionButton, cn.galleryButton]} onPress={() => openGallery(side)} activeOpacity={0.8}>
          <Text style={[cn.actionText, cn.galleryText, fontStyles.semiBold]}>{t("Choose From Gallery")}</Text>
        </TouchableOpacity>
      </View>
    </FadeInView>
  );

  const cnicReady = !!cnicFrontUri && !!cnicBackUri;

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <FadeInView style={common.backHeader} delay={0} duration={420}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={28} color={colors.white} weight="regular" />
        </TouchableOpacity>
      </FadeInView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={step === 1}
        >
          <FadeInView delay={80} duration={460} style={s.titleBlock}>
            <Text style={[s.step, fontStyles.semiBold]}>
              {step === 1 ? t("Step 1 of 2") : t("Step 2 of 2")}
            </Text>
            {step === 1 ? (
              <Text style={[common.title, fontStyles.bold]}>
                {t("Complete") + " "}
                <Text style={[common.title, common.titleAccent, fontStyles.bold]}>{t("onboarding")}</Text>
              </Text>
            ) : (
              <>
                <Text style={[common.title, fontStyles.bold]}>
                  {t("Upload") + " "}
                  <Text style={[common.title, common.titleAccent, fontStyles.bold]}>CNIC</Text>
                </Text>
                <Text style={[common.subtitle, fontStyles.medium]}>
                  {t("Add clear photos of the front and back of your CNIC.")}
                </Text>
              </>
            )}
          </FadeInView>

          {step === 1 ? (
            <>
              <FadeInView delay={140} duration={460}>
                <TextInput
                  style={[s.input, fontStyles.medium]}
                  placeholder={t("First name")}
                  placeholderTextColor={colors.ink + "88"}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </FadeInView>

              <FadeInView delay={170} duration={460}>
                <TextInput
                  style={[s.input, fontStyles.medium]}
                  placeholder={t("Last name")}
                  placeholderTextColor={colors.ink + "88"}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </FadeInView>

              <FadeInView delay={200} duration={460}>
                <TextInput
                  style={[s.input, fontStyles.medium]}
                  placeholder={t("CNIC number")}
                  placeholderTextColor={colors.ink + "88"}
                  value={cnicNumber}
                  onChangeText={(value) => setCnicNumber(formatCnic(value))}
                  keyboardType="number-pad"
                  maxLength={15}
                />
              </FadeInView>

              <FadeInView delay={230} duration={460}>
                <TextInput
                  style={[s.input, fontStyles.medium]}
                  placeholder={t("Date of birth (DD/MM/YYYY)")}
                  placeholderTextColor={colors.ink + "88"}
                  value={dob}
                  onChangeText={(value) => setDob(formatDob(value))}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </FadeInView>

              <FadeInView delay={260} duration={460} style={s.genderRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[s.genderOption, gender === g && s.genderSelected]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.genderText, gender === g && s.genderTextSelected, fontStyles.medium]}>{t(g)}</Text>
                  </TouchableOpacity>
                ))}
              </FadeInView>

              <FadeInView delay={290} duration={460}>
                <Text style={[s.sectionLabel, fontStyles.semiBold]}>{t("Services you can provide")}</Text>
              </FadeInView>

              <FadeInView delay={320} duration={460} style={s.serviceList}>
                {[SERVICES.slice(0, 2), SERVICES.slice(2, 4)].map((row, rowIndex) => (
                  <View key={rowIndex} style={s.serviceGridRow}>
                    {row.map(({ value, label, Icon }) => {
                      const selected = services.includes(value);
                      return (
                        <TouchableOpacity
                          key={value}
                          style={[s.serviceTile, selected && s.serviceRowActive]}
                          onPress={() => toggleService(value)}
                          activeOpacity={0.85}
                        >
                          <View style={s.serviceTileTop}>
                            <View style={[s.serviceIcon, selected && s.serviceIconActive]}>
                              <Icon size={20} color={selected ? colors.white : colors.accent} weight="fill" />
                            </View>
                            {selected ? (
                              <View style={s.serviceCheckedBox}>
                                <Check size={13} color={colors.white} weight="bold" />
                              </View>
                            ) : (
                              <View style={s.serviceEmptyBox} />
                            )}
                          </View>
                          <Text
                            style={[s.serviceName, selected && s.serviceNameActive, fontStyles.semiBold]}
                            numberOfLines={2}
                          >
                            {t(label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </FadeInView>
            </>
          ) : (
            <>
              {renderCnicBox("front", cnicFrontUri, 120)}
              {renderCnicBox("back", cnicBackUri, 190)}
            </>
          )}

          <FadeInView delay={step === 1 ? 390 : 260} duration={440} style={s.ctaContainer}>
            {step === 1 ? (
              <TouchableOpacity style={common.button} activeOpacity={0.85} onPress={goToCnicStep}>
                <Text style={[common.buttonText, fontStyles.semiBold]}>{ctaLabel ?? t("Next")}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[common.button, (!cnicReady || uploading) && !isReview && common.buttonDisabled]}
                activeOpacity={0.85}
                onPress={submitApplication}
                disabled={!isReview && (!cnicReady || uploading)}
              >
                <Text style={[common.buttonText, fontStyles.semiBold]}>
                  {ctaLabel ?? (uploading ? t("Uploading...") : t("Submit Application"))}
                </Text>
              </TouchableOpacity>
            )}
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={!!alert}
        title={alert?.title ?? ""}
        message={alert?.message}
        onClose={() => setAlert(null)}
      />
    </ScreenBackground>
  );
}
