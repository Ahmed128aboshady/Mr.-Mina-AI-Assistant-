import os
import sys
import subprocess
import shutil

REC_DIR = r"D:\Mina\ريكوردات المدرس"
AUDIO_CACHE = r"D:\Mina\app\audio_cache"

# Define mappings from relative path in REC_DIR to target filename(s) in audio_cache
AUDIO_MAPPINGS = {
    # القسم الاول
    r"القسم الاول\WhatsApp Ptt 2026-09-17 at 3.02.10 PM.ogg": ["intro_session_1.mp3"],
    r"القسم الاول\WhatsApp Ptt 2026-09-17 at 3.02.20 PM.ogg": ["intro_session_2.mp3"],
    r"القسم الاول\WhatsApp Ptt 2026-09-17 at 3.02.57 PM.ogg": ["welcome_mr_mena.mp3"],

    # القسم الثاني\الوحده الاولي
    r"القسم الثاني\الوحده الاولي\WhatsApp Ptt 2026-09-17 at 3.03.55 PM.ogg": ["u1_l1_s1.mp3"],
    r"القسم الثاني\الوحده الاولي\WhatsApp Ptt 2026-09-17 at 3.04.40 PM.ogg": ["u1_l1_s2.mp3"],
    r"القسم الثاني\الوحده الاولي\WhatsApp Ptt 2026-09-17 at 3.05.30 PM.ogg": ["u1_l2_s1.mp3"],
    r"القسم الثاني\الوحده الاولي\WhatsApp Ptt 2026-09-17 at 3.06.17 PM.ogg": ["u1_l2_s2.mp3"],
    r"القسم الثاني\الوحده الاولي\WhatsApp Ptt 2026-09-17 at 3.06.59 PM.ogg": ["u1_l3_s1.mp3"],
    r"القسم الثاني\الوحده الاولي\WhatsApp Ptt 2026-09-17 at 3.07.48 PM.ogg": ["u1_l3_s2.mp3"],
    r"القسم الثاني\الوحده الاولي\WhatsApp Ptt 2026-09-17 at 3.08.52 PM.ogg": ["u1_l4_s1.mp3"],
    r"القسم الثاني\الوحده الاولي\WhatsApp Ptt 2026-09-17 at 3.09.32 PM.ogg": ["u1_l4_s2.mp3"],

    # القسم الثاني\الوحده التانيه
    r"القسم الثاني\الوحده التانيه\WhatsApp Ptt 2026-09-17 at 3.10.43 PM.ogg": ["u2_l1_s1.mp3"],
    r"القسم الثاني\الوحده التانيه\WhatsApp Ptt 2026-09-17 at 3.11.22 PM.ogg": ["u2_l1_s2.mp3"],
    r"القسم الثاني\الوحده التانيه\WhatsApp Ptt 2026-09-17 at 3.12.17 PM.ogg": ["u2_l2_s1.mp3"],
    r"القسم الثاني\الوحده التانيه\WhatsApp Ptt 2026-09-17 at 3.12.59 PM.ogg": ["u2_l2_s2.mp3"],

    # القسم الثاني\الوحده التالته
    r"القسم الثاني\الوحده التالته\WhatsApp Ptt 2026-09-17 at 3.13.59 PM.ogg": ["u3_l1_s1.mp3"],
    r"القسم الثاني\الوحده التالته\WhatsApp Ptt 2026-09-17 at 3.14.49 PM.ogg": ["u3_l1_s2.mp3"],
    r"القسم الثاني\الوحده التالته\WhatsApp Ptt 2026-09-17 at 3.16.15 PM.ogg": ["u3_l2_s1.mp3"],
    r"القسم الثاني\الوحده التالته\WhatsApp Ptt 2026-09-17 at 3.22.25 PM.ogg": ["u3_l2_s2.mp3"],

    # القسم الثاني\الوحده الرابعه
    r"القسم الثاني\الوحده الرابعه\WhatsApp Ptt 2026-09-17 at 3.23.37 PM.ogg": ["u4_l1_s1.mp3"],
    r"القسم الثاني\الوحده الرابعه\WhatsApp Ptt 2026-09-17 at 3.24.37 PM.ogg": ["u4_l1_s2.mp3", "u4_l2_s1.mp3"],

    # القسم التالت (المعمل التفاعلي)
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.25.26 PM.ogg": ["lab_atom_C.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.25.39 PM.ogg": ["lab_atom_H.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.25.50 PM.ogg": ["lab_atom_He.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.26.05 PM.ogg": ["lab_atom_O.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.26.23 PM.ogg": ["lab_atom_Na.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.26.43 PM.ogg": ["lab_density_wood.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.26.56 PM.ogg": ["lab_density_oil.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.27.05 PM.ogg": ["lab_density_cork.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.27.20 PM.ogg": ["lab_density_iron.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.27.35 PM.ogg": ["lab_bond_ionic.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.27.47 PM.ogg": ["lab_bond_covalent.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.28.00 PM.ogg": ["lab_cell_plant.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.28.14 PM.ogg": ["lab_cell_animal.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.28.23 PM.ogg": ["lab_eclipse_solar.mp3"],
    r"القسم التالت\WhatsApp Ptt 2026-09-17 at 3.28.32 PM.ogg": ["lab_eclipse_lunar.mp3"],

    # القسم الرابع (الكويزات)
    r"القسم الرابع\WhatsApp Ptt 2026-09-17 at 3.28.59 PM.ogg": ["quiz_correct_1.mp3"],
    r"القسم الرابع\WhatsApp Ptt 2026-09-17 at 3.29.07 PM.ogg": ["quiz_correct_2.mp3"],
    r"القسم الرابع\WhatsApp Ptt 2026-09-17 at 3.29.20 PM.ogg": ["quiz_wrong_1.mp3"],
    r"القسم الرابع\WhatsApp Ptt 2026-09-17 at 3.29.32 PM.ogg": ["quiz_wrong_2.mp3"],

    # أسئلة علل والقسم الخامس
    r"القسم الخامس\WhatsApp Ptt 2026-09-17 at 3.30.42 PM.ogg": ["why_atom_positive.mp3"],
    r"الدرس التاني\WhatsApp Ptt 2026-09-17 at 3.33.00 PM.ogg": ["why_classify_elements.mp3"],
    r"الدرس التاني\WhatsApp Ptt 2026-09-17 at 3.34.04 PM.ogg": ["why_group_elements_similar.mp3"],
    r"الدرس التالت\WhatsApp Ptt 2026-09-17 at 3.36.05 PM.ogg": ["why_equal_volumes_diff_mass.mp3"],
    r"الدرس الرابع\WhatsApp Ptt 2026-09-17 at 3.46.22 PM.ogg": ["why_petrol_fire_water.mp3"]
}

def clean_audio_cache():
    print("Purging all old synthetic/AI files from audio_cache...")
    if not os.path.exists(AUDIO_CACHE):
        os.makedirs(AUDIO_CACHE, exist_ok=True)
        return

    for filename in os.listdir(AUDIO_CACHE):
        file_path = os.path.join(AUDIO_CACHE, filename)
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error deleting {filename}: {e}")
    print("audio_cache completely cleaned!")

def convert_audio():
    print(f"Starting conversion of {len(AUDIO_MAPPINGS)} teacher recordings...")
    converted_count = 0
    
    for rel_path, targets in AUDIO_MAPPINGS.items():
        src_path = os.path.join(REC_DIR, rel_path)
        if not os.path.exists(src_path):
            print(f"WARNING: Source file not found: {src_path}")
            continue

        first_target = os.path.join(AUDIO_CACHE, targets[0])
        # Convert using ffmpeg to high quality MP3
        cmd = [
            "ffmpeg", "-y", "-i", src_path,
            "-codec:a", "libmp3lame",
            "-qscale:a", "2",
            first_target
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            print(f"ERROR converting {rel_path}: {res.stderr.decode('utf-8', errors='ignore')}")
            continue
        
        converted_count += 1
        print(f"Converted: {rel_path} -> {targets[0]}")

        # If there are additional aliases/targets, copy the converted file
        for add_target in targets[1:]:
            dest = os.path.join(AUDIO_CACHE, add_target)
            shutil.copy2(first_target, dest)
            print(f"  Copied alias: {add_target}")

    print(f"\nAll done! Successfully converted {converted_count} files into {AUDIO_CACHE}.")

if __name__ == "__main__":
    clean_audio_cache()
    convert_audio()
