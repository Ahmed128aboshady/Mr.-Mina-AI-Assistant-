# -*- coding: utf-8 -*-
"""
🔄 Pipeline for Auto-Ingesting, Converting, and Linking Audio Recordings
From: C:\\Users\\user\\Downloads\\New folder (122)
To:   D:\\Mina\\app\\audio_cache\\
"""

import os
import re
import sys
import shutil
import subprocess
from pathlib import Path

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from pydub import AudioSegment

SOURCE_DIR = Path(r"C:\Users\user\Downloads\New folder (122)")
TARGET_DIR = Path(r"D:\Mina\app\audio_cache")
CURRICULUM_FILE = Path(r"D:\Mina\app\js\curriculum_data.js")

def normalize_filename(filename: str) -> str:
    base = filename.strip()
    base = re.sub(r'\.+', '.', base)
    stem, ext = os.path.splitext(base)
    stem = stem.strip('. ')
    return stem

def convert_to_mp3(src_file: Path, dest_file: Path):
    ext = src_file.suffix.lower().strip('.')
    try:
        audio = AudioSegment.from_file(str(src_file), format=ext if ext != 'ogg' else 'ogg')
        audio.export(str(dest_file), format="mp3", bitrate="128k", parameters=["-ar", "48000"])
        return True, "Converted via pydub"
    except Exception as e:
        try:
            cmd = ["ffmpeg", "-y", "-i", str(src_file), "-codec:a", "libmp3lame", "-b:a", "128k", "-ar", "48000", str(dest_file)]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            return True, "Converted via ffmpeg"
        except Exception as e2:
            return False, f"Failed: {e} / {e2}"

def sync_recordings():
    if not SOURCE_DIR.exists():
        print(f"❌ Source directory does not exist: {SOURCE_DIR}")
        return []

    TARGET_DIR.mkdir(parents=True, exist_ok=True)

    print(f"🔍 Scanning: {SOURCE_DIR}")
    files = list(SOURCE_DIR.iterdir())
    audio_extensions = {'.mp3', '.ogg', '.wav', '.m4a', '.aac', '.webm', '.flac'}

    found_count = 0
    synced_count = 0
    updated_files = []

    for f in sorted(files):
        if f.is_file() and any(f.name.lower().endswith(ext) or '..' in f.name for ext in audio_extensions):
            found_count += 1
            clean_stem = normalize_filename(f.name)
            target_mp3 = TARGET_DIR / f"{clean_stem}.mp3"

            needs_sync = True
            if target_mp3.exists():
                if target_mp3.stat().st_mtime >= f.stat().st_mtime:
                    needs_sync = False

            if needs_sync:
                print(f"🎙️ Processing '{f.name}' -> '{target_mp3.name}'...")
                if f.suffix.lower() == '.mp3' and '..' not in f.name:
                    shutil.copy2(str(f), str(target_mp3))
                    success, msg = True, "Direct copy"
                else:
                    success, msg = convert_to_mp3(f, target_mp3)

                if success:
                    print(f"   ✅ Done ({msg}) -> {target_mp3.stat().st_size:,} bytes")
                    synced_count += 1
                    updated_files.append(clean_stem)
                else:
                    print(f"   ❌ Error: {msg}")
            else:
                print(f"   ⚡ '{clean_stem}.mp3' already up to date in audio_cache.")

    print(f"\n✨ Summary: Found {found_count} source recording(s), synced {synced_count} file(s).")
    return updated_files

if __name__ == '__main__':
    sync_recordings()
