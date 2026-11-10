import React, { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  ArrowClockwise,
  Broom,
  CaretRight,
  CheckCircle,
  Headset,
  House,
  Timer,
  Trash,
  MoneyWavy,
  PaypalLogo,
  Star,
  XCircle,
} from "phosphor-react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { useSettings } from "../contexts/SettingsContext";
import { getStoredUser } from "../services/auth";
import CustomAlert from "../components/CustomAlert";
import { makeBookingDetailsStyles } from "../styles/BookingDetailsScreen.styles";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "BookingDetails">;
  route: RouteProp<RootStackParamList, "BookingDetails">;
};

export default function BookingDetailsScreen({ navigation, route }: Props) {
  const { booking } = route.params;
  const fonts = useFontFamilies();
  const colors = useColors();
  const { settings } = useSettings();
  const s = useThemedStyles(makeBookingDetailsStyles);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const cancelled = booking.status === "cancelled";
  const endedAt = new Date(booking.endedAt);
  const date = endedAt.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = endedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const statusLabel = cancelled
    ? booking.cancelledBy === "worker" ? "Worker cancelled" : "You cancelled"
    : "Completed";
  const isVehicleService = booking.service.toLowerCase().includes("vehicle");
  const isFurnitureService = booking.service.toLowerCase().includes("furniture");
  const isBarberService = booking.service.toLowerCase().includes("barber");
  const serviceTitle = isVehicleService
    ? "Vehicle Services"
    : isFurnitureService
      ? "Shifting Services"
      : isBarberService
        ? "Barber Services"
        : "Home Services";
  const serviceIcon = isVehicleService
    ? require("../assets/images/BookingHistoryVehicle.webp")
    : isFurnitureService
      ? require("../assets/images/FurnitureServicesIcon.webp")
      : isBarberService
        ? require("../assets/images/BookingHistoryBarber.webp")
        : require("../assets/images/BookingHistoryHome.webp");
  const jobDescription = booking.detail || booking.service;
  const paymentMethod = cancelled ? "Not charged" : formatPaymentMethod(booking.paymentMethod);

  const repeatJob = async () => {
    // New history records persist the exact service choices and this cleaning
    // address. Coordinates are only used to refill the location picker.
    if (!booking.coordinates) return;
    const storedUser = await getStoredUser();
    navigation.navigate("CustomerHome", {
      name: storedUser?.name || "",
      repeatJob: {
        service:
          booking.details?.service === "vehicle" || isVehicleService
            ? "vehicle"
            : booking.details?.service === "furniture" || isFurnitureService
              ? "furniture"
              : booking.details?.service === "barber" || isBarberService
                ? "barber"
                : "home",
        details: booking.details,
        location: { address: booking.address, coordinates: booking.coordinates },
        paymentMethod: toPaymentMethod(booking.paymentMethod),
        price: booking.price,
        workerPreference: booking.workerPreference,
      },
    });
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <FadeInView style={s.headerRow} delay={120} duration={520} keepRasterized>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <ArrowLeft size={22} color={colors.white} weight="bold" />
        </TouchableOpacity>
        <View style={s.headerCopy}>
          <Text style={[s.headerDate, fontStyles.bold]}>{date}</Text>
          <Text style={[s.headerTime, fontStyles.medium]}>{time}</Text>
        </View>
        <TouchableOpacity
          style={s.deleteButton}
          onPress={() => setDeleteConfirmationOpen(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Delete history record"
        >
          <Trash size={22} color={colors.white} weight="bold" />
        </TouchableOpacity>
      </FadeInView>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <FadeInView delay={120} duration={520} keepRasterized>
        <View style={s.serviceCard}>
            <View style={s.serviceTop}>
              <View style={s.serviceCopy}>
                <View style={s.statusRow}>
                  {cancelled ? (
                    <XCircle size={17} color="#f27878" weight="fill" />
                  ) : (
                    <CheckCircle size={17} color={colors.accent} weight="fill" />
                  )}
                  <Text style={[s.statusText, cancelled && s.cancelledText, fontStyles.semiBold]}>{statusLabel}</Text>
                </View>
                <Text style={[s.serviceTitle, fontStyles.bold]}>{serviceTitle}</Text>
              </View>
              <View style={s.serviceImageWrap}>
                <Image
                  source={serviceIcon}
                  style={
                    isVehicleService
                      ? s.serviceVehicleImage
                      : isFurnitureService
                        ? s.serviceFurnitureImage
                        : isBarberService
                          ? s.serviceBarberImage
                          : s.serviceHomeImage
                  }
                  resizeMode="contain"
                  resizeMethod="resize"
                />
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.detailsRows}>
              <BookingInfoRow Icon={Broom} label="Job Details" value={jobDescription} />
              <BookingInfoRow Icon={House} label="Cleaning Location" value={booking.address} />
              <BookingInfoRow Icon={Timer} label="Duration" value={formatDuration(booking.durationMinutes)} />
            </View>
        </View>
        </FadeInView>

        <FadeInView delay={120} duration={520} keepRasterized>
        <View style={s.workerCard}>
            <WorkerPhoto photo={booking.workerPhoto} name={booking.workerName} />
            <View style={s.workerCopy}>
              <Text style={[s.workerName, fontStyles.semiBold]}>{booking.workerName}</Text>
              <View style={s.workerMeta}>
                <Star size={14} color="#facc15" weight="fill" />
                <Text style={[s.workerRating, fontStyles.semiBold]}>{booking.workerRating}</Text>
                <Text style={[s.workerJobs, fontStyles.medium]}>{booking.workerJobs} jobs</Text>
              </View>
            </View>
        </View>
        </FadeInView>

        <FadeInView delay={120} duration={520} keepRasterized>
        <View style={s.paymentCard}>
            <View style={s.paymentRow}>
              <View style={s.paymentLabelRow}>
                <PaymentGlyph method={paymentMethod} />
                <Text style={[s.totalLabel, fontStyles.semiBold]}>Total paid</Text>
              </View>
              <Text style={[s.totalPrice, cancelled && s.cancelledPrice, fontStyles.bold]}>PKR {booking.price}</Text>
            </View>
        </View>
        </FadeInView>

        <FadeInView delay={120} duration={520} keepRasterized>
        <TouchableOpacity style={s.repeatCard} activeOpacity={0.86} onPress={repeatJob}>
            <View style={s.repeatIcon}>
              <ArrowClockwise size={22} color={colors.accent} weight="bold" />
            </View>
            <View style={s.repeatCopy}>
              <Text style={[s.repeatTitle, fontStyles.semiBold]}>Repeat this booking?</Text>
              <Text style={[s.repeatSub, fontStyles.medium]}>Use the same service and location</Text>
            </View>
            <CaretRight size={20} color={colors.whiteSubtle} weight="bold" />
        </TouchableOpacity>
        </FadeInView>

        <FadeInView delay={120} duration={520} keepRasterized>
        <TouchableOpacity style={s.supportCard} activeOpacity={0.86} onPress={() => navigation.navigate("Support")}>
            <View style={s.supportIcon}>
              <Headset size={22} color={colors.accent} weight="fill" />
            </View>
            <View style={s.supportCopy}>
              <Text style={[s.supportTitle, fontStyles.semiBold]}>Need help with this booking?</Text>
              <Text style={[s.supportSub, fontStyles.medium]}>Contact Support</Text>
            </View>
            <CaretRight size={20} color={colors.whiteSubtle} weight="bold" />
        </TouchableOpacity>
        </FadeInView>
      </ScrollView>
      <FadeInView style={s.footer} delay={120} duration={520} keepRasterized>
        <Text style={[s.bookingId, fontStyles.medium]}>Booking ID · {booking.id}</Text>
      </FadeInView>
      <CustomAlert
        visible={deleteConfirmationOpen}
        title="Remove this booking from history?"
        message="This action can’t be undone."
        buttons={[
          { label: "No", variant: "secondary" },
          {
            label: "Yes, delete",
            variant: "danger",
            onPress: () => navigation.navigate("BookingHistory", { deletedId: booking.id }),
          },
        ]}
        onClose={() => setDeleteConfirmationOpen(false)}
      />
    </ScreenBackground>
  );
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours} hr`;
}

function BookingInfoRow({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
  const fonts = useFontFamilies();
  const colors = useColors();
  const s = useThemedStyles(makeBookingDetailsStyles);
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Icon size={20} color={colors.accent} weight="fill" />
      </View>
      <View style={s.infoCopy}>
        <Text style={[s.infoLabel, fontStyles.medium]}>{label}</Text>
        <Text style={[s.infoText, fontStyles.semiBold]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function formatPaymentMethod(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "paypal") return "PayPal";
  if (normalized === "cash") return "Cash";
  return value.trim() || "Cash";
}

function toPaymentMethod(value: string): "PayPal" | "Cash" {
  return value.trim().toLowerCase() === "cash" ? "Cash" : "PayPal";
}

function PaymentGlyph({ method }: { method: string }) {
  const s = useThemedStyles(makeBookingDetailsStyles);
  const normalized = method.trim().toLowerCase();
  const logo = normalized === "jazzcash"
    ? require("../assets/images/JC.png")
    : normalized === "easypaisa"
      ? require("../assets/images/EP.png")
      : null;
  return (
    <View style={s.paymentGlyph}>
      {logo ? (
        <Image source={logo} style={s.paymentLogo} resizeMode="contain" resizeMethod="resize" />
      ) : (
        normalized === "paypal" ? (
          <PaypalLogo size={25} color="#003087" weight="fill" />
        ) : (
          <MoneyWavy size={23} color="#16a34a" weight="fill" />
        )
      )}
    </View>
  );
}

function WorkerPhoto({ photo, name }: { photo: string | null; name: string }) {
  const s = useThemedStyles(makeBookingDetailsStyles);
  const fonts = useFontFamilies();
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "S";
  return (
    <View style={s.workerAvatar}>
      {photo && !failed ? (
        <Image source={{ uri: photo }} style={s.workerAvatarImage} resizeMode="cover" onError={() => setFailed(true)} />
      ) : (
        <Text style={[s.workerInitials, fontStyles.semiBold]}>{initials}</Text>
      )}
    </View>
  );
}
