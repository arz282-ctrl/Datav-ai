import os
import subprocess
import modal

APP_NAME = "ai-doc-intel-runner"
app = modal.App(APP_NAME)

worker_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("tesseract-ocr", "poppler-utils", "libgl1")
    .pip_install(
        "fastapi",
        "uvicorn",
        "pydantic",
        "python-multipart",
        "google-genai",
        "httpx",
    )
    .add_local_dir("services/worker", remote_path="/root/ai-doc-intel/services/worker")
)

docintel_secret = modal.Secret.from_name("DocIntel-AI")
docintel_volume = modal.Volume.from_name("ai-doc-intel-cache", create_if_missing=True)


@app.function(
    image=worker_image,
    secrets=[docintel_secret],
    volumes={"/data/docintel": docintel_volume},
    timeout=600,
)
def run_docintel_command(args: list[str] | None = None) -> dict:
    cmd = ["python3", "-m", "app.contracts"]
    if args:
        cmd = args
    proc = subprocess.run(
        cmd,
        cwd="/root/ai-doc-intel/services/worker",
        env={**os.environ, "DOCINTEL_DATA_DIR": "/data/docintel"},
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
