/** Shrinks a picked image into a small JPEG data URI that fits inside a single
 * Deno KV value (64 KiB limit). Resizes to a max dimension, then steps the JPEG
 * quality — and, if still too heavy, the size — down until the encoded string
 * lands under the byte budget. Runs entirely in the browser, so nothing large
 * ever crosses the network. Shared by the create and edit event forms. */
export async function compressImage(
  file: File,
  budget = 45_000,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("No se pudo procesar la imagen."));
    el.src = dataUrl;
  });

  let maxDim = 1000;
  for (let pass = 0; pass < 4; pass++) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("El navegador no admite el redimensionado.");
    ctx.drawImage(img, 0, 0, w, h);

    for (let q = 0.7; q >= 0.3; q -= 0.1) {
      const out = canvas.toDataURL("image/jpeg", q);
      if (out.length <= budget) return out;
    }
    maxDim = Math.round(maxDim * 0.7);
  }
  throw new Error("La imagen es demasiado grande, prueba con otra más ligera.");
}
