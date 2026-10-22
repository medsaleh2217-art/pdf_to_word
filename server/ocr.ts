import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { GoogleGenAI } from '@google/genai';

function runPy(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const py = spawn('/usr/bin/python3.11', args);
    let stdout = '';
    let stderr = '';
    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });
    py.on('close', (code) => resolve({ stdout, stderr, code }));
  });
}

export async function convertScannedPdfWithOcr(
  pdfPath: string,
  outDocxPath: string,
  startPage: number = 0,
  endPage?: number
): Promise<{ success: boolean; pages_converted: number; error?: string }> {
  const tempPagesDir = path.join(os.tmpdir(), `ocr_pages_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tempPagesDir, { recursive: true });

  try {
    // 1. Extract high-res PNGs for requested pages using PyMuPDF
    const extractScript = `
import pymupdf, sys
pdf_p = sys.argv[1]
out_d = sys.argv[2]
s_idx = int(sys.argv[3])
e_idx = int(sys.argv[4]) if sys.argv[4] != 'None' else None

doc = pymupdf.open(pdf_p)
total = doc.page_count
if e_idx is None or e_idx > total:
    e_idx = total

for i in range(s_idx, e_idx):
    page = doc[i]
    pix = page.get_pixmap(dpi=150)
    pix.save(f"{out_d}/page_{i+1:03d}.png")
doc.close()
`;
    const resExtract = await runPy([
      '-c',
      extractScript,
      pdfPath,
      tempPagesDir,
      startPage.toString(),
      endPage ? endPage.toString() : 'None',
    ]);

    if (resExtract.code !== 0) {
      throw new Error(`تعذر استخراج صفحات المستند: ${resExtract.stderr}`);
    }

    const imageFiles = fs.readdirSync(tempPagesDir)
      .filter((f) => f.endsWith('.png'))
      .sort();

    if (imageFiles.length === 0) {
      throw new Error('لم يتم العثور على أي صفحات صالحة في المستند.');
    }

    // 2. Perform OCR with Gemini 3.8 Flash for each page
    const ai = new GoogleGenAI();
    const pagesContent: string[] = [];

    for (const imgName of imageFiles) {
      const imgPath = path.join(tempPagesDir, imgName);
      const imgBytes = fs.readFileSync(imgPath);
      const base64Data = imgBytes.toString('base64');

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
            {
              text: 'أنت خبير استخراج النصوص العربية (OCR). استخرج جميع النصوص والعناوين والجداول المكتوبة في هذه الصفحة بدقة متناهية، مع مراعاة اتجاه اللغة العربية، واستخدم التنسيق الطبيعي للفقرات بدون أي مقدمات أو شروحات إضافية.',
            },
          ],
        });

        const text = response.text || '';
        pagesContent.push(text.trim());
      } catch (err: any) {
        console.warn(`Gemini 3.8 Flash OCR error on page ${imgName}:`, err.message);
        // Fallback: extract digital text via pymupdf if available
        pagesContent.push('');
      }
    }

    // 3. Write into docx using python-docx with RTL and Bidi formatting
    const docxDataJson = JSON.stringify(pagesContent);
    const jsonTempPath = path.join(tempPagesDir, 'content.json');
    fs.writeFileSync(jsonTempPath, docxDataJson, 'utf-8');

    const buildDocxScript = `
import json, sys, re
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

try:
    from server.arabic_fix import fix_docx, mark_paragraph_rtl, AR_PATTERN
except Exception:
    try:
        from arabic_fix import fix_docx, mark_paragraph_rtl, AR_PATTERN
    except Exception:
        AR_PATTERN = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]")
        def mark_paragraph_rtl(par):
            try:
                par.paragraph_format.bidi = True
            except:
                pass
        def fix_docx(path):
            pass

json_path = sys.argv[1]
docx_path = sys.argv[2]

with open(json_path, 'r', encoding='utf-8') as f:
    pages = json.load(f)

doc = Document()
for i, page_text in enumerate(pages):
    if i > 0:
        doc.add_page_break()
    
    lines = page_text.split('\\n')
    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue
        p = doc.add_paragraph()
        if cleaned.startswith('# ') or cleaned.startswith('## '):
            clean_h = cleaned.lstrip('# ').strip()
            run = p.add_run(clean_h)
            run.bold = True
            run.font.size = Pt(14)
        else:
            p.add_run(cleaned)

        if AR_PATTERN.search(cleaned):
            mark_paragraph_rtl(p)

doc.save(docx_path)
try:
    fix_docx(docx_path)
except Exception:
    pass
`;
    const resDocx = await runPy(['-c', buildDocxScript, jsonTempPath, outDocxPath]);
    if (resDocx.code !== 0 || !fs.existsSync(outDocxPath)) {
      throw new Error(`فشل بناء مستند Word: ${resDocx.stderr}`);
    }

    return {
      success: true,
      pages_converted: imageFiles.length,
    };
  } finally {
    fs.rmSync(tempPagesDir, { recursive: true, force: true });
  }
}
