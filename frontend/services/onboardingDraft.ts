import { Directory, File, Paths } from "expo-file-system";

export type OnboardingDraft = {
  email: string;
  uid?: string;
  phone?: string;
  name?: string | null;
  step: 1 | 2;
  firstName: string;
  lastName: string;
  cnicNumber: string;
  dob: string;
  gender: string;
  services: string[];
  cnicFrontUri: string | null;
  cnicBackUri: string | null;
  cnicFrontSource: "camera" | "gallery" | null;
  cnicBackSource: "camera" | "gallery" | null;
  at: number;
};

const DRAFT_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const draftFile = () => new File(Paths.document, "doyo_onboarding_draft.json");
const photoFolder = () => new Directory(Paths.document, "onboarding");

export function readDraft(): OnboardingDraft | null {
  try {
    const file = draftFile();
    if (!file.exists) return null;
    const draft = JSON.parse(file.textSync()) as OnboardingDraft;
    const fresh = Date.now() - (draft?.at ?? 0) <= DRAFT_LIFETIME_MS;
    return draft?.email && fresh ? draft : null;
  } catch {
    return null;
  }
}

// Synchronous so the draft is on disk before a photo picker can take over the app.
export function saveDraft(draft: Omit<OnboardingDraft, "at">): void {
  try {
    draftFile().write(JSON.stringify({ ...draft, at: Date.now() }));
  } catch (error) {
    console.warn("could not save onboarding draft", error);
  }
}

export function clearDraft(): void {
  for (const entry of [draftFile(), photoFolder()]) {
    try {
      if (entry.exists) entry.delete();
    } catch (error) {
      console.warn("could not clear onboarding draft", error);
    }
  }
}

// Falls back to the original uri, since a cached photo still beats no photo.
export async function keepPhoto(uri: string, side: "front" | "back"): Promise<string> {
  try {
    const folder = photoFolder();
    if (!folder.exists) folder.create({ intermediates: true });
    const kept = new File(folder, `cnic-${side}.jpg`);
    if (kept.exists) kept.delete();
    await new File(uri).copy(kept);
    return kept.uri;
  } catch {
    return uri;
  }
}
