/**
 * Utility functions for file formatting, validation, and page ranges.
 */

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1));
  return `${num} ${sizes[i]}`;
}

export function isPdfFile(filename: string): boolean {
  if (!filename) return false;
  return /\.pdf$/i.test(filename.trim());
}

export function sanitizeDocxFilename(pdfFilename: string): string {
  if (!pdfFilename) return 'converted_document.docx';
  const cleanName = pdfFilename.replace(/\.pdf$/i, '').trim();
  const safeName = cleanName.replace(/[/\\?%*:|"<>]/g, '_') || 'document';
  return `${safeName}.docx`;
}

export interface PageRangeParsed {
  isValid: boolean;
  start?: number; // 0-indexed inclusive
  end?: number;   // 0-indexed exclusive
  error?: string;
}

export function parsePageRange(rangeStr: string, totalPages: number): PageRangeParsed {
  const trimmed = rangeStr.trim();
  if (!trimmed || trimmed === 'all' || trimmed === 'الكل') {
    return { isValid: true, start: 0, end: totalPages };
  }

  // formats: "1-5", "3", "2-10"
  const match = trimmed.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) {
    return { isValid: false, error: 'صيغة نطاق الصفحات غير صحيحة. مثال: 1-5 أو 3' };
  }

  const p1 = parseInt(match[1], 10);
  const p2 = match[2] ? parseInt(match[2], 10) : p1;

  if (p1 < 1 || p2 < 1) {
    return { isValid: false, error: 'أرقام الصفحات يجب أن تبدأ من 1' };
  }

  if (p1 > p2) {
    return { isValid: false, error: 'رقم صفحة البداية يجب أن يكون أقل من النهاية' };
  }

  if (p1 > totalPages) {
    return { isValid: false, error: `الصفحة ${p1} تتجاوز إجمالي صفحات الملف (${totalPages})` };
  }

  const boundedP2 = Math.min(p2, totalPages);
  return {
    isValid: true,
    start: p1 - 1,
    end: boundedP2,
  };
}
