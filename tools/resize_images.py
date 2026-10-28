"""Make small, phone-friendly copies of the exercise illustrations.

Originals (big PNGs, ~1.2 MB each) live in images/exercises/ and are never changed.
This script writes 800 x 800 JPEG copies (~60 KB each) to img/exercises/, which is
what the app actually loads.

Run it from the project folder after adding or changing an illustration:
    python3 tools/resize_images.py

It uses `sips`, the image tool built into macOS, so nothing needs installing.
Only images that are new or changed since the last run get converted.
"""

import subprocess
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
ORIGINALS = PROJECT / "images" / "exercises"
COPIES = PROJECT / "img" / "exercises"

SIZE = 800      # longest side, in pixels (sharp enough for a phone screen)
QUALITY = 72    # JPEG quality, 0-100 (lower = smaller file, blurrier picture)


def main():
    COPIES.mkdir(parents=True, exist_ok=True)
    made = 0

    for original in sorted(ORIGINALS.glob("*.png")):
        copy = COPIES / (original.stem + ".jpg")

        # Skip if the copy exists and is newer than the original.
        if copy.exists() and copy.stat().st_mtime >= original.stat().st_mtime:
            continue

        subprocess.run(
            ["sips", "-Z", str(SIZE),
             "-s", "format", "jpeg",
             "-s", "formatOptions", str(QUALITY),
             str(original), "--out", str(copy)],
            check=True,
            capture_output=True,  # hide sips' own chatter
        )
        size_kb = copy.stat().st_size // 1024
        print(f"  {original.name} -> img/exercises/{copy.name} ({size_kb} KB)")
        made += 1

    print(f"Done: {made} image(s) converted.")


if __name__ == "__main__":
    main()
