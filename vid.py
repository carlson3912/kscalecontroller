import os
import sys
import subprocess

VIDEO_URL = "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4"
TARGET_DIR = os.path.expanduser("~/videos")
TARGET_FILE = os.path.join(TARGET_DIR, "BigBuckBunny_320x180.mp4")

def download_with_wget(url, target):
    print("Trying to download with wget...")
    try:
        subprocess.run(["wget", "-O", target, url], check=True)
        print("Download completed.")
        return True
    except subprocess.CalledProcessError:
        print("wget download failed.")
        return False

def download_with_requests(url, target):
    print("Downloading with requests...")
    try:
        import requests
    except ImportError:
        print("requests module not installed.")
        return False

    try:
        r = requests.get(url, stream=True)
        r.raise_for_status()
        with open(target, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        print("Download completed.")
        return True
    except Exception as e:
        print(f"Download failed: {e}")
        return False

def main():
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)
        print(f"Created directory {TARGET_DIR}")

    if os.path.exists(TARGET_FILE):
        print(f"File already exists at {TARGET_FILE}")
        return

    if not download_with_wget(VIDEO_URL, TARGET_FILE):
        if not download_with_requests(VIDEO_URL, TARGET_FILE):
            print("Failed to download video file. Please download manually.")
            sys.exit(1)

if __name__ == "__main__":
    main()
