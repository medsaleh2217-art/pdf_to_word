"""محوّل PDF إلى Word — خادم FastAPI.

التشغيل:  uvicorn main:app --host 0.0.0.0 --port 8000
"""
import asyncio
import os
import shutil
import tempfile
import time
from collections import defaultdict, deque
from pathlib import Path

import pymupdf
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from starlette.background import BackgroundTask
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pdf2docx import Converter

from arabic_fix import fix_docx as fix_arabic

# ---------- الإعدادات (يمكن تغييرها عبر متغيرات البيئة) ----------
MAX_MB = int(os.getenv("MAX_MB", "15"))              # أقصى حجم للملف
MAX_PAGES = int(os.getenv("MAX_PAGES", "60"))         # أقصى عدد صفحات
RATE_LIMIT = int(os.getenv("RATE_LIMIT", "10"))       # عدد التحويلات لكل IP
RATE_WINDOW = int(os.getenv("RATE_WINDOW", "3600"))   # خلال هذه المدة (ثوانٍ)
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "2"))  # تحويلات متزامنة

BASE = Path(__file__).parent
app = FastAPI(title="PDF to Word", docs_url=None, redoc_url=None)
_slots = asyncio.Semaphore(MAX_CONCURRENT)
_hits: dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate(ip: str) -> None:
    now = time.time()
    q = _hits[ip]
    while q and now - q[0] > RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        wait = int((RATE_WINDOW - (now - q[0])) / 60) + 1
        raise HTTPException(429, f"وصلت للحد المسموح من التحويلات. حاول بعد {wait} دقيقة تقريباً.")
    q.append(now)


def _convert(pdf_path: str, docx_path: str) -> None:
    cv = Converter(pdf_path)
    try:
        cv.convert(docx_path, start=0, end=None)
    finally:
        cv.close()
    try:
        fix_arabic(docx_path)  # تحسينات العربية؛ إن فشلت نُبقي الملف كما هو
    except Exception:
        pass


@app.post("/api/convert")
async def convert(request: Request, file: UploadFile = File(...)):
    _check_rate(_client_ip(request))

    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "الملف يجب أن يكون بصيغة PDF.")

    workdir = tempfile.mkdtemp(prefix="p2w_")
    try:
        # عند النجاح يُحذف المجلد بعد إرسال الملف؛ وعند أي خطأ يُحذف فوراً
        return await _process(file, workdir)
    except BaseException:
        shutil.rmtree(workdir, ignore_errors=True)
        raise


async def _process(file: UploadFile, workdir: str) -> FileResponse:
    pdf_path = os.path.join(workdir, "input.pdf")

    # حفظ الملف مع فرض الحد الأقصى للحجم أثناء القراءة
    size = 0
    limit = MAX_MB * 1024 * 1024
    with open(pdf_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                raise HTTPException(413, f"حجم الملف أكبر من {MAX_MB} ميغابايت.")
            out.write(chunk)

    with open(pdf_path, "rb") as f:
        if f.read(5) != b"%PDF-":
            raise HTTPException(400, "هذا الملف ليس PDF صالحاً.")

    # فحص: تالف؟ محمي بكلمة مرور؟ عدد الصفحات؟ ممسوح ضوئياً؟
    try:
        doc = pymupdf.open(pdf_path)
    except Exception:
        raise HTTPException(400, "تعذّر فتح الملف، قد يكون تالفاً.")
    try:
        if doc.needs_pass:
            raise HTTPException(400, "الملف محمي بكلمة مرور. أزل الحماية ثم أعد المحاولة.")
        pages = doc.page_count
        if pages == 0:
            raise HTTPException(400, "الملف لا يحتوي على صفحات.")
        if pages > MAX_PAGES:
            raise HTTPException(413, f"عدد الصفحات ({pages}) أكبر من الحد المسموح ({MAX_PAGES}).")
        sample = range(min(pages, 5))
        chars = sum(len(doc[i].get_text("text").strip()) for i in sample)
        if chars < 20:
            raise HTTPException(
                422,
                "يبدو أن الملف ممسوح ضوئياً (صور بلا نص قابل للنسخ). "
                "هذا النوع يحتاج OCR وهو غير مدعوم حالياً.",
            )
    finally:
        doc.close()

    docx_path = os.path.join(workdir, "output.docx")
    async with _slots:
        try:
            await asyncio.wait_for(asyncio.to_thread(_convert, pdf_path, docx_path), timeout=180)
        except asyncio.TimeoutError:
            raise HTTPException(504, "استغرق التحويل وقتاً طويلاً. جرّب ملفاً أصغر.")
        except Exception:
            raise HTTPException(500, "فشل التحويل. قد يكون تنسيق الملف معقداً.")

    if not os.path.exists(docx_path):
        raise HTTPException(500, "فشل التحويل.")

    stem = Path(file.filename).stem[:80] or "document"
    return FileResponse(
        docx_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"{stem}.docx",
        headers={"X-Pages": str(pages)},
        background=BackgroundTask(shutil.rmtree, workdir, True),
    )


@app.get("/api/limits")
async def limits():
    return {"max_mb": MAX_MB, "max_pages": MAX_PAGES, "rate_limit": RATE_LIMIT}


@app.get("/healthz")
async def health():
    return {"ok": True}


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code)


app.mount("/", StaticFiles(directory=BASE / "static", html=True), name="static")
