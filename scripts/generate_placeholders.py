import os
import cv2
import numpy as np
import pandas as pd
import shutil

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOCAB_FILE = os.path.join(BASE_DIR, 'data', 'Vocabulary.csv')
ASSETS_DIR = os.path.join(BASE_DIR, 'public', 'Glosses', 'Videos', 'assets')
BLANK_VIDEO_PATH = os.path.join(BASE_DIR, 'scripts', 'blank.mp4')

def create_blank_video(filepath, duration=1, fps=30, width=640, height=480):
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filepath, fourcc, fps, (width, height))
    
    # Create a black frame
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Write frames for the specified duration
    for _ in range(int(fps * duration)):
        out.write(frame)
        
    out.release()
    print(f"Created blank video: {filepath}")

def main():
    # Ensure assets directory exists
    os.makedirs(ASSETS_DIR, exist_ok=True)
    
    # Create the blank video template
    if not os.path.exists(BLANK_VIDEO_PATH):
        create_blank_video(BLANK_VIDEO_PATH)
        
    # Read Vocabulary
    df = pd.read_csv(VOCAB_FILE)
    words = df.iloc[:, 0].dropna().tolist()
    
    created_count = 0
    skipped_count = 0
    
    for word in words:
        word = str(word).strip()
        if not word or word.lower() in ['sign', '0']:
            continue
            
        # Handle cases like "Day: Monday"
        if ':' in word:
            word = word.split(':', 1)[1].strip()
            
        word_upper = word.upper()
        target_path = os.path.join(ASSETS_DIR, f"{word_upper}.mp4")
        
        if not os.path.exists(target_path):
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            shutil.copy(BLANK_VIDEO_PATH, target_path)
            created_count += 1
        else:
            skipped_count += 1
            
    print(f"Done! Created {created_count} missing placeholders.")
    print(f"Skipped {skipped_count} existing videos.")

if __name__ == '__main__':
    main()
