# main.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import yt_dlp
import os
import uuid
import threading
import time

app = FastAPI()
progress_dict = {}
file_dict = {}

# Allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev only, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def download_worker(url, format, video_id):
    output_path = f"{video_id}.%(ext)s"
    def progress_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 1
            downloaded = d.get('downloaded_bytes', 0)
            progress_dict[video_id] = min(downloaded / total, 1.0)
        elif d['status'] == 'finished':
            progress_dict[video_id] = 1.0

    options = {
        'format': 'bestvideo[height<=1080]+bestaudio/best',
        'outtmpl': output_path,
        'progress_hooks': [progress_hook]
    }
    if format == "mp3":
        options.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }]
        })
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=True)
        if format == "mp3":
            ext = "mp3"
        else:
            ext = info.get("ext", "mkv")
        output_filename = info.get("_filename", f"{video_id}.{ext}")
    file_dict[video_id] = output_filename

@app.post("/start-download")
async def start_download(url: str, format: str = Query("mp4")):
    video_id = str(uuid.uuid4())
    progress_dict[video_id] = 0.0
    thread = threading.Thread(target=download_worker, args=(url, format, video_id))
    thread.start()
    return {"id": video_id}

@app.get("/progress")
async def get_progress(id: str):
    progress = progress_dict.get(id, 0.0)
    return JSONResponse({"progress": progress})

@app.get("/get-file")
async def get_file(id: str):
    file_path = file_dict.get(id)
    # Wait up to 10 seconds for the file to appear (merger may take a moment)
    for _ in range(20):
        if file_path and os.path.exists(file_path):
            break
        time.sleep(0.5)
    if not file_path or not os.path.exists(file_path):
        return JSONResponse({"error": "File not ready"}, status_code=404)
    # Optionally: cleanup progress_dict and file_dict here
    progress_dict.pop(id, None)
    file_dict.pop(id, None)
    return FileResponse(path=file_path, filename=os.path.basename(file_path), media_type='application/octet-stream')
