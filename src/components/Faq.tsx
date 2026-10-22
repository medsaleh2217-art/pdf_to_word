import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqProps {
  maxMb: number;
  maxPages: number;
}

export const Faq: React.FC<FaqProps> = ({ maxMb, maxPages }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'لماذا قد يتم رفض ملف بدعوى أنه «ممسوح ضوئياً» (Scanned)؟',
      a: 'الملفات الممسوحة ضوئياً عبر الماسح الضوئي أو كاميرا الهاتف هي في الواقع مجرد صور فوتوغرافية مدمجة داخل PDF ولا تحتوي على نصوص رقمية مخزنة. تحويل مثل هذه الصور إلى نصوص Word يتطلب تقنية التعرف الضوئي على الحروف (OCR)، بينما يعتمد هذا المحول على استخراج الكتل النصية الرقمية المباشرة.',
    },
    {
      q: 'هل التنسيق والجداول تبقى تماماً كما هي في ملف PDF الأصلي؟',
      a: 'نعم بنسبة عالية جداً. يتعرف المحرك على الجداول، وحجم الخطوط، والفقرات، ويحولها إلى عناصر Word قياسية. في بعض الملفات التي تحوي تصاميم رسومية متداخلة أو خطوطاً غير قياسية، قد يتطلب الأمر لمسات تنسيق بسيطة داخل برنامج Word.',
    },
    {
      q: 'ما هو الحد الأقصى لحجم الملف وعدد الصفحات؟',
      a: `يدعم المحول حالياً ملفات بحجم يصل إلى ${maxMb} ميغابايت وحتى ${maxPages} صفحة للمستند الواحد، وذلك لضمان سرعة فائقة في المعالجة وعدم استهلاك موارد الخادم. يمكنك أيضاً استخدام خيار "تحديد صفحات معينة" لتحويل جزء محدد من المستند.`,
    },
    {
      q: 'هل يمكن تحويل ملف PDF محمي بكلمة مرور؟',
      a: 'لا يمكن تحويل الملفات المشفرة أو المحمية بكلمة سر مباشرة قبل فتحها. يرجى إزالة الحماية أو كلمة المرور من ملف PDF أولاً ثم إعادة رفعه إلى الموقع.',
    },
    {
      q: 'كيف تضمنون خصوصية وسرية المستندات المرفوعة؟',
      a: 'نحن نأخذ الخصوصية بأعلى درجات الجدية؛ لا يتم تخزين أي ملفات على المدى الطويل، ويتم مسح الملفات المؤقتة من الخادم بشكل فوري وتلقائي بمجرد انتهاء التحويل والتنزيل أو عند حدوث أي خطأ.',
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="max-w-3xl mx-auto px-4 py-8 mb-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-1.5 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <HelpCircle className="w-4 h-4" />
          مركز المساعدة
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          الأسئلة الشائعة
        </h2>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="border border-slate-200 rounded-2xl bg-white overflow-hidden transition-all shadow-sm"
            >
              <button
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                className="w-full text-right p-4 sm:p-5 font-bold text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span className="text-sm sm:text-base">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-5 sm:px-5 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
