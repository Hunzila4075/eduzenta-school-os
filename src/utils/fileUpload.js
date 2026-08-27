/**
 * Helper to handle local file picker selection and convert images to Base64 Data URLs
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

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}
