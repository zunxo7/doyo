import { StyleSheet } from "react-native";
import type { Palette } from "./colors";

export const makeBookingHistoryStyles = (c: Palette) => StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 50, paddingHorizontal: 18, paddingBottom: 8 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#272727", alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 20, color: c.white },
  headerHint: { color: c.whiteSubtle, fontSize: 12.5, marginTop: 2 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 42 },
  // Bleeds past the list's side padding so the chips scroll edge to edge.
  filtersWrap: { marginHorizontal: -20, marginBottom: 20 },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 20 },
  chip: { minWidth: 54, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: c.accent }, chipText: { color: c.whiteSubtle, fontSize: 12.5, letterSpacing: 0.24 }, chipTextActive: { color: c.white },
  results: { width: "100%", flex: 1 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  dayHeader: { fontSize: 13, color: c.white, marginBottom: 10 },
  emptyCard: { width: "100%", flex: 1, alignItems: "center", justifyContent: "center", transform: [{ translateY: -12 }] },
  emptyIllustration: { width: 323, height: 254, marginBottom: 20 },
  emptyTitle: { color: c.white, fontSize: 21, lineHeight: 27, textAlign: "center" },
  emptyText: { width: 260, color: c.whiteSubtle, fontSize: 15, lineHeight: 21, textAlign: "center", marginTop: 8 },
  emptyButton: { width: 240, height: 52, marginTop: 24, borderRadius: 10, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  emptyButtonText: { color: c.white, fontSize: 16 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: "#343434", padding: 13, marginBottom: 12 },
  serviceIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: "#1d1d1d", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  // The car faces right; crop roughly 36% from the rear (left) so the front
  // section fits inside the same square holder used by the home-service icon.
  vehicleImage: { position: "absolute", width: 105, height: 48, left: -38, top: 9 },
  // Preserve the complete drop shadow inside the square holder while trimming
  // roughly 10% from the rear (left). The bottom inset is intentional.
  homeImage: { position: "absolute", width: 66, height: 66, left: -10, top: -3 },
  furnitureImage: { position: "absolute", width: 62, height: 62, left: -1, top: 0 },
  barberImage: { position: "absolute", width: 62, height: 57, left: -1, top: 2 },
  cardBody: { flex: 1, minWidth: 0 }, statusText: { color: c.whiteSubtle, fontSize: 10.5 }, cancelledText: { color: "#f27878" },
  detail: { color: c.white, fontSize: 13.5, marginTop: 3 }, time: { color: c.white, fontSize: 13.5, marginTop: 5 },
  cardPrice: { color: c.white, fontSize: 16, textAlign: "right" },
  cancelledPrice: { color: c.whiteSubtle },
});
