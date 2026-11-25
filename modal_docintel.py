import os
import subprocess
import modal

APP_NAME = "datav-ai-backend"
app = modal.App(APP_NAME)

docintel_secret = modal.Secret.from_name("DocIntel-AI")
docintel_volume = modal.Volume.from_name("ai-doc-intel-uploads", create_if_missing=True)

# 1. Worker Image (Python 3.11 with OCR, Poppler, and full worker dependencies)
worker_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("tesseract-ocr", "poppler-utils", "libgl1", "libglib2.0-0", "libsm6", "libxext6")
    .pip_install(
        "bullmq>=2.7.0",
        "google-genai>=1.0.0",
        "pydantic>=2.7.0",
        "pydantic-settings>=2.2.0",
        "tenacity>=8.3.0",
        "pymupdf>=1.24.0",
        "opencv-python-headless>=4.9.0.80",
        "numpy>=1.26.0",
        "pillow>=10.2.0",
        "pytesseract>=0.3.10",
        "pandas>=2.2.0",
        "openpyxl>=3.1.2",
        "xlrd>=2.0.1",
        "rapidfuzz>=3.8.0",
        "psycopg[binary,pool]>=3.1.18",
        "pgvector>=0.2.5",
        "python-dateutil>=2.9.0",
        "psutil>=5.9.8",
        "fastapi>=0.111.0",
        "uvicorn>=0.30.0",
        "httpx>=0.27.0",
        "openai>=1.30.0",
        "python-multipart>=0.0.9",
        "redis>=5.0.0",
    )
    .add_local_dir(
        "services/worker",
        remote_path="/root/services/worker",
        copy=True,
        ignore=["__pycache__", ".pytest_cache", ".venv"],
    )
    .add_local_dir("db", remote_path="/root/db", copy=True)
)

# 2. API Image (Node.js 20+ compiling TypeScript apps/api)
api_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("curl", "ca-certificates")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
    )
    .add_local_dir(
        "apps/api",
        remote_path="/root/apps/api",
        copy=True,
        ignore=["node_modules", "dist", ".git"],
    )
    .add_local_dir("db", remote_path="/root/db", copy=True)
    .run_commands(
        "cd /root/apps/api && npm ci && npm run build",
    )
)

# ---------------------------------------------------------------------------
# Endpoint 1: FastAPI Worker Service (OCR, Parsing, BullMQ, Extraction)
# ---------------------------------------------------------------------------
@app.function(
    image=worker_image,
    secrets=[docintel_secret],
    volumes={"/data/uploads": docintel_volume},
    scaledown_window=300,
    timeout=600,
)
@modal.asgi_app()
def worker():
    import sys
    worker_dir = "/root/services/worker"
    if worker_dir not in sys.path:
        sys.path.insert(0, worker_dir)
    os.chdir(worker_dir)
    from main import app as fastapi_app
    return fastapi_app


# ---------------------------------------------------------------------------
# Endpoint 2: Express REST API (Ingestion, Search, Verification, Health)
# ---------------------------------------------------------------------------
@app.function(
    image=api_image,
    secrets=[docintel_secret],
    volumes={"/data/uploads": docintel_volume},
    scaledown_window=300,
    timeout=600,
)
@modal.web_server(4000, startup_timeout=60)
def api():
    env = os.environ.copy()
    env["PORT"] = "4000"
    env["DATA_UPLOADS_DIR"] = "/data/uploads"
    subprocess.Popen("node dist/index.js", cwd="/root/apps/api", env=env, shell=True)


# ---------------------------------------------------------------------------
# CLI Runner Function & Local Entrypoint (For Evaluation & Debugging)
# ---------------------------------------------------------------------------
@app.function(
    image=worker_image,
    secrets=[docintel_secret],
    volumes={"/data/uploads": docintel_volume},
    timeout=600,
)
def run_docintel_command(args: list[str] | None = None) -> dict:
    cmd = ["python3", "-m", "app.contracts"]
    if args:
        cmd = args
    proc = subprocess.run(
        cmd,
        cwd="/root/services/worker",
        env={**os.environ, "DATA_UPLOADS_DIR": "/data/uploads"},
        capture_output=True,
        text=True,
    )
    return {
        "returncode": proc.returncode,
        "stdout": proc.stdout[-4000:],
        "stderr": proc.stderr[-4000:],
    }


@app.local_entrypoint()
def main(action: str = "check"):
    if action == "check":
        result = run_docintel_command.remote(
            ["python3", "-c", "import app.contracts as c; print('contracts_loaded:', dir(c))"]
        )
        print(result)
    elif action == "run":
        result = run_docintel_command.remote()
        print(result)
    else:
        raise ValueError(f"Unknown action: {action}")
