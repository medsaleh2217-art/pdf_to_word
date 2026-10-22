import React from 'react';
import { FileText, Shield, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 px-4 text-center text-slate-500 text-xs sm:text-sm">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span>محوّل PDF إلى Word الذكي</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            حماية تامة للملفات
          </span>
          <span>•</span>
          <span>جميع الحقوق محفوظة © {new Date().getFullYear()}</span>
        </div>

        <div className="text-xs text-slate-400">
          صُمم خصيصاً لدعم اللغة العربية والنصوص ثنائية الاتجاه
        </div>
      </div>
    </footer>
  );
};
