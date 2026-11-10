import type { CustomerBookingHistoryItem, JobDetails } from "../services/bidding";
import type { SelectedLocation } from "../services/location";

export type WorkerPersonalInfoData = {
  firstName: string;
  lastName: string;
  cnicNumber: string;
  dob: string;
  gender: string;
  services: string[];
};

export type RootStackParamList = {
  Splash: undefined;
  UpdateRequired: {
    currentVersion: string;
    requiredVersion: string;
    latestVersion: string;
    message: string;
    updateUrl: string;
  };
  Onboarding: undefined;
  PhoneNumber: { uid?: string; email: string; name?: string | null };
  Email: undefined;
  OTP: { email: string; challenge: string; expiresAt: number };
  Role: { uid?: string; email: string; name?: string | null; phone: string };
  CustomerName: { uid?: string; email: string; name?: string | null; phone: string };
  LinkPayPal: { name: string };
  CustomerHome: {
    name: string;
    repeatJob?: {
      service: "home" | "vehicle" | "furniture" | "barber";
      details: JobDetails | null;
      location: SelectedLocation;
      paymentMethod: "PayPal" | "Cash";
      price: number;
      workerPreference: "Male" | "Female" | "Any";
    };
  };
  // focusJobId: set when the worker arrived here by tapping a job notification.
  WorkerHome: { name?: string; focusJobId?: string } | undefined;
  Profile: { name?: string } | undefined;
  Loyalty: undefined;
  BookingHistory: { deletedId?: string } | undefined;
  BookingDetails: { booking: CustomerBookingHistoryItem };
  Settings: undefined;
  Support: undefined;
  ServicesInfo: undefined;
  Chat: {
    workerName: string;
    peerRole?: "worker" | "customer";
    jobId?: string;
    actorId?: string;
    actorRole?: "worker" | "customer";
    peerPhoto?: string | null;
  };
  WorkerTracking: { workerName: string; price: number; rating?: string };
  WorkerLocked: { status?: string } | undefined;
  WorkerPersonalInfo: {
    uid?: string;
    email: string;
    name?: string | null;
    phone?: string;
    /** Set by CnicCapture on its way back, and cleared once consumed. */
    capturedUri?: string;
    capturedSide?: "front" | "back";
  };
  CnicCapture: { side: "front" | "back" };
};
