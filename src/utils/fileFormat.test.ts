import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFileSize, isPdfFile, sanitizeDocxFilename, parsePageRange } from './fileFormat';

test('formatFileSize formats byte sizes correctly', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(1048576), '1 MB');
  assert.equal(formatFileSize(15 * 1048576), '15 MB');
});

test('isPdfFile checks for pdf extension', () => {
  assert.equal(isPdfFile('contract.pdf'), true);
  assert.equal(isPdfFile('REPORT.PDF'), true);
  assert.equal(isPdfFile('document.docx'), false);
  assert.equal(isPdfFile(''), false);
});

test('sanitizeDocxFilename creates proper docx names', () => {
  assert.equal(sanitizeDocxFilename('report.pdf'), 'report.docx');
  assert.equal(sanitizeDocxFilename('عقد_العمل.pdf'), 'عقد_العمل.docx');
  assert.equal(sanitizeDocxFilename(''), 'converted_document.docx');
});

test('parsePageRange handles all and empty ranges', () => {
  assert.deepEqual(parsePageRange('', 10), { isValid: true, start: 0, end: 10 });
  assert.deepEqual(parsePageRange('all', 5), { isValid: true, start: 0, end: 5 });
  assert.deepEqual(parsePageRange('الكل', 8), { isValid: true, start: 0, end: 8 });
});

test('parsePageRange handles custom ranges', () => {
  const r1 = parsePageRange('1-5', 20);
  assert.equal(r1.isValid, true);
  assert.equal(r1.start, 0);
  assert.equal(r1.end, 5);

  const r2 = parsePageRange('3', 10);
  assert.equal(r2.isValid, true);
  assert.equal(r2.start, 2);
  assert.equal(r2.end, 3);

  const rInvalid = parsePageRange('10-5', 20);
  assert.equal(rInvalid.isValid, false);
});
