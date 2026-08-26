/**
 * Client-side photo resize before upload.
 *
 * A 40-item checklist at full phone resolution is ~200MB/day/outlet; at
 * 1600px/q80 it is ~8MB. The longest edge is capped and the image re-encoded
 * as JPEG, whatever the camera produced.
 */

export const MAX_EDGE_PX = 1600;
export const JPEG_QUALITY = 0.8;

export async function resizeImage(
  file: Blob,
  maxEdge: number = MAX_EDGE_PX,
  quality: number = JPEG_QUALITY,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not available on this device.");
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) throw new Error("The photo could not be re-encoded.");
    return blob;
  } finally {
    bitmap.close();
  }
}
