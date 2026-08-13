import os
import sys
import time
import socket
import webbrowser
import threading
import uvicorn

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scripts.run_platform import EduAdaptPlatform
from api.endpoints import EduAdaptAPI

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def open_browser():
    time.sleep(2)
    webbrowser.open("http://localhost:8000")

def main():
    local_ip = get_local_ip()
    print("=" * 65)
    print("  EduAdapt AI — Multimodal Learning Gap Detector")
    print("=" * 65)
    print(f"  🌐 Local Access:   http://localhost:8000")
    print(f"  📱 Network Access: http://{local_ip}:8000")
    print("=" * 65)

    # ── Initialize Production Database ───────────────────────────────────
    # Creates SQLite database file (eduadapt.db) with all tables and demo data.
    # Safe to run multiple times — skips seed if data already exists.
    print("  🗄️  Initializing database...")
    try:
        from database.init_db import init_db
        init_db()
        print("  ✅ Database ready.")
    except Exception as e:
        print(f"  ⚠️  Database init warning: {e}")
    print("=" * 65)

    config_file = os.path.join(os.path.dirname(__file__), "configs", "default.yaml")
    platform = EduAdaptPlatform(config_path=config_file)
    api = EduAdaptAPI(platform)

    threading.Thread(target=open_browser, daemon=True).start()

    uvicorn.run(api.app, host="0.0.0.0", port=8000, log_level="warning")

if __name__ == "__main__":
    main()

