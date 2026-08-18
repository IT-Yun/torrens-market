import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Downscale + recompress an image before upload (ops-roadmap storage
 * optimization): listing/chat photos cap at 1280px, avatars at 512px.
 * Cuts storage and upload bandwidth ~10x versus camera originals.
 */
export async function compressForUpload(
  asset: { uri: string; width?: number },
  maxWidth = 1280,
): Promise<{ uri: string; mimeType: string }> {
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    if ((asset.width ?? Infinity) > maxWidth) {
      context.resize({ width: maxWidth });
    }
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    return { uri: result.uri, mimeType: 'image/jpeg' };
  } catch {
    return { uri: asset.uri, mimeType: 'image/jpeg' };
  }
}
