import React, { useState } from 'react';
import { ArrowLeftRight, Check, X, FileText, CheckCircle2 } from 'lucide-react';

export const VisualComparison: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'after' | 'before'>('after');

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 mb-8">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              مقارنة الجودة
            </span>
            <h3 className="text-xl sm:text-2xl font-bold mt-2">
              معالجة مشكلة النصوص العربية الشائعة
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              المحولات العادية تخلط الحروف وتضع الاتجاه لليسار. محركنا يصححها بدقة.
            </p>
          </div>

          {/* Toggle button */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('after')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'after'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              مع محوّلنا الذكي (صحيح)
            </button>
            <button
              onClick={() => setActiveTab('before')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'before'
                  ? 'bg-rose-700 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              المحولات العادية (مشوه)
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document Sample Presentation */}
          <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-400" />
                  نموذج بند تعاقدي وقانوني
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    activeTab === 'after'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {activeTab === 'after' ? 'تمت المعالجة بـ RTL' : 'خطأ اتجاه LTR ومعكوس'}
                </span>
              </div>

              {activeTab === 'after' ? (
                <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/30 text-right space-y-2">
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    «يلتزم الطرف الأول بتقديم الدعم الفني كاملاً، <span className="text-emerald-400 font-bold underline">ولا</span> يجوز له التخلف عن الموعد <span className="text-emerald-400 font-bold underline">لأن</span> الإخلال بالموعد يُعد مخالفة صريحة.»
                  </p>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تم ضبط اتجاه البند من اليمين وإصلاح "لا" و"لأن" تلقائياً.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/90 p-4 rounded-xl border border-rose-500/30 text-left space-y-2">
                  <p className="text-sm font-semibold text-rose-200 leading-relaxed font-mono">
                    «.ةحيحص ةفلاخم دعُي دوعملا نألو ،دوعملا نع فلختلا هل زوجي لاو ،لاماك ينقتلا معدلا ميدقتب لولأا فرطلا مزتلي»
                  </p>
                  <div className="text-[11px] text-rose-400 flex items-center gap-1 mt-2">
                    <X className="w-3.5 h-3.5" />
                    حروف مقلوبة واتجاه يبدأ من اليسار غير قابل للقراءة في Word.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>خوارزمية الفحص: oxml w:bidi & w:rtl</span>
              <span>دقة التحويل: 99.8%</span>
            </div>
          </div>

          {/* Quick breakdown highlights */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/70 flex flex-col justify-center space-y-3 text-xs sm:text-sm">
            <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
              <ArrowLeftRight className="w-4 h-4 text-blue-400" />
              التحسينات التي تتم تلقائياً لكل فقرة:
            </h4>
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
              <span>إصلاح ترتيب الليغاتشر المعكوس (االسم ⬅ الاسم، وال ⬅ ولا).</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
              <span>إضافة علامة Bidi و RTL إلى هيكل الفقرات لتوجيه مؤشر الكتابة تلقائياً.</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
              <span>تعديل ترتيب علامات الترقيم (كعلامة النقطة والنقطتين) لتظل في نهاية الجملة.</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
              <span>معالجة خلايا الجداول وفق نمط RTL مع الحفاظ على موضع النصوص.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
