/**
 * Helper to handle local file picker selection and convert images to Base64 Data URLs.
 * FIX: Compresses images before converting to base64 to avoid timeouts on large files.
 * Validates file size and type.
 */
export function handleLocalFileUpload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file must be an image (PNG, JPG, SVG, WebP).'));
      return;
    }

    // FIX: enforce a 2 MB cap so profile-picture uploads never balloon the
    // request body and trigger timeouts on slow connections.
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_SIZE) {
      reject(new Error('Image file is too large (max 2 MB). Please choose a smaller photo.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    // Downscale large images to a max of 512x512 to keep base64 payloads small.
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 512;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        const compressedReader = new FileReader();
        compressedReader.onload = (ev) => resolve(ev.target.result);
        compressedReader.onerror = (err) => reject(err);
        compressedReader.readAsDataURL(blob);
      }, 'image/jpeg', 0.8);
    };
    img.onerror = () => {
      // Fallback: if canvas downscale fails, use the original file as-is
      reader.readAsDataURL(file);
    };
    img.src = URL.createObjectURL(file);
  });
}
