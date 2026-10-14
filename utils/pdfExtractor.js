const pdfParse = require('pdf-parse');

const MAX_PDF_TEXT_LEN = 50000;

/**
 * Extract clean text from a PDF Buffer.
 * @param {Buffer} buffer 
 * @param {string} sourceName 
 * @returns {Promise<{text: string, rawText: string, numPages: number, info: any}>}
 */
async function extractTextFromPdfBuffer(buffer, sourceName = 'Uploaded PDF') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid PDF buffer provided.');
  }

  const pdfData = await pdfParse(buffer);
  let text = (pdfData.text || '').replace(/\s+/g, ' ').trim();
  if (text.length > MAX_PDF_TEXT_LEN) {
    text = text.substring(0, MAX_PDF_TEXT_LEN) + '...';
  }

  return {
    text: `[Source: PDF Document - ${sourceName}]\n${text}`,
    rawText: text,
    numPages: pdfData.numpages || 1,
    info: pdfData.info || {},
  };
}

/**
 * Helper to normalize incoming base64 or Data URL to a Buffer
 * @param {string} base64OrDataUrl
 * @returns {Buffer}
 */
function parseBase64ToBuffer(base64OrDataUrl) {
  if (!base64OrDataUrl || typeof base64OrDataUrl !== 'string') {
    throw new Error('Invalid base64 payload.');
  }
  // Strip "data:application/pdf;base64," or generic data URI prefixes if present
  const base64Index = base64OrDataUrl.indexOf(';base64,');
  const base64Clean = base64Index !== -1 
    ? base64OrDataUrl.substring(base64Index + 8) 
    : base64OrDataUrl.replace(/^data:[^;]+;base64,/, '');

  return Buffer.from(base64Clean, 'base64');
}

module.exports = {
  extractTextFromPdfBuffer,
  parseBase64ToBuffer,
};
