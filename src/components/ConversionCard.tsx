import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileCheck,
  Download,
  RotateCcw,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Layers,
  Sparkles,
  ShieldCheck,
  ScanLine,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { DropZone } from './DropZone';
import { DocumentPreview } from './DocumentPreview';
import { formatFileSize, parsePageRange } from '../utils/fileFormat';

interface ConversionCardProps {
  maxMb: number;
  maxPages: number;
  onTrySampleRequested?: () => void;
  externalFile?: File | null;
  onClearExternalFile?: () => void;
}

export type ConversionStatus = 'idle' | 'inspecting' | 'ready' | 'converting' | 'success' | 'error';

interface PdfMeta {
  pages: number;
  has_arabic: boolean;
  arabic_ratio: number;
  sample_preview: string;
  is_scanned: boolean;
  is_encrypted: boolean;
  title?: string;
  page_thumbnails?: string[];
}

export const ConversionCard: React.FC<ConversionCardProps> = ({
  maxMb,
  maxPages,
  externalFile,
  onClearExternalFile,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfMeta, setPdfMeta] = useState<PdfMeta | null>(null);

  // Settings
  const [fixArabic, setFixArabic] = useState<boolean>(true);
  const [useOcr, setUseOcr] = useState<boolean>(false);
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('');
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Pre-conversion page preview carousel
  const [currentPdfPageIndex, setCurrentPdfPageIndex] = useState<number>(0);
  const [showPdfPageViewer, setShowPdfPageViewer] = useState<boolean>(true);

  // Conversion Progress & Result
  const [progressStage, setProgressStage] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [outputSize, setOutputSize] = useState<number>(0);
  const [pagesConverted, setPagesConverted] = useState<number>(1);
  const [usedStrategy, setUsedStrategy] = useState<string>('');

  // When external file (like sample) is passed from parent
  useEffect(() => {
    if (externalFile) {
      handleFileSelected(externalFile);
    }
  }, [externalFile]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const resetAll = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setFile(null);
    setStatus('idle');
    setErrorMessage(null);
    setPdfMeta(null);
    setDownloadUrl(null);
    setDocxBlob(null);
    setOutputFilename('');
    setOutputSize(0);
    setProgressPercent(0);
    setProgressStage(1);
    setCustomRange('');
    setRangeError(null);
    setUseOcr(false);
    setCurrentPdfPageIndex(0);
    if (onClearExternalFile) {
      onClearExternalFile();
    }
  };

  const inspectUploadedPdf = async (selectedFile: File) => {
    setStatus('inspecting');
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/inspect', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'تعذر قراءة ملف PDF.');
      }

      setPdfMeta(data);

      if (data.is_encrypted) {
        setErrorMessage('الملف محمي بكلمة مرور. يرجى إزالة الحماية أولاً ثم إعادة المحاولة.');
        setStatus('error');
        return;
      }

      if (data.pages > maxPages) {
        setErrorMessage(
          `عدد صفحات هذا الملف (${data.pages} صفحة) يتجاوز الحد الأقصى المسموح به حالياً وهو ${maxPages} صفحة.`
        );
        setStatus('error');
        return;
      }

      // If document is scanned, enable OCR automatically
      if (data.is_scanned) {
        setUseOcr(true);
      }

      setStatus('ready');
    } catch (_err: any) {
      // Fallback gracefully so user can proceed directly to conversion
      setPdfMeta({
        pages: 1,
        has_arabic: true,
        arabic_ratio: 0.5,
        sample_preview: '',
        is_scanned: false,
        is_encrypted: false,
      });
      setStatus('ready');
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setFile(selectedFile);
    inspectUploadedPdf(selectedFile);
  };

  const handleStartConversion = async (overrideOcr?: boolean) => {
    if (!file) return;

    const activeOcr = overrideOcr !== undefined ? overrideOcr : useOcr;

    // Validate page range if custom
    let startPage = 0;
    let endPage: number | undefined = undefined;

    if (pageRangeMode === 'custom' && pdfMeta) {
      const parsed = parsePageRange(customRange, pdfMeta.pages);
      if (!parsed.isValid) {
        setRangeError(parsed.error || 'صيغة النطاق غير صالحة');
        return;
      }
      setRangeError(null);
      startPage = parsed.start || 0;
      endPage = parsed.end;
    }

    setStatus('converting');
    setErrorMessage(null);
    setProgressStage(1);
    setProgressPercent(15);

    // Multi-stage simulated visual tracker
    const timer1 = setTimeout(() => {
      setProgressStage(2);
      setProgressPercent(45);
    }, 400);

    const timer2 = setTimeout(() => {
      setProgressStage(3);
      setProgressPercent(75);
    }, 1100);

    const timer3 = setTimeout(() => {
      setProgressStage(4);
      setProgressPercent(90);
    }, 1800);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('startPage', startPage.toString());
    if (endPage) {
      formData.append('endPage', endPage.toString());
    }
    formData.append('fixArabic', fixArabic ? 'true' : 'false');
    formData.append('useOcr', activeOcr ? 'true' : 'false');

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!res.ok) {
        let errMsg = 'حدث خطأ أثناء معالجة الملف.';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      setDocxBlob(blob);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      const cleanBase = file.name.replace(/\.pdf$/i, '');
      const finalDocxName = `${cleanBase}.docx`;
      setOutputFilename(finalDocxName);
      setOutputSize(blob.size);

      const headerPages = res.headers.get('X-Pages-Converted');
      setPagesConverted(headerPages ? parseInt(headerPages, 10) : pdfMeta?.pages || 1);
      setUsedStrategy(res.headers.get('X-Strategy') || 'standard');

      setProgressPercent(100);
      setStatus('success');
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      let userMsg = err.message || 'فشل التحويل. يرجى التأكد من أن الملف سليم والمحاولة مرة أخرى.';
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        userMsg = 'تعذر الاتصال بالخادم لإتمام التحويل (قد يكون بسبب انقطاع الاتصال أو بطء الشبكة). يرجى الضغط على زر إعادة المحاولة أدناه.';
      }
      setErrorMessage(userMsg);
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = outputFilename || 'document.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mb-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle top decoration bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />

        {/* 1. IDLE STATE: Show DropZone */}
        {status === 'idle' && (
          <DropZone
            onFileSelected={handleFileSelected}
            maxMb={maxMb}
            maxPages={maxPages}
          />
        )}

        {/* 2. INSPECTING STATE */}
        {status === 'inspecting' && (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">جارٍ فحص وتحليل صفحات ملف PDF...</h3>
            <p className="text-sm text-slate-500">
              يتم استخراج المعاينة الرسومية وتوليد صور الصفحات وفحص التنسيقات العربية.
            </p>
          </div>
        )}

        {/* 3. READY STATE: File inspected and ready for settings / conversion */}
        {status === 'ready' && file && pdfMeta && (
          <div className="space-y-6">
            {/* File info card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-slate-900 text-base line-clamp-1" title={file.name}>
                    {file.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">{pdfMeta.pages} {pdfMeta.pages === 1 ? 'صفحة' : 'صفحات'}</span>
                    {pdfMeta.has_arabic && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          نص عربي
                        </span>
                      </>
                    )}
                    {pdfMeta.is_scanned && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium border border-amber-200">
                          <ScanLine className="w-3 h-3" />
                          مستند ممسوح / صور
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {pdfMeta.page_thumbnails && pdfMeta.page_thumbnails.length > 0 && (
                  <button
                    onClick={() => setShowPdfPageViewer(!showPdfPageViewer)}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showPdfPageViewer ? 'إخفاء المعاينة' : 'معاينة الصفحات'}
                  </button>
                )}
                <button
                  onClick={resetAll}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  تغيير الملف
                </button>
              </div>
            </div>

            {/* PRE-CONVERSION INTERACTIVE PDF PAGE VIEWER */}
            {showPdfPageViewer && pdfMeta.page_thumbnails && pdfMeta.page_thumbnails.length > 0 && (
              <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-600" />
                    معاينة صفحات PDF الأصلية (عالية الدقة):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPdfPageIndex <= 0}
                      onClick={() => setCurrentPdfPageIndex((i) => Math.max(i - 1, 0))}
                      className="p-1 rounded bg-white border border-slate-300 disabled:opacity-40 cursor-pointer text-slate-700"
                      title="الصفحة السابقة"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-slate-600 font-mono text-[11px]">
                      صفحة {currentPdfPageIndex + 1} من {pdfMeta.page_thumbnails.length}
                    </span>
                    <button
                      disabled={currentPdfPageIndex >= pdfMeta.page_thumbnails.length - 1}
                      onClick={() => setCurrentPdfPageIndex((i) => Math.min(i + 1, pdfMeta.page_thumbnails!.length - 1))}
                      className="p-1 rounded bg-white border border-slate-300 disabled:opacity-40 cursor-pointer text-slate-700"
                      title="الصفحة التالية"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main active page image */}
                <div className="flex justify-center items-center bg-white p-3 rounded-xl border border-slate-200 min-h-[300px]">
                  <img
                    src={pdfMeta.page_thumbnails[currentPdfPageIndex]}
                    alt={`معاينة صفحة ${currentPdfPageIndex + 1}`}
                    className="max-h-[380px] object-contain rounded shadow-sm border border-slate-200"
                  />
                </div>

                {/* Miniature strip of page thumbnails */}
                {pdfMeta.page_thumbnails.length > 1 && (
                  <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                    {pdfMeta.page_thumbnails.map((thumb, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPdfPageIndex(idx)}
                        className={`p-1 rounded-lg border-2 transition-all cursor-pointer ${
                          currentPdfPageIndex === idx
                            ? 'border-blue-600 shadow-sm scale-105 bg-blue-50'
                            : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                        }`}
                      >
                        <img src={thumb} alt={`صفحة ${idx + 1}`} className="w-12 h-16 object-cover rounded" />
                        <span className="block text-[10px] text-center font-bold text-slate-600 mt-0.5">{idx + 1}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scanned Document Alert Notice */}
            {pdfMeta.is_scanned && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                <ScanLine className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-right">
                  <p className="font-bold text-amber-900">مستند مصور / ممسوح ضوئياً:</p>
                  <p className="mt-0.5 text-amber-700">
                    تم تفعيل وضع استخراج النصوص الذكي (AI OCR) لتحويل الصور والمستندات المصورة إلى نصوص وجداول Word حقيقية وقابلة للتعديل.
                  </p>
                </div>
              </div>
            )}

            {/* Sample text preview if available */}
            {pdfMeta.sample_preview && (
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                  <Eye className="w-3.5 h-3.5" />
                  معاينة مقتطف من محتوى الملف:
                </div>
                <p className="line-clamp-2 italic text-slate-600 leading-relaxed font-sans">
                  "{pdfMeta.sample_preview}"
                </p>
              </div>
            )}

            {/* Advanced Conversion Options */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Settings2 className="w-4 h-4 text-blue-600" />
                خيارات وتخصيص التحويل:
              </div>

              {/* Arabic RTL & Ligature Fix Switch */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={fixArabic}
                  onChange={(e) => setFixArabic(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="text-right">
                  <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    إصلاح وتصحيح النصوص العربية (RTL & Ligatures)
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">موصى به</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    يصحح انعكاس الحروف (مثل اللام-ألف "لا")، ويضبط محاذاة الفقرات من اليمين إلى اليسار في Word.
                  </p>
                </div>
              </label>

              {/* AI OCR Toggle */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useOcr}
                  onChange={(e) => setUseOcr(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="text-right">
                  <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    التعرف الضوئي بالذكاء الاصطناعي (AI OCR)
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">للصور والمستندات الممسوحة</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    يتعرف على النصوص العربية المكتوبة داخل الصور والشهادات الورقية ويحولها لنصوص حقيقية.
                  </p>
                </div>
              </label>

              {/* Page Range Selection */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  نطاق الصفحات المراد تحويلها:
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pageRange"
                      checked={pageRangeMode === 'all'}
                      onChange={() => {
                        setPageRangeMode('all');
                        setRangeError(null);
                      }}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-slate-700">تحويل كامل الصفحات ({pdfMeta.pages} صفحة)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pageRange"
                      checked={pageRangeMode === 'custom'}
                      onChange={() => setPageRangeMode('custom')}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-slate-700">تحديد صفحات معينة</span>
                  </label>
                </div>

                {pageRangeMode === 'custom' && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 max-w-xs">
                      <input
                        type="text"
                        value={customRange}
                        onChange={(e) => {
                          setCustomRange(e.target.value);
                          setRangeError(null);
                        }}
                        placeholder={`مثال: 1-5 أو 2 (حتى ${pdfMeta.pages})`}
                        className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    {rangeError && (
                      <p className="text-xs text-red-600 mt-1">{rangeError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => handleStartConversion()}
                className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                تحويل إلى مستند Word الآن
              </button>

              <button
                onClick={resetAll}
                className="w-full sm:w-auto py-3 px-5 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* 4. CONVERTING STATE */}
        {status === 'converting' && (
          <div className="py-8 px-2 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 mb-3 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                {useOcr ? 'جارٍ استخراج النصوص وقراءة المستند بالذكاء الاصطناعي...' : 'جارٍ تحويل الملف إلى Word...'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                نستخدم خوارزميات ذكية لاستخراج النصوص والجداول وتوجيه اللغة العربية بدقة.
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Step indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  progressStage >= 1
                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                1. فحص الهيكلية
              </div>
              <div
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  progressStage >= 2
                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                2. استخراج الجداول والنصوص
              </div>
              <div
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  progressStage >= 3
                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                3. معالجة النصوص العربية
              </div>
              <div
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  progressStage >= 4
                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                4. بناء ملف docx
              </div>
            </div>
          </div>
        )}

        {/* 5. SUCCESS STATE */}
        {status === 'success' && downloadUrl && (
          <div className="py-4 space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-1">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                تم تحويل ملفك بنجاح! 🎉
              </h3>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                أصبح المستند جاهزاً للتنزيل والتعديل بصيغة Microsoft Word مع الحفاظ على التنسيقات وتوجيه النصوص العربية.
              </p>
            </div>

            {/* Converted file metadata badge */}
            <div className="inline-flex flex-wrap items-center justify-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold text-slate-900">{outputFilename}</span>
              <span>•</span>
              <span>الحجم: {formatFileSize(outputSize)}</span>
              <span>•</span>
              <span>الصفحات المعالجة: {pagesConverted}</span>
              {usedStrategy && (
                <>
                  <span>•</span>
                  <span className="text-blue-700 font-medium">الوضع: {usedStrategy === 'gemini_ocr' ? 'ذكاء اصطناعي OCR' : 'تخطيط عالي الدقة'}</span>
                </>
              )}
            </div>

            {/* Big Download Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                onClick={handleDownload}
                className="w-full py-4 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
              >
                <Download className="w-5 h-5" />
                تحميل ملف Word (.docx)
              </button>
            </div>

            {/* Convert another file */}
            <div>
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                تحويل ملف PDF آخر
              </button>
            </div>

            {/* EXCELLENT INTERACTIVE WORD DOCUMENT PREVIEW COMPONENT */}
            <div className="text-right pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  معاينة ممتازة للمستند (Word Preview):
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  معاينة حية ومباشرة لتنسيق الجداول والنصوص العربية
                </span>
              </div>

              <DocumentPreview
                docxBlob={docxBlob}
                pdfThumbnails={pdfMeta?.page_thumbnails}
                filename={outputFilename}
                downloadUrl={downloadUrl}
                onDownload={handleDownload}
              />
            </div>

            {/* Privacy footnote */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>تم حذف الملفات المؤقتة من الخادم لضمان خصوصيتك وأمان بياناتك.</span>
            </div>
          </div>
        )}

        {/* 6. ERROR STATE */}
        {status === 'error' && (
          <div className="py-6 space-y-5 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 text-red-600 mb-1">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">تعذر إكمال التحويل بالوضع المعتاد</h3>
              <p className="text-sm text-red-600 max-w-lg mx-auto bg-red-50 p-3.5 rounded-xl border border-red-200 text-right leading-relaxed">
                {errorMessage || 'حدث خطأ غير متوقع أثناء المعالجة.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {file && (
                <button
                  onClick={() => handleStartConversion(true)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  المحاولة بالذكاء الاصطناعي (AI OCR)
                </button>
              )}
              <button
                onClick={resetAll}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                اختيار ملف آخر
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
