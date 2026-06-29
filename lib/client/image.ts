/**
 * Client-only image helpers (use the browser canvas). Imported only from
 * "use client" components. Downscaling keeps requests inside Cerebras's
 * per-image token + ~10MB payload budget and improves time-to-first-token.
 */

export function downscaleDataURL(dataURL: string, max = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataURL);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataURL);
    img.src = dataURL;
  });
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("Failed to read file"));
    fr.readAsDataURL(file);
  });
}

export async function fileToDownscaledDataURL(file: File, max = 1024, quality = 0.8): Promise<string> {
  const raw = await fileToDataURL(file);
  return downscaleDataURL(raw, max, quality);
}
