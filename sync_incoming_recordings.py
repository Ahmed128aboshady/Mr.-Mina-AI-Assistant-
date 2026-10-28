# -*- coding: utf-8 -*-
"""
🔄 Pipeline for Auto-Ingesting, Converting, and Linking Audio Recordings
From: C:\\Users\\user\\Downloads\\New folder (122)
To:   D:\\Mina\\app\\audio_cache\\
"""

import os
import re
import sys
import json
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
    # Fix multiple consecutive dots like 'name..ogg'
    base = re.sub(r'\.+', '.', base)
    stem, ext = os.path.splitext(base)
    stem = stem.strip('. ')
    
    # Fix common typos like missing 'w' in 'why_'
    if stem.startswith('hy_u') or stem.startswith('hy_'):
        stem = 'w' + stem
        
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

def link_audio_to_curriculum():
    if not CURRICULUM_FILE.exists():
        return
    cache_files = set(f.name for f in TARGET_DIR.iterdir() if f.name.endswith('.mp3'))

    with open(CURRICULUM_FILE, 'r', encoding='utf-8') as f:
        text = f.read()

    m = re.search(r'window\.CURRICULUM_GRADE_1\s*=\s*(\{.*?\});\s*(?:window|$)', text, re.DOTALL)
    if not m:
        return

    curriculum = json.loads(m.group(1))
    updated_count = 0

    for u in curriculum.get('units', []):
        for l in u.get('lessons', []):
            lid = l.get('lessonId', '')
            prefix = f"{lid.split('_')[0]}_{lid.split('_')[1]}"
            for s in l.get('sessions', []):
                snum = s.get('sessionNum', 1)
                whys = s.get('whyQuestions', [])
                for w_idx, w in enumerate(whys, 1):
                    expected_key = f"why_{prefix}_s{snum}_q{w_idx}"
                    expected_mp3 = f"{expected_key}.mp3"
                    curr_audio = w.get('audio')

                    if (not curr_audio or curr_audio == expected_key) and expected_mp3 in cache_files:
                        if w.get('audio') != expected_key:
                            w['audio'] = expected_key
                            updated_count += 1
                            print(f"   🔗 Linked: {expected_key} -> {w.get('q')}")

    if updated_count > 0:
        new_json = json.dumps(curriculum, ensure_ascii=False, indent=2)
        new_text = re.sub(
            r'window\.CURRICULUM_GRADE_1\s*=\s*\{.*?\};\s*(?:window|$)',
            f'window.CURRICULUM_GRADE_1 = {new_json};\n',
            text,
            flags=re.DOTALL
        )
        with open(CURRICULUM_FILE, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f"✨ Successfully linked {updated_count} question(s) in curriculum_data.js!")
    else:
        print("⚡ All existing why audios already linked in curriculum_data.js.")

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

    link_audio_to_curriculum()

    print(f"\n✨ Summary: Found {found_count} source recording(s), synced {synced_count} file(s).")
    return updated_files

if __name__ == '__main__':
    sync_recordings()
