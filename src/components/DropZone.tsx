import React, { useRef, useState } from 'react';
import { UploadCloud, FileUp, AlertCircle, FileCheck } from 'lucide-react';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  maxMb: number;
  maxPages: number;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelected,
  maxMb,
  maxPages,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
    setDragError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const validateAndPass = (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setDragError('عفواً، يجب اختيار ملف بصيغة PDF فقط.');
      return;
    }

    if (file.size > maxMb * 1024 * 1024) {
      setDragError(`حجم الملف كبير جداً. الحد الأقصى المسموح به هو ${maxMb} ميغابايت.`);
      return;
    }

    setDragError(null);
    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndPass(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const chosenFile = e.target.files[0];
      validateAndPass(chosenFile);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="منطقة رفع ملف PDF، اسحب الملف هنا أو اضغط للتصفح"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-blue-600 bg-blue-50/80 scale-[1.01] shadow-md'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform ${
              isDragOver ? 'bg-blue-600 text-white scale-110' : 'bg-blue-100 text-blue-600'
            }`}
          >
            {isDragOver ? (
              <FileUp className="w-8 h-8 animate-bounce" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">
            اسحب ملف PDF هنا أو انقر لاختيار ملف
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            يدعم المستندات العربية، العقود، التقارير والكتب (حتى {maxMb} ميغابايت و {maxPages} صفحة)
          </p>

          <button
            type="button"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <FileCheck className="w-4 h-4" />
            تصفح الملفات من جهازك
          </button>
        </div>
      </div>

      {dragError && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{dragError}</span>
        </div>
      )}
    </div>
  );
};
