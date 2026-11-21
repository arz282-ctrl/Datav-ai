FROM python:3.11-slim

# Install system dependencies including Tesseract and OpenCV runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-osd \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Fixed non-root user UID/GID 10001
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -m -s /bin/bash appuser

# Create shared data uploads directory
RUN mkdir -p /data/uploads && chown -R 10001:10001 /data/uploads

WORKDIR /app

COPY requirements.txt constraints.txt ./
RUN pip install --no-cache-dir -r requirements.txt -c constraints.txt

COPY . .
RUN chown -R 10001:10001 /app

USER 10001:10001

EXPOSE 8001

HEALTHCHECK --interval=5s --timeout=5s --retries=5 --start-period=10s \
  CMD python3 -c 'import urllib.request; urllib.request.urlopen("http://localhost:8001/health")' || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
