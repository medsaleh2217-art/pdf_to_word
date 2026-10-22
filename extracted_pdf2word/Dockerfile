FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py arabic_fix.py ./
COPY static ./static

# مستخدم غير جذري
RUN useradd -m app && chown -R app /app
USER app

EXPOSE 8000
# عامل واحد يكفي لبداية الموقع؛ التحويل نفسه يعمل في خيوط منفصلة
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
