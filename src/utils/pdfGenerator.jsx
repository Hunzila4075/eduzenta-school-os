import React from 'react';
import { createRoot } from 'react-dom/client';

// html2canvas + jspdf are loaded on demand via dynamic import (kept out of the
// initial bundle). They are only fetched when a user actually clicks
// "Download PDF".
let html2canvasLib = null;
let jsPDFLib = null;
const ensurePdfLibs = async () => {
  if (!html2canvasLib) {
    const mod = await import('html2canvas');
    html2canvasLib = mod.default || mod.html2canvas || mod;
  }
  if (!jsPDFLib) {
    const mod = await import('jspdf');
    jsPDFLib = mod.jsPDF || mod.default;
  }
  return { html2canvas: html2canvasLib, jsPDF: jsPDFLib };
};

// Resolve a possibly-relative logo URL against the API origin so html2canvas
// can load it from the same server (avoids canvas tainting / 404s).
const resolveAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta?.env?.VITE_API_URL || '').replace(/\/api\/?$/, '');
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Preload an image and convert it to a base64 data URL. Needed because
// html2canvas cannot rasterize cross-origin images reliably.
const toDataUrl = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 64;
        canvas.height = img.naturalHeight || 64;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (_) {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = resolveAssetUrl(src);
  });

const INLINE_CSS = [
  'font-family: Arial, "Segoe UI", Helvetica, sans-serif;',
  'color: #0f172a;',
  'background: #ffffff;',
  'line-height: 1.45;'
].join(' ');

// Convert any CSS color value (oklch, hsl, hex, named, rgb, etc.) to a plain
// rgb(r,g,b) string. html2canvas 1.4.1 cannot parse Tailwind v4 oklch() colors,
// which throws "Attempting to parse an unsupported color function oklch" and
// aborts the entire PDF generation before pdf.save() runs.
let _colorCanvas = null;
const colorToRgb = (color) => {
  if (!color || color === 'transparent' || color === 'currentColor') return '';
  if (color.startsWith('rgb(')) return color; // already safe
  try {
    if (!_colorCanvas) _colorCanvas = document.createElement('canvas');
    _colorCanvas.width = _colorCanvas.height = 1;
    const ctx = _colorCanvas.getContext('2d');
    if (!ctx) return '';
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const a = d[3] / 255;
    if (a === 0) return ''; // fully transparent → remove
    return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
  } catch (_) {
    return '';
  }
};

// Rewrite every color-bearing CSS property on every element to plain rgb/rgba
// values so Tailwind v4 oklch() colors never reach html2canvas's CSS parser.
const sanitizeColorsForCapture = (root) => {
  if (!root) return;
  const els = root.querySelectorAll ? root.querySelectorAll('*') : [];
  els.forEach((el) => {
    try {
      const cs = window.getComputedStyle(el);
      if (!cs) return;
      // Direct color properties
      const colorProps = [
        'color', 'background-color', 'border-top-color', 'border-right-color',
        'border-bottom-color', 'border-left-color', 'outline-color',
        'text-decoration-color', 'column-rule-color', 'fill', 'stroke',
      ];
      colorProps.forEach((prop) => {
        const raw = cs.getPropertyValue(prop);
        if (!raw) return;
        const rgb = colorToRgb(raw);
        if (rgb) el.style.setProperty(prop, rgb, 'important');
      });
      // box-shadow / text-shadow may embed oklch colors — strip or convert
      ['box-shadow', 'text-shadow'].forEach((prop) => {
        const raw = cs.getPropertyValue(prop);
        if (!raw || raw === 'none') return;
        if (prop === 'box-shadow' && /oklch|hsl\(/i.test(raw)) {
          el.style.setProperty(prop, 'none', 'important');
        } else {
          el.style.setProperty(prop, raw, 'important');
        }
      });
      // Gradients with oklch → neutralize the image (prevents parse crashes)
      const bgImg = cs.getPropertyValue('background-image');
      if (bgImg && bgImg !== 'none' && /oklch|hsl\(/i.test(bgImg)) {
        el.style.setProperty('background-image', 'none', 'important');
      }
    } catch (_) { /* ignore individual element failures */ }
  });
};

// Convert every <img> inside the root to an inline base64 data URL.
const inlineImages = async (root) => {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.src || img.src.startsWith('data:')) return;
      const data = await toDataUrl(img.getAttribute('src'));
      if (data) {
        img.setAttribute('src', data);
      } else {
        img.style.display = 'none';
      }
    })
  );
};


// ------------------------------------------------------------
// Shared school-info helper — single branding source for all documents
// ------------------------------------------------------------
export function getCurrentSchoolInfo(currentSchool, currentUser) {
  const fallbackUserSchool = {
    id: currentUser?.school_id || currentUser?.schoolId || null,
    name: currentUser?.school_name || currentUser?.schoolName || '',
    logoUrl: currentUser?.school_logo_url || currentUser?.schoolLogoUrl || '',
    address: currentUser?.school_address || ''
  };
  const cs = currentSchool || fallbackUserSchool;
  return {
    id: cs?.id ?? fallbackUserSchool.id,
    name: cs?.name || fallbackUserSchool.name || '',
    logoUrl: cs?.logoUrl || cs?.logo_url || fallbackUserSchool.logoUrl || '',
    address: cs?.address || fallbackUserSchool.address || ''
  };
}

// NEUTRAL emblem for pre-auth surfaces (login/landing) only.
export function SchoolLogo({ logoUrl, size = 64, className = '' }) {
  const resolved = resolveAssetUrl(logoUrl);
  if (!resolved) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: Math.round(size * 0.4),
          fontFamily: 'Arial, sans-serif'
        }}
      >
        E
      </div>
    );
  }
  return (
    <img
      src={resolved}
      alt="School logo"
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}

// ------------------------------------------------------------
// PDF export — rasterizes the given DOM node into a real .pdf download.
// Returns a Promise so callers can show a loading state.
// ------------------------------------------------------------
export async function exportElementToPdf(elementId, filename = 'eduzenta_document.pdf', options = {}) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`PDF source element "${elementId}" not found.`);
  }

  // Bulk documents (result cards, etc.): render each direct child of the
  // captured container on its OWN individual A4 page — never two students on
  // one page. Omitted/false keeps the original whole-element behavior.
  const perElementPages = options.perElementPages === true;

  // Signal for the "Generating PDF..." loading state
  window.dispatchEvent(new CustomEvent('pdf-generation-start'));

  // Work on a clone rendered off-screen so sanitization never alters the
  // visible preview and modal scroll state doesn't affect the capture.
  const clone = element.cloneNode(true);
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-pdf-capture', '1');
  wrapper.style.cssText = 'position:fixed; left:-10000px; top:0; width:794px; background:#ffffff;';
  clone.style.cssText += `;${INLINE_CSS}`;
  clone.style.width = '794px';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await inlineImages(wrapper);
    sanitizeColorsForCapture(wrapper);

        const { html2canvas, jsPDF } = await ensurePdfLibs();

    if (perElementPages && clone.children.length > 0) {
      // One child element = exactly one A4 page. Each card is scaled with the
      // same min-ratio math as single exports, which guarantees it fits fully
      // inside one page (no slicing, no merging, no shrink-cropping).
      const targets = Array.from(clone.children);
      let pdf = null;
      for (const target of targets) {
        const canvas = await html2canvas(target, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: clone.scrollWidth || 794,
          onclone: (doc) => {
            sanitizeColorsForCapture(doc.body);
          },
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
        if (!pdf) {
          pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
        } else {
          pdf.addPage('a4', orientation);
        }
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 6;
        const ratio = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height);
        const drawW = canvas.width * ratio;
        const drawH = canvas.height * ratio;
        pdf.addImage(imgData, 'JPEG', margin + (pageW - margin * 2 - drawW) / 2, margin, drawW, drawH, undefined, 'FAST');
      }
      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      return true;
    }

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: clone.scrollWidth || 794,
      // html2canvas 1.4.1 builds its own internal clone of the document.
      // Re-run color sanitization there so no oklch() value is parsed.
      onclone: (doc) => {
        sanitizeColorsForCapture(doc.body);
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const ratio = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height);
    const drawW = canvas.width * ratio;
    const drawH = canvas.height * ratio;

    // Multi-page if the scaled image exceeds one A4 page
    if (drawH <= pageH - margin * 2) {
      pdf.addImage(imgData, 'JPEG', margin, margin, drawW, drawH, undefined, 'FAST');
    } else {
      const pxPerMm = canvas.height / drawH;
      const sliceHeightPx = Math.floor((pageH - margin * 2) * pxPerMm);
      let yPx = 0;
      while (yPx < canvas.height) {
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - yPx);
        const ctx = sliceCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, yPx, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        if (yPx > 0) pdf.addPage();
        pdf.addImage(sliceData, 'JPEG', margin, margin, drawW, sliceCanvas.height / pxPerMm, undefined, 'FAST');
        yPx += sliceHeightPx;
      }
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } finally {
    wrapper.remove();
    window.dispatchEvent(new CustomEvent('pdf-generation-end'));
  }
}
// ------------------------------------------------------------
// Isolated print — renders ONLY the target node into a hidden iframe and
// prints that frame. The main app UI (sidebar, buttons, navigation) never
// appears in the print output. No window.print() full-page fallback.
// ------------------------------------------------------------
export function triggerPrint(elementId) {
  const source = elementId ? document.getElementById(elementId) : null;
  if (!source) {
    console.warn('[triggerPrint] Source element not found:', elementId);
    return;
  }

  const existingFrame = document.getElementById('eduzenta-print-frame');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'eduzenta-print-frame';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }

  // Copy the app's stylesheets so Tailwind classes resolve inside the frame,
  // then override with strict document-print rules.
  const appStylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');

  const printCss = `
    @page { margin: 10mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
    body { font-family: Arial, "Segoe UI", sans-serif; color: #0f172a; }
    .modal-actions, .no-print, button, .sidebar, nav { display: none !important; }
  `;

  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><title>EDUZENTA Document</title>${appStylesheets}<style>${printCss}</style></head><body></body></html>`
  );
  doc.close();

  // Import the rendered DOM (resolved classes) into the print frame
  const imported = doc.importNode(source, true);
  doc.body.appendChild(imported);

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  wait(350)
    .then(async () => {
      // Force document colors to plain rgb/hex (no oklch reaches the printer)
      sanitizeColorsForCapture(doc.body);
      await inlineImages(doc.body);
      return wait(150);
    })
    .then(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Cleanup after the dialog closes
      const cleanup = () => setTimeout(() => iframe.remove(), 1000);
      iframe.contentWindow.addEventListener('afterprint', cleanup);
      setTimeout(() => {
        if (document.getElementById('eduzenta-print-frame')) iframe.remove();
      }, 120000);
    });
}


