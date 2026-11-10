import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { report } from "./clientErrors";

const UPLOAD_WIDTH_PX = 1600;

export async function shrinkForUpload(uri: string): Promise<string> {
  try {
    const shrunk = await manipulateAsync(uri, [{ resize: { width: UPLOAD_WIDTH_PX } }], {
      compress: 0.7,
      format: SaveFormat.JPEG,
    });
    return shrunk.uri;
  } catch (error) {
    report({
      kind: "image_shrink_failed",
      message: "Could not shrink an image for upload",
      context: error instanceof Error ? error.message : String(error),
    });
    return uri;
  }
}
