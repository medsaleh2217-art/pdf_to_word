import React from 'react';
import { FileText, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface HeaderProps {
  maxMb: number;
  maxPages: number;
  onTrySample: () => void;
  isProcessingSample: boolean;
}

export const Header: React.FC<HeaderProps> = ({ maxMb, maxPages, onTrySample, isProcessingSample }) => {
  return (
    <header className="pt-8 pb-6 text-center max-w-4xl mx-auto px-4">
      {/* Top badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          معالج ذكي مخصص للغة العربية
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          مجاني 100% وبدون تسجيل
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          حتى {maxMb} ميغابايت · {maxPages} صفحة
        </span>
      </div>

      {/* Main Brand Logo & Title */}
      <div className="inline-flex items-center justify-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
          <FileText className="w-7 h-7" />
        </div>
        <div className="text-right">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            محوّل <span className="text-blue-600">PDF</span> إلى <span className="text-indigo-600">Word</span> الذكي
          </h1>
        </div>
      </div>

      <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mt-2">
        حوّل مستندات PDF إلى ملفات Word (<span className="font-mono text-slate-800 text-sm font-semibold">.docx</span>) قابلة للتعديل بدقة عالية، مع إصلاح اتجاه النصوص العربية (RTL) والحفاظ على الجداول والتنسيقات.
      </p>

      {/* Quick sample PDF test trigger */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={onTrySample}
          disabled={isProcessingSample}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="تجربة التحويل بملف تجريبي مسبق"
        >
          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
          {isProcessingSample ? 'جارٍ تحميل وتجربة النموذج...' : '📄 جرّب الآن بنموذج عربي جاهز بنقرة واحدة'}
        </button>
      </div>
    </header>
  );
};
