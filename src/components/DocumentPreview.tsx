import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Columns2,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Eye,
  FileCheck2,
  Sparkles,
  Download,
  Printer,
  Search,
  BookOpen,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { renderAsync } from 'docx-preview';

interface DocumentPreviewProps {
  docxBlob: Blob | null;
  pdfThumbnails?: string[];
  filename: string;
  downloadUrl?: string | null;
  onDownload?: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  docxBlob,
  pdfThumbnails = [],
  filename,
  downloadUrl,
  onDownload,
}) => {
  const [activeTab, setActiveTab] = useState<'word' | 'split' | 'text'>('word');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedPdfPage, setSelectedPdfPage] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [splitContainerEl, setSplitContainerEl] = useState<HTMLDivElement | null>(null);

  // Render DOCX inside container whenever docxBlob, activeTab, or target container element changes
  useEffect(() => {
    if (!docxBlob) return;
    const target = activeTab === 'word' ? containerEl : activeTab === 'split' ? splitContainerEl : null;
    if (!target) return;

    let isMounted = true;
    setIsRendering(true);
    setRenderError(null);

    const doRender = async () => {
      try {
        target.innerHTML = '';
        await renderAsync(docxBlob, target, undefined, {
          className: 'docx-rendered-document',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
        });

        if (isMounted && target.innerText) {
          setExtractedText(target.innerText.trim());
        }
      } catch (err: any) {
        console.error('docx-preview render error:', err);
        if (isMounted) {
          setRenderError(
            'تعذر عرض المعاينة الرسومية الكاملة لملف Word. يمكنك تنزيل الملف وفتحه في مايكروسوفت وورد مباشرة.'
          );
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    };

    doRender();

    return () => {
      isMounted = false;
    };
  }, [docxBlob, activeTab, containerEl, splitContainerEl]);

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(z + 15, 150));
  const zoomOut = () => setZoomLevel((z) => Math.max(z - 15, 75));
  const resetZoom = () => setZoomLevel(100);

  // Text statistics
  const wordCount = extractedText
    ? extractedText.split(/\s+/).filter((w) => w.length > 0).length
    : 0;
  const charCount = extractedText.length;

  // Filter text by search term if active
  const filteredText = searchTerm
    ? extractedText
        .split('\n')
        .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
        .join('\n')
    : extractedText;

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200 shadow-md transition-all ${
        isFullscreen
          ? 'fixed inset-3 z-50 overflow-hidden flex flex-col shadow-2xl bg-slate-900/40 backdrop-blur-sm'
          : 'relative my-6'
      }`}
    >
      <div className={`bg-white rounded-3xl flex flex-col ${isFullscreen ? 'h-full overflow-hidden' : ''}`}>
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50/90 border-b border-slate-200 rounded-t-3xl">
          {/* Tab switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => setActiveTab('word')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'word'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              معاينة مستند Word
            </button>

            {pdfThumbnails.length > 0 && (
              <button
                onClick={() => setActiveTab('split')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'split'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                مقارنة جنباً إلى جنب (PDF ⟷ Word)
              </button>
            )}

            <button
              onClick={() => setActiveTab('text')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'text'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              النص المستخرج
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Zoom controls */}
            {(activeTab === 'word' || activeTab === 'split') && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-xs">
                <button
                  onClick={zoomOut}
                  title="تصغير"
                  className="text-slate-500 hover:text-slate-900 cursor-pointer p-0.5"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={resetZoom}
                  title="إعادة ضبط الحجم"
                  className="text-[11px] font-semibold text-slate-700 min-w-8 text-center cursor-pointer"
                >
                  {zoomLevel}%
                </button>
                <button
                  onClick={zoomIn}
                  title="تكبير"
                  className="text-slate-500 hover:text-slate-900 cursor-pointer p-0.5"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Print button */}
            <button
              onClick={handlePrint}
              title="طباعة المعاينة"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            {/* Copy button */}
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>نسخ النص</span>
                </>
              )}
            </button>

            {/* Quick download button */}
            {(downloadUrl || onDownload) && (
              <button
                onClick={onDownload}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل Word</span>
              </button>
            )}

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'تصغير الشاشة' : 'معاينة بملء الشاشة'}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 cursor-pointer shadow-xs"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`p-4 bg-slate-100/80 overflow-auto ${isFullscreen ? 'flex-1' : 'max-h-[620px]'}`}>
          {renderError && (
            <div className="p-3 mb-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl text-right">
              {renderError}
            </div>
          )}

          {isRendering && (
            <div className="py-6 flex items-center justify-center text-slate-600 gap-3 bg-blue-50/80 border border-blue-200 rounded-2xl mb-4">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">جارٍ معالجة وتجهيز المعاينة بدقة عالية...</p>
            </div>
          )}

          {/* TAB 1: Single Word View */}
          {activeTab === 'word' && (
            <div className="flex justify-center min-h-[420px]">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="bg-white rounded-2xl shadow-lg p-6 sm:p-12 max-w-3xl w-full border border-slate-200/80 min-h-[550px]"
              >
                <div ref={setContainerEl} className="docx-container text-right" dir="rtl" />
              </div>
            </div>
          )}

          {/* TAB 2: Side-by-Side Split View */}
          {activeTab === 'split' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Right column: Original PDF page */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs text-slate-600 font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <FileText className="w-4 h-4 text-rose-500" />
                    المستند الأصلي (PDF)
                  </span>
                  {pdfThumbnails.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedPdfPage((p) => Math.max(p - 1, 0))}
                        disabled={selectedPdfPage === 0}
                        className="p-1 rounded bg-slate-100 text-slate-600 disabled:opacity-40 cursor-pointer"
                        title="الصفحة السابقة"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {selectedPdfPage + 1} / {pdfThumbnails.length}
                      </span>
                      <button
                        onClick={() => setSelectedPdfPage((p) => Math.min(p + 1, pdfThumbnails.length - 1))}
                        disabled={selectedPdfPage === pdfThumbnails.length - 1}
                        className="p-1 rounded bg-slate-100 text-slate-600 disabled:opacity-40 cursor-pointer"
                        title="الصفحة التالية"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl p-3 min-h-[420px] overflow-auto">
                  {pdfThumbnails[selectedPdfPage] ? (
                    <img
                      src={pdfThumbnails[selectedPdfPage]}
                      alt={`صفحة ${selectedPdfPage + 1}`}
                      className="max-h-[500px] object-contain rounded-lg shadow-md border border-slate-200"
                    />
                  ) : (
                    <div className="text-xs text-slate-400">لا تتوفر صورة مصغرة لهذه الصفحة</div>
                  )}
                </div>
              </div>

              {/* Left column: Converted Word doc */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs text-slate-600 font-bold">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <FileCheck2 className="w-4 h-4 text-blue-600" />
                    مستند Word الناتج (DOCX)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      RTL نشط 100%
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                      جداول قابلة للتعديل
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center',
                  }}
                  className="flex-1 bg-white rounded-xl p-4 overflow-auto min-h-[420px]"
                >
                  <div ref={setSplitContainerEl} className="docx-container text-right" dir="rtl" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Extracted Text View */}
          {activeTab === 'text' && !isRendering && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-right space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  النصوص المستخرجة من المستند مع إحصائيات الدقة:
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-mono text-[11px]">
                    {wordCount} كلمة
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-mono text-[11px]">
                    {charCount} حرف
                  </span>
                </div>
              </div>

              {/* Search Bar within text */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث في نصوص المستند المستخرجة..."
                  className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-right"
                />
              </div>

              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed max-h-[420px] overflow-auto select-all p-4 bg-slate-50 rounded-xl border border-slate-200">
                {filteredText || (searchTerm ? 'لم يتم العثور على نتائج للبحث.' : 'جارٍ قراءة النصوص...')}
              </pre>
            </div>
          )}
        </div>

        {/* Footer bar of preview */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 rounded-b-3xl text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">
              المعاينة تعكس تنسيق الجداول والخطوط العربية واتجاه RTL الفعلي داخل ملف Word.
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              جاهز للتحرير والطباعة
            </span>
            <span>•</span>
            <span className="truncate max-w-[200px]">{filename}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
