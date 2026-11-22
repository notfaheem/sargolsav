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
    windowWidth: 900,
    scrollX: 0,
    scrollY: 0,
  });

  const imgData = canvas.toDataURL('image/png');
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
  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
  heightLeft -= pdfPageHeight;

  // Handle multi-page if entries list is long
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfPageHeight;
  }

  const filename = `Sargolsav_2026_Item_${itemCode}_Result.pdf`;
  pdf.save(filename);
  return filename;
}

/**
 * Generates an official Consolidated Score Sheet A4 PDF matching ITEM_207.pdf.
 *
 * @param {string} containerId - DOM ID of the hidden template element
 * @param {string|number} itemCode - Item code for file naming
 * @returns {Promise<string>} Downloaded filename
 */
export async function downloadScoreSheetPdf(containerId, itemCode) {
  const element = document.getElementById(containerId);
  if (!element) {
    throw new Error(`Score Sheet PDF Template container #${containerId} not found in DOM`);
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
    windowWidth: 900,
    scrollX: 0,
    scrollY: 0,
  });

  const imgData = canvas.toDataURL('image/png');
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
  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
  heightLeft -= pdfPageHeight;

  // Handle multi-page if entries list is long
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfPageHeight;
  }

  const filename = `${itemCode}_Consolidated_Score_Sheet.pdf`;
  pdf.save(filename);
  return filename;
}

/**
 * Generates an official multi-page A4 PDF from an array of DOM element IDs (or elements).
 * Each item in the array is rendered onto its own clean A4 page (with internal smooth slicing
 * if any page exceeds standard A4 height).
 *
 * @param {Array<string|HTMLElement>} elementsOrIds - Array of DOM IDs or elements
 * @param {string} filename - Filename to save as
 * @returns {Promise<string>} Downloaded filename
 */
export async function downloadMultiPagePdf(elementsOrIds, filename = 'Sargolsav_2026_Report.pdf') {
  const elements = elementsOrIds
    .map((item) => (typeof item === 'string' ? document.getElementById(item) : item))
    .filter(Boolean);

  if (elements.length === 0) {
    throw new Error('No PDF template elements found to render');
  }

  // Pre-load all images inside templates before canvas capture
  for (const element of elements) {
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
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (i > 0) {
      pdf.addPage();
    }

    const canvas = await html2canvas(element, {
      scale: 2, // Sharp typography
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 900,
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight > pdfHeight + 2) {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, imgHeight));
    }
  }

  pdf.save(filename);
  return filename;
}


