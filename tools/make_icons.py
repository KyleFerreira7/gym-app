"""Draw the app icon (a dumbbell on the app's green) as PNG files.

These are the icons your phone shows on the home screen. Uses only Python's
built-in modules (no installs): it works out the colour of every pixel and
writes the PNG file format by hand.

Run it from the project folder after changing the colours or shapes:
    python3 tools/make_icons.py

Output: img/icons/icon-180.png (iPhone), icon-192.png and icon-512.png (others).
The dumbbell stays inside the middle 80% so phones that crop icons into
circles or squircles never cut it off.
"""

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "img" / "icons"

BACKGROUND = (47, 107, 79)    # --accent in css/style.css
FOREGROUND = (246, 244, 239)  # --bg in css/style.css
SIZES = [180, 192, 512]
SAMPLES = 4                    # 4 x 4 samples per pixel = smooth edges

# The dumbbell as rounded rectangles: (left, top, right, bottom, corner radius),
# measured from 0 to 1 across the icon.
SHAPES = [
    (0.29, 0.465, 0.71, 0.535, 0.02),   # bar
    (0.22, 0.30, 0.30, 0.70, 0.03),     # left inner plate
    (0.70, 0.30, 0.78, 0.70, 0.03),     # right inner plate
    (0.15, 0.37, 0.23, 0.63, 0.03),     # left outer plate
    (0.77, 0.37, 0.85, 0.63, 0.03),     # right outer plate
]


def inside(x, y):
    """Is the point (x, y) inside any of the shapes?"""
    for left, top, right, bottom, r in SHAPES:
        if left <= x <= right and top <= y <= bottom:
            # In a corner? Then it must also be inside the corner's circle.
            cx = min(max(x, left + r), right - r)
            cy = min(max(y, top + r), bottom - r)
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                return True
    return False


def draw(size):
    rows = []
    for py in range(size):
        row = bytearray([0])  # each PNG row starts with a "filter type" byte
        for px in range(size):
            hits = sum(
                inside((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size)
                for sx in range(SAMPLES) for sy in range(SAMPLES)
            )
            share = hits / (SAMPLES * SAMPLES)
            row += bytes(round(b + (f - b) * share) for b, f in zip(BACKGROUND, FOREGROUND))
        rows.append(bytes(row))
    return b"".join(rows)


def write_png(path, size, pixels):
    def chunk(kind, data):
        return (struct.pack(">I", len(data)) + kind + data
                + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF))

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
                     + chunk(b"IDAT", zlib.compress(pixels, 9)) + chunk(b"IEND", b""))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUT / f"icon-{size}.png"
        write_png(path, size, draw(size))
        print(f"  img/icons/{path.name} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
