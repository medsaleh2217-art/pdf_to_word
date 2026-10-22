import React from 'react';
import { ShieldCheck, AlignRight, Table, Zap, FileSpreadsheet, Sparkles } from 'lucide-react';

export const Features: React.FC = () => {
  const features = [
    {
      icon: <AlignRight className="w-6 h-6 text-blue-600" />,
      title: 'دعم كامل للغة العربية (RTL)',
      description:
        'إصلاح جذري لمشكلة انعكاس الحروف الشائعة (مثل اللام-ألف "لا / لأن") وضبط اتجاه الفقرات تلقائياً من اليمين إلى اليسار في مستند Word.',
      badge: 'ميزة حصرية',
    },
    {
      icon: <Table className="w-6 h-6 text-indigo-600" />,
      title: 'الحفاظ على الجداول المعقدة',
      description:
        'التعرف التلقائي على الجداول والخلايا وتنسيقات الحدود، وتحويلها إلى جداول Word حقيقية وقابلة للتعديل وإعادة الترتيب.',
      badge: 'دقة عالية',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      title: 'خصوصية وأمان تام',
      description:
        'مستنداتك ملكك وحدك. نقوم بحذف ملفاتك فور انتهاء التحويل وتنزيلها تلقائياً، بدون تخزين سحابي أو وصول لأي طرف ثالث.',
      badge: '100% آمن',
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      title: 'سرعة فائقة وخفيف الوزن',
      description:
        'محرك تحويل محلي مبني بأحدث مكتبات بايثون ومعالجة فورية، يتم تحويل معظم المستندات في أقل من 5 ثوانٍ.',
      badge: 'فوري',
    },
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-rose-500" />,
      title: 'توافق كامل مع مايكروسوفت وورد',
      description:
        'توليد ملفات .docx قياسية متوافقة 100% مع Microsoft Word 2016-2024، وWord 365، وGoogle Docs، وLibreOffice.',
      badge: 'صيغة قياسية',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-cyan-600" />,
      title: 'استخراج الصور والرسوم البيانية',
      description:
        'الاحتفاظ بالصور والرسومات التوضيحية المضمنة في صفحات PDF داخل مستند Word بنفس مواضعها الأصلية وجودتها.',
      badge: 'جودة أصلية',
    },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          لماذا يُعد هذا المحوّل الخيار الأفضل للمستندات العربية؟
        </h2>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
          تم تصميم محرك التحويل خصيصاً للتغلب على مشاكل محولات PDF التقليدية التي تشوه النصوص العربية والجداول.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feat, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                {feat.icon}
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {feat.badge}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-2">
              {feat.title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {feat.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
