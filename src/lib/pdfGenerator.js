import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates an official 2024-style A4 Result PDF for Sargolsav 2026.
 * Renders an off-screen fixed 800px container to canvas, ensuring perfect
 * Malayalam font rendering and zero mobile-screen layout squishing.
 *
 * @param {string} containerId - DOM ID of the element to render
 * @param {string|number} itemCode - Item code for file naming
 */
export async function downloadResultPdf(containerId, itemCode) {
  const element = document.getElementById(containerId);
  if (!element) {
    throw new Error(`PDF Template container #${containerId} not found in DOM`);
  }

  // Ensure images are fully loaded before rendering
  const images = element.getElementsByTagName('img');
  await Promise.all(
    Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  const canvas = await html2canvas(element, {
    scale: 2, // 2x DPI for ultra-sharp typography
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 800,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
  heightLeft -= pdfPageHeight;

  // Handle multi-page if entries list is long
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfPageHeight;
  }

  const filename = `Sargolsav_2026_Item_${itemCode}_Result.pdf`;
  pdf.save(filename);
  return filename;
}
