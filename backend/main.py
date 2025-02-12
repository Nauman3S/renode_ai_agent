import os
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import uuid
import logging
import shutil

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Update CORS settings for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Update file paths to be relative to the script
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
LOGS_DIR = os.path.join(os.path.dirname(__file__), "logs")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

@app.post("/upload/")
async def upload_files(
    repl_file: UploadFile = File(...),
    resc_file: UploadFile = File(...),
    elf_file: UploadFile = File(...),
):
    try:
        logger.info("Starting file upload process")
        
        # Create a unique directory for this run
        run_id = str(uuid.uuid4())
        run_dir = os.path.join(UPLOAD_DIR, run_id)
        os.makedirs(run_dir, exist_ok=True)

        # Save files with absolute paths
        repl_path = os.path.join(run_dir, "platform.repl")
        resc_path = os.path.join(run_dir, "script.resc")
        elf_path = os.path.join(run_dir, "testbench.elf")

        # Save files
        for file, path in [(repl_file, repl_path), (resc_file, resc_path), (elf_file, elf_path)]:
            logger.info(f"Saving {file.filename} to {path}")
            with open(path, "wb") as f:
                content = await file.read()
                if path.endswith('.resc') or path.endswith('.repl'):
                    content = content.replace(b'\r\n', b'\n')
                f.write(content)

        # Create log file path
        log_file = os.path.join(LOGS_DIR, f"log_{run_id}.txt")

        # Change to the run directory before executing renode
        os.chdir(run_dir)
        
        # Set up environment variables
        env = os.environ.copy()
        env['RENODE_ROOT'] = '/opt/renode'
        
        # Modified command with environment setup
        renode_command = [
            "/usr/bin/renode",
            "--disable-xwt",
            "--console",
            "-e",
            f"include script.resc"
        ]
        
        logger.info(f"Executing command: {' '.join(renode_command)}")
        logger.info(f"Working directory: {os.getcwd()}")
        logger.info(f"Environment: RENODE_ROOT={env['RENODE_ROOT']}")
        
        # First, let's check what files are available
        logger.info("Available .so files:")
        for root, dirs, files in os.walk('/opt/renode'):
            for file in files:
                if file.endswith('.so'):
                    logger.info(f"Found: {os.path.join(root, file)}")

        process = subprocess.run(
            renode_command,
            env=env,
            capture_output=True,
            text=True,
            cwd=run_dir
        )
        
        # Write output to log file
        with open(log_file, "w") as f:
            f.write(f"Command: {' '.join(renode_command)}\n")
            f.write(f"Return code: {process.returncode}\n")
            f.write(f"Output:\n{process.stdout}\n")
            f.write(f"Error:\n{process.stderr}\n")
        
        if process.returncode != 0:
            logger.error(f"Renode execution failed: {process.stderr}")
            return JSONResponse(
                content={
                    "message": "Renode execution failed!",
                    "error": process.stderr,
                    "command": ' '.join(renode_command),
                    "log_file": log_file
                },
                status_code=500
            )

        logger.info("Renode execution completed successfully")
        return JSONResponse(content={
            "message": "Files uploaded successfully!",
            "log_file": log_file,
            "command": ' '.join(renode_command)
        })

    except Exception as e:
        logger.exception("Error during file upload/processing")
        return JSONResponse(
            content={"message": "Processing failed!", "error": str(e)},
            status_code=500
        )

@app.get("/")
async def root():
    return {"message": "Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/logs/")
async def get_logs():
    logs = []
    log_files = sorted(os.listdir(LOGS_DIR), reverse=True)

    if log_files:
        with open(os.path.join(LOGS_DIR, log_files[0]), "r") as log_file:
            logs = log_file.readlines()

    return {"logs": logs}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9001)
