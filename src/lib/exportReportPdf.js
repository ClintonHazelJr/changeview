import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Capture a DOM node to a multi-page PDF (preserves colors for heat maps).
 * @param {HTMLElement} element
 * @param {string} filename
 * @param {{ orientation?: 'portrait'|'landscape', format?: string }} [options]
 */
export async function exportElementToPdf(element, filename = 'report.pdf', options = {}) {
  if (!element) throw new Error('Nothing to export yet.');

  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const format = options.format || 'a4';

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    // Capture full scroll width for wide Gantt charts
    windowWidth: Math.max(element.scrollWidth, element.offsetWidth),
    windowHeight: Math.max(element.scrollHeight, element.offsetHeight),
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation, unit: 'pt', format });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = contentHeight;
  let position = margin;

  pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = margin - (contentHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(filename);
}
