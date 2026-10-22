"""معالجة لاحقة لملف docx الناتج عن pdf2docx لتحسين النص العربي.

1) إصلاح ترتيب حرفي «لا / لأ / لإ / لآ»: كثير من ملفات PDF تُخرج لِيغاتشر
   اللام-ألف بترتيب معكوس (الاسم -> االسم). نصلح فقط الحالات التي لا تتعارض
   مع كلمات عربية سليمة.
2) وضع علامة RTL على الفقرات العربية ليعرضها Word بالاتجاه الصحيح.
"""
import re
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

AR = "ء-ي\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF"
_arabic = re.compile(f"[{AR}]")
AR_PATTERN = _arabic
_L = f"(?<![{AR}])"   # بداية كلمة
_R = f"(?![{AR}])"    # نهاية كلمة

# تسلسلات لا تظهر في العربية السليمة، فهي دليل على انعكاس اللام-ألف
_SEQ = [("اال", "الا"), ("األ", "الأ"), ("اإل", "الإ"), ("اآل", "الآ"), ("الال", "اللا")]
# كلمات منفصلة أصلها «لا» وأخواتها
_WORDS = [
    ("ال", "لا"), ("وال", "ولا"), ("فال", "فلا"), ("إال", "إلا"), ("أال", "ألا"), ("ألن", "لأن"),
    ("أوال", "أولاً"), ("ثانيا", "ثانياً"), ("ثالثا", "ثالثاً"), ("رابعا", "رابعاً"),
    ("شرعا", "شرعاً"), ("نظاما", "نظاماً"), ("شامال", "شاملاً")
]
_WORD_RES = [(re.compile(f"{_L}{a}{_R}"), b) for a, b in _WORDS]
# نقطة نهاية الجملة التي انتقلت إلى بداية الكلمة الأخيرة (إلى.اليسار -> إلى اليسار.)
_MISPLACED_DOT = re.compile(f"([{AR}])\\.([{AR}]+)")


def fix_text(s: str) -> str:
    if not _arabic.search(s):
        return s
    for a, b in _SEQ:
        s = s.replace(a, b)
    for rx, b in _WORD_RES:
        s = rx.sub(b, s)
    s = _MISPLACED_DOT.sub(r"\1 \2.", s)
    return s


def is_arabic_par(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return False
    ar = sum(1 for c in letters if _arabic.search(c))
    return ar / len(letters) >= 0.3


_is_arabic_par = is_arabic_par


def mark_paragraph_rtl(par) -> None:
    try:
        pPr = par._p.get_or_add_pPr()
        if pPr.find(qn("w:bidi")) is None:
            pPr.insert(0, OxmlElement("w:bidi"))
        # مع bidi: القيمة الافتراضية (بدء السطر) = اليمين، فنزيل left/right الصريحة
        jc = pPr.find(qn("w:jc"))
        if jc is not None and jc.get(qn("w:val")) in ("left", "right", "start", "end"):
            pPr.remove(jc)
        for r in par.runs:
            if _arabic.search(r.text):
                rPr = r._r.get_or_add_rPr()
                if rPr.find(qn("w:rtl")) is None:
                    rPr.append(OxmlElement("w:rtl"))
    except Exception:
        pass


_mark_rtl = mark_paragraph_rtl


def _paragraphs(doc):
    yield from doc.paragraphs
    for t in doc.tables:
        for row in t.rows:
            for cell in row.cells:
                yield from cell.paragraphs


def fix_docx(path: str) -> None:
    try:
        doc = Document(path)
    except Exception:
        return
    seen = set()
    for par in _paragraphs(doc):
        if par._p in seen:  # الخلايا المدمجة تتكرر؛ نحتفظ بالعنصر نفسه لا بـ id()
            continue
        seen.add(par._p)
        if not _arabic.search(par.text):
            continue
        for r in par.runs:
            fixed = fix_text(r.text)
            if fixed != r.text:
                r.text = fixed
        if is_arabic_par(par.text):
            mark_paragraph_rtl(par)
    try:
        doc.save(path)
    except Exception:
        pass
