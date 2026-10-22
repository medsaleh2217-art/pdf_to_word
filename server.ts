import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { convertScannedPdfWithOcr } from './server/ocr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

const MAX_MB = parseInt(process.env.MAX_MB || '35', 10);
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '80', 10);
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '200', 10);

// Enable CORS for all origins, methods, and exposed headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Disposition', 'X-Pages-Converted', 'X-Arabic-Fixed', 'X-Strategy'],
}));

// Generous body parsing limits
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Setup multer temporary upload directory
const tempDir = path.join(os.tmpdir(), 'pdf2word_uploads');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const upload = multer({
  dest: tempDir,
  limits: {
    fileSize: MAX_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('الملف يجب أن يكون بصيغة PDF فقط.'));
    }
  },
});

// In-memory rate limiter per IP
const hits = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let timestamps = hits.get(ip) || [];
  timestamps = timestamps.filter(t => now - t < RATE_WINDOW_MS);
  hits.set(ip, timestamps);

  if (timestamps.length >= RATE_LIMIT) {
    const earliest = timestamps[0];
    const waitMinutes = Math.ceil((RATE_WINDOW_MS - (now - earliest)) / 60000);
    return res.status(429).json({
      error: `وصلت للحد الأقصى من التحويلات مؤقتاً. يرجى المحاولة بعد ${waitMinutes} دقيقة.`,
    });
  }
  timestamps.push(now);
  next();
}

// Health check
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Serve static assets from public/ folder directly with CORS
app.use(express.static(path.join(__dirname, 'public')));
app.use('/samples', express.static(path.join(__dirname, 'public', 'samples')));

// App configuration & limits
app.get('/api/limits', (_req, res) => {
  res.json({
    max_mb: MAX_MB,
    max_pages: MAX_PAGES,
    rate_limit: RATE_LIMIT,
  });
});

// Dedicated endpoint to download sample PDF
app.get('/api/sample-pdf', (_req, res) => {
  const samplePath = path.join(__dirname, 'public', 'samples', 'sample_arabic_document.pdf');
  if (fs.existsSync(samplePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="sample_arabic_document.pdf"');
    fs.createReadStream(samplePath).pipe(res);
  } else {
    res.status(404).json({ error: 'الملف غير موجود' });
  }
});

// Helper to run python script
function runPython(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const pythonBin = '/usr/bin/python3.11';
    const py = spawn(pythonBin, args);
    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });

    py.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}

function decodeMulterFilename(name: string): string {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

// Inspect PDF metadata endpoint
app.post('/api/inspect', upload.single('file'), async (req: Request, res: Response) => {
  req.setTimeout(120000); // 2 minutes timeout
  res.setTimeout(120000);

  if (!req.file) {
    return res.status(400).json({ error: 'لم يتم استلام أي ملف PDF.' });
  }

  const uploadedPath = req.file.path;
  try {
    const converterScript = path.join(__dirname, 'server', 'converter.py');
    const result = await runPython([converterScript, '--info', uploadedPath]);

    const lines = result.stdout.trim().split('\n');
    let info = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        info = JSON.parse(lines[i]);
        break;
      } catch {
        // ignore
      }
    }

    if (!info) {
      return res.status(400).json({
        error: result.stderr.trim() || 'تعذر فحص محتويات ملف PDF.',
      });
    }

    if (info.error) {
      return res.status(400).json({ error: info.error });
    }

    return res.json(info);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'حدث خطأ غير متوقع أثناء فحص الملف.' });
  } finally {
    fs.unlink(uploadedPath, () => {});
  }
});

// Convert PDF to DOCX endpoint
app.post('/api/convert', checkRateLimit, upload.single('file'), async (req: Request, res: Response) => {
  req.setTimeout(300000); // 5 minutes timeout for heavy conversion
  res.setTimeout(300000);

  if (!req.file) {
    return res.status(400).json({ error: 'لم يتم استلام ملف PDF صالح.' });
  }

  const inputPdfPath = req.file.path;
  const rawOriginalName = req.file.originalname || 'document.pdf';
  const originalName = decodeMulterFilename(rawOriginalName);
  const stem = path.basename(originalName, path.extname(originalName)) || 'document';
  const outDocxPath = path.join(tempDir, `out_${Date.now()}_${Math.random().toString(36).slice(2)}.docx`);

  const startPage = parseInt(req.body.startPage || '0', 10);
  const endPage = req.body.endPage ? parseInt(req.body.endPage, 10) : undefined;
  const fixArabic = req.body.fixArabic !== 'false';
  const forceOcr = req.body.useOcr === 'true';

  try {
    // If OCR is explicitly requested, run the Gemini OCR engine
    if (forceOcr) {
      const ocrResult = await convertScannedPdfWithOcr(inputPdfPath, outDocxPath, startPage, endPage);
      if (!ocrResult.success || !fs.existsSync(outDocxPath)) {
        throw new Error(ocrResult.error || 'فشلت معالجة التعرف الضوئي على النصوص (OCR).');
      }

      const safeFilename = encodeURIComponent(stem.trim()) + '.docx';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="document.docx"; filename*=UTF-8''${safeFilename}`);
      res.setHeader('X-Pages-Converted', ocrResult.pages_converted.toString());
      res.setHeader('X-Strategy', 'gemini_ocr');

      const fileStream = fs.createReadStream(outDocxPath);
      fileStream.pipe(res);
      fileStream.on('close', () => {
        fs.unlink(outDocxPath, () => {});
        fs.unlink(inputPdfPath, () => {});
      });
      return;
    }

    // Otherwise, run resilient converter with auto-fallback
    const converterScript = path.join(__dirname, 'server', 'converter.py');
    const args = [
      converterScript,
      '--convert',
      '--input', inputPdfPath,
      '--output', outDocxPath,
      '--start', startPage.toString(),
    ];
    if (endPage) {
      args.push('--end', endPage.toString());
    }
    if (!fixArabic) {
      args.push('--no-arabic-fix');
    }

    const { stdout, stderr, code } = await runPython(args);

    const lines = stdout.trim().split('\n');
    let resultJson = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        resultJson = JSON.parse(lines[i]);
        break;
      } catch {
        // skip
      }
    }

    // If python failed or file wasn't created, try OCR as an automatic emergency fallback if key exists
    if ((code !== 0 || !fs.existsSync(outDocxPath)) && process.env.GEMINI_API_KEY) {
      try {
        const ocrFallback = await convertScannedPdfWithOcr(inputPdfPath, outDocxPath, startPage, endPage);
        if (ocrFallback.success && fs.existsSync(outDocxPath)) {
          const safeFilename = encodeURIComponent(stem.trim()) + '.docx';
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', `attachment; filename="document.docx"; filename*=UTF-8''${safeFilename}`);
          res.setHeader('X-Pages-Converted', ocrFallback.pages_converted.toString());
          res.setHeader('X-Strategy', 'auto_ocr_fallback');

          const fileStream = fs.createReadStream(outDocxPath);
          fileStream.pipe(res);
          fileStream.on('close', () => {
            fs.unlink(outDocxPath, () => {});
            fs.unlink(inputPdfPath, () => {});
          });
          return;
        }
      } catch {
        // proceed
      }
    }

    if (code !== 0 || !fs.existsSync(outDocxPath)) {
      const errMsg = resultJson?.error || 'فشل تحويل الملف. يرجى التأكد من أن المستند غير محمي بكلمة مرور وصالح للقراءة.';
      return res.status(500).json({ error: errMsg });
    }

    // Set download headers
    const safeFilename = encodeURIComponent(stem.trim()) + '.docx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="document.docx"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('X-Pages-Converted', resultJson?.pages_converted?.toString() || '1');
    res.setHeader('X-Arabic-Fixed', resultJson?.arabic_fixed ? 'true' : 'false');
    res.setHeader('X-Strategy', resultJson?.strategy || 'standard');

    const fileStream = fs.createReadStream(outDocxPath);
    fileStream.pipe(res);

    fileStream.on('close', () => {
      fs.unlink(outDocxPath, () => {});
      fs.unlink(inputPdfPath, () => {});
    });

    fileStream.on('error', () => {
      fs.unlink(outDocxPath, () => {});
      fs.unlink(inputPdfPath, () => {});
    });
  } catch (err: any) {
    fs.unlink(outDocxPath, () => {});
    fs.unlink(inputPdfPath, () => {});
    return res.status(500).json({ error: err.message || 'حدث خطأ في معالجة الملف.' });
  }
});

// One-click convert sample document
app.post('/api/convert-sample', async (_req: Request, res: Response) => {
  const samplePdfPath = path.join(__dirname, 'public', 'samples', 'sample_arabic_document.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    return res.status(404).json({ error: 'الملف التجريبي غير متاح حالياً.' });
  }

  const outDocxPath = path.join(tempDir, `sample_${Date.now()}.docx`);
  try {
    const converterScript = path.join(__dirname, 'server', 'converter.py');
    const { code } = await runPython([
      converterScript,
      '--convert',
      '--input', samplePdfPath,
      '--output', outDocxPath,
    ]);

    if (code !== 0 || !fs.existsSync(outDocxPath)) {
      return res.status(500).json({ error: 'فشل تحويل الملف التجريبي.' });
    }

    const safeFilename = encodeURIComponent('تقرير_وعقد_تجريبي_2026.docx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="document.docx"; filename*=UTF-8''${safeFilename}`);

    const fileStream = fs.createReadStream(outDocxPath);
    fileStream.pipe(res);
    fileStream.on('close', () => {
      fs.unlink(outDocxPath, () => {});
    });
  } catch (err: any) {
    fs.unlink(outDocxPath, () => {});
    return res.status(500).json({ error: err.message || 'خطأ في معالجة النموذج التجريبي' });
  }
});

// Centralized error-handling middleware (prevents unhandled drops)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `حجم الملف كبير جداً. الحد الأقصى هو ${MAX_MB} ميغابايت.` });
    }
    return res.status(400).json({ error: `خطأ أثناء رفع الملف: ${err.message}` });
  }
  return res.status(500).json({ error: err.message || 'حدث خطأ في الخادم.' });
});

// Vite middleware or static serving
async function setupViteOrStatic() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
