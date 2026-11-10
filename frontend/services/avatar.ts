import { Directory, File, Paths } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { enterRiskyCall, leaveRiskyCall } from "./breadcrumbs";

const AVATAR_WIDTH_PX = 256;

const ownerSlug = (ownerKey: string) => ownerKey.toLowerCase().replace(/[^a-z0-9._-]/g, "") || "guest";
const storageKey = (ownerKey: string) => `doyo_pfp_${ownerSlug(ownerKey)}`;

export function avatarOwnerKeyFor(
  owner: { id?: string; googleUid?: string; email?: string } | null | undefined,
  fallback = "guest",
): string {
  return owner?.googleUid || owner?.id || owner?.email || fallback;
}

// A new filename per save stops React Native reusing a cached bitmap for the path.
function newAvatarFile(ownerKey: string): File {
  const folder = new Directory(Paths.document, "avatars");
  if (!folder.exists) folder.create({ intermediates: true });
  return new File(folder, `${ownerSlug(ownerKey)}-${Date.now()}.webp`);
}

function deleteIfPresent(uri: string | null): void {
  if (!uri) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

export async function pickAvatar(ownerKey: string): Promise<string | null> {
  enterRiskyCall("avatar_picker", "profile photo, gallery");
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  leaveRiskyCall("avatar_picker");
  if (picked.canceled || !picked.assets?.length) return null;

  const resized = await manipulateAsync(picked.assets[0].uri, [{ resize: { width: AVATAR_WIDTH_PX } }], {
    compress: 0.7,
    format: SaveFormat.WEBP,
  });

  deleteIfPresent(await SecureStore.getItemAsync(storageKey(ownerKey)).catch(() => null));
  const saved = newAvatarFile(ownerKey);
  await new File(resized.uri).move(saved);
  await SecureStore.setItemAsync(storageKey(ownerKey), saved.uri);
  return saved.uri;
}

export async function getAvatar(ownerKey: string): Promise<string | null> {
  try {
    const uri = await SecureStore.getItemAsync(storageKey(ownerKey));
    return uri && new File(uri).exists ? uri : null;
  } catch {
    return null;
  }
}

export async function restoreAvatarFromRemote(ownerKey: string, remoteUrl: string): Promise<string | null> {
  try {
    const local = await getAvatar(ownerKey);
    if (local) return local;

    const response = await fetch(remoteUrl);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) return null;

    const saved = newAvatarFile(ownerKey);
    saved.create({ overwrite: true });
    saved.write(bytes);
    await SecureStore.setItemAsync(storageKey(ownerKey), saved.uri);
    return saved.uri;
  } catch {
    return null;
  }
}

export async function clearAvatar(ownerKey: string): Promise<void> {
  try {
    deleteIfPresent(await SecureStore.getItemAsync(storageKey(ownerKey)));
    await SecureStore.deleteItemAsync(storageKey(ownerKey));
  } catch (error) {
    console.warn("could not clear avatar", error);
  }
}
