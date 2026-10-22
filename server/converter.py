#!/usr/bin/env python3
"""CLI utility to inspect and convert PDF to DOCX with Arabic RTL enhancements."""
import argparse
import json
import os
import sys
import pymupdf
from pdf2docx import Converter

try:
    from arabic_fix import fix_docx
except ImportError:
    from server.arabic_fix import fix_docx


def inspect_pdf(pdf_path: str, max_pages: int = 60) -> dict:
    if not os.path.exists(pdf_path):
        return {"error": "الملف غير موجود."}

    # Verify PDF magic header
    with open(pdf_path, "rb") as f:
        header = f.read(5)
        if header != b"%PDF-":
            return {"error": "هذا الملف ليس ملف PDF صالحاً (العنوان مفقود)."}

    try:
        doc = pymupdf.open(pdf_path)
    except Exception as e:
        return {"error": f"تعذر فتح الملف، قد يكون تالفاً: {str(e)}"}

    try:
        if doc.needs_pass:
            return {"error": "الملف محمي بكلمة مرور. يرجى إزالة الحماية أولاً ثم المحاولة.", "is_encrypted": True}

        pages = doc.page_count
        if pages == 0:
            return {"error": "الملف فارغ ولا يحتوي على صفحات.", "pages": 0}

        sample_pages = min(pages, 5)
        sample_text = ""
        total_chars = 0
        arabic_chars = 0

        for i in range(sample_pages):
            page_text = doc[i].get_text("text") or ""
            sample_text += page_text + "\n"
            stripped = page_text.strip()
            total_chars += len(stripped)
            arabic_chars += sum(1 for c in stripped if "\u0600" <= c <= "\u06FF")

        is_scanned = total_chars < 20
        has_arabic = (arabic_chars / max(1, total_chars)) > 0.15

        meta = doc.metadata or {}

        # Generate crisp page thumbnails for preview
        thumbnails = []
        for i in range(min(pages, 8)):
            try:
                pix = doc[i].get_pixmap(dpi=90)
                import base64
                b64 = base64.b64encode(pix.tobytes("png")).decode("ascii")
                thumbnails.append(f"data:image/png;base64,{b64}")
            except Exception:
                pass

        return {
            "success": True,
            "pages": pages,
            "max_allowed_pages": max_pages,
            "is_scanned": is_scanned,
            "is_encrypted": False,
            "total_chars_sample": total_chars,
            "has_arabic": has_arabic,
            "arabic_ratio": round(arabic_chars / max(1, total_chars), 2),
            "sample_preview": sample_text[:350].strip(),
            "page_thumbnails": thumbnails,
            "title": meta.get("title") or "",
            "author": meta.get("author") or "",
        }
    finally:
        doc.close()


def convert_pdf(
    pdf_path: str,
    docx_path: str,
    start: int = 0,
    end: int = None,
    apply_arabic_fix: bool = True
) -> dict:
    if not os.path.exists(pdf_path):
        return {"error": "ملف PDF غير موجود."}

    # Pre-check PDF
    info = inspect_pdf(pdf_path)
    if not info.get("success"):
        return {"error": info.get("error", "فحص الملف فشل")}

    if info.get("is_scanned"):
        return {
            "error": "يبدو أن الملف ممسوح ضوئياً (صور ممسوحة بلا نص قابل للنسخ). "
                     "هذا النوع يحتاج تقنية التعرف الضوئي على الحروف (OCR) وهو غير مدعوم حالياً."
        }

    total_pages = info.get("pages", 1)
    if start < 0:
        start = 0
    if end is None or end <= 0 or end > total_pages:
        end = total_pages

    if start >= end:
        return {"error": f"نطاق الصفحات غير صحيح (البداية {start+1} أكبر من النهاية {end})"}

    try:
        cv = Converter(pdf_path)
        try:
            cv.convert(docx_path, start=start, end=end)
        finally:
            cv.close()
    except Exception as e:
        return {"error": f"فشل تحويل PDF إلى Word: {str(e)}"}

    if not os.path.exists(docx_path):
        return {"error": "لم يتم العثور على ملف Word المخرج."}

    arabic_fixed = False
    if apply_arabic_fix:
        try:
            fix_docx(docx_path)
            arabic_fixed = True
        except Exception as e:
            # Non-fatal error; conversion succeeded
            pass

    out_size = os.path.getsize(docx_path)
    return {
        "success": True,
        "pages_converted": end - start,
        "start_page": start + 1,
        "end_page": end,
        "arabic_fixed": arabic_fixed,
        "output_size": out_size,
    }


def main():
    parser = argparse.ArgumentParser(description="PDF to DOCX Converter with Arabic support")
    parser.add_argument("--info", help="Inspect PDF file and print JSON info")
    parser.add_argument("--convert", action="store_true", help="Convert PDF to DOCX")
    parser.add_argument("--input", help="Path to input PDF")
    parser.add_argument("--output", help="Path to output DOCX")
    parser.add_argument("--start", type=int, default=0, help="Start page index (0-based)")
    parser.add_argument("--end", type=int, default=None, help="End page index (exclusive)")
    parser.add_argument("--no-arabic-fix", action="store_true", help="Disable Arabic RTL fix")

    args = parser.parse_args()

    if args.info:
        res = inspect_pdf(args.info)
        print(json.dumps(res, ensure_ascii=False))
        sys.exit(0 if res.get("success") else 1)

    if args.convert:
        if not args.input or not args.output:
            print(json.dumps({"error": "يجب تحديد --input و --output للتحويل"}, ensure_ascii=False))
            sys.exit(1)

        res = convert_pdf(
            pdf_path=args.input,
            docx_path=args.output,
            start=args.start,
            end=args.end,
            apply_arabic_fix=not args.no_arabic_fix
        )
        print(json.dumps(res, ensure_ascii=False))
        sys.exit(0 if res.get("success") else 1)

    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
