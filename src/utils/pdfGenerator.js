import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportElementToPdf(elementId, filename = 'eduzenta_document.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`PDF Generator: Element with ID #${elementId} not found.`);
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution rendering
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Subsequent pages if continuous document
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
    return true;
  } catch (err) {
    console.error("PDF Export Error:", err);
    // Fallback to native window print
    window.print();
    return true;
  }
}

export function triggerPrint() {
  window.print();
}
