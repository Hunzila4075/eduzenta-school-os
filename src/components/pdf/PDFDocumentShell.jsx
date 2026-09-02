import React from 'react';
import './print-templates.css';

/**
 * Isolated print/pdf document shell.
 * Every printable document (Result Card, Fee Challan, Admit Card) is wrapped
 * in this component. It carries the data-print-root marker consumed by
 * utils/pdfGenerator.printDocument() — print output contains ONLY this node.
 * Styles come exclusively from print-templates.css (hex/rgb colors, no oklch).
 */
export default function PDFDocumentShell({ children }) {
  return <div className="pdf-doc-shell" data-print-root>{children}</div>;
}
