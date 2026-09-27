#!/usr/bin/env python3
"""Generate VOIDBOOK black PNG icons — pure stdlib, no Pillow needed."""
import os, struct, zlib, sys

def chunk(typ, data):
    c = struct.pack(">I", len(data)) + typ + data
    c += struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)
    return c

def make_png(path, size, rgb):
    """Write a solid-color RGBA PNG."""
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    row = b"\x00" + bytes(rgb + (255,)) * size
    raw = row * size
    idat = zlib.compress(raw, 9)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)
    print(f"  ✓ {path} ({size}x{size})")

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "mobile/assets"
    make_png(os.path.join(out, "icon.png"),          1024, (0, 0, 0))
    make_png(os.path.join(out, "adaptive-icon.png"), 1024, (0, 0, 0))
    make_png(os.path.join(out, "splash.png"),        1024, (0, 0, 0))
    make_png(os.path.join(out, "favicon.png"),        48,  (0, 0, 0))

if __name__ == "__main__":
    main()
