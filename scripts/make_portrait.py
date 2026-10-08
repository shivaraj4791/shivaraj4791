#!/usr/bin/env python3
"""make_portrait.py
Converts a developer photo into a typewriter-animated ASCII SVG portrait
matching the aesthetic of https://github.com/andriidrok1.
"""

import argparse
import os
import sys
import cv2
import numpy as np
from PIL import Image

RAMP = " .:-=+*cs#%@"     # bright/sparse -> dark/dense; leading space = blank
COLS = 80                 # grid columns
CLAHE_CLIP = 2.8          # skin and edge contrast
CURVE = 1.65              # contrast curve
ROW_RATIO = 0.48          # monospace font aspect ratio (height vs width)
FG_LIGHT = "#6e7681"      # GitHub light mode foreground
FG_DARK = "#c9d1d9"       # GitHub dark mode foreground
CHAR_W = 7.74             # 0.600 em at FONT_SIZE
FONT_SIZE = 12.9
LINE_H = 15
ROW_DELAY = 0.08          # seconds per row stagger
FAMILY = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"


def prep_image(path, crop=None):
    """Clean background, enhance face and glasses edges, then apply contrast curve."""
    src = Image.open(path).convert("RGB")
    if crop:
        src = src.crop(crop)
    else:
        # Default smart crop for Shiva Raj's profile photo
        w, h = src.size
        src = src.crop((int(w * 0.14), int(h * 0.08), int(w * 0.86), int(h * 0.96)))

    np_src = np.array(src)
    gray = cv2.cvtColor(np_src, cv2.COLOR_RGB2GRAY)

    # Detect light background wall & vignetting
    # Background in the photo has luminance > 195 and low saturation
    hsv = cv2.cvtColor(np_src, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    bg_mask = (value > 195) & (saturation < 35)

    # Edge preservation and skin tone smoothing
    smooth = cv2.bilateralFilter(gray, 9, 65, 65)
    clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP, tileGridSize=(8, 8)).apply(smooth)

    # Force background mask to white (blank ramp character)
    clahe[bg_mask] = 255

    # Circular vignette cleanup if present
    gh, gw = gray.shape
    cy, cx = gh // 2, gw // 2
    y_coords, x_coords = np.ogrid[:gh, :gw]
    dist_from_center = np.sqrt((x_coords - cx) ** 2 + ((y_coords - cy) * 1.1) ** 2)
    outer_mask = dist_from_center > (min(gh, gw) * 0.58)
    clahe[outer_mask] = 255

    # Contrast curve
    curved = (255.0 * (clahe / 255.0) ** CURVE).astype("uint8")
    return Image.fromarray(curved)


def to_lines(img, cols=COLS):
    """Maps grayscale pixel values to ASCII character lines."""
    w, h = img.size
    rows = int(cols * (h / w) * ROW_RATIO)
    resized = img.resize((cols, rows), Image.Resampling.LANCZOS)
    
    px = list(resized.getdata())
    n = len(RAMP)

    out = []
    for r in range(rows):
        line = "".join(
            RAMP[min(n - 1, int((1 - px[r * cols + c] / 255.0) * n))]
            for c in range(cols)
        ).rstrip()
        out.append(line)

    # Trim empty leading/trailing blank rows
    while out and not out[0].strip():
        out.pop(0)
    while out and not out[-1].strip():
        out.pop()

    return out


def build_svg(lines, cols=COLS):
    """Builds the animated SMIL typewriter SVG."""
    pad = 14
    width = int(cols * CHAR_W + pad * 2)
    height = len(lines) * LINE_H + pad * 2

    p = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" font-family="{FAMILY}">',
        f'<style>.a{{fill:{FG_LIGHT}}}@media(prefers-color-scheme:dark){{.a{{fill:{FG_DARK}}}}}</style>'
    ]

    for i, line in enumerate(lines):
        y = pad + i * LINE_H
        begin = f"{i * ROW_DELAY:.2f}s"
        end = f"{(i + 1) * ROW_DELAY:.2f}s"
        w = max(len(line), 1) * CHAR_W
        safe = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        p.append(
            f'<clipPath id="c{i}"><rect x="{pad}" y="{y}" height="{LINE_H}" width="0">'
            f'<animate attributeName="width" from="0" to="{w:.1f}" begin="{begin}" dur="{ROW_DELAY}s" fill="freeze"/>'
            f'</rect></clipPath>'
        )
        p.append(
            f'<g clip-path="url(#c{i})"><text xml:space="preserve" x="{pad}" y="{y + 11.2:.1f}" '
            f'class="a" font-size="{FONT_SIZE}">{safe}</text></g>'
        )
        # Typewriter cursor block riding the wipe edge
        p.append(
            f'<rect y="{y + 1}" width="6" height="12" class="a" opacity="0">'
            f'<animate attributeName="x" from="{pad}" to="{pad + w:.1f}" begin="{begin}" dur="{ROW_DELAY}s" fill="freeze"/>'
            f'<set attributeName="opacity" to="0.8" begin="{begin}"/>'
            f'<set attributeName="opacity" to="0" begin="{end}"/>'
            f'</rect>'
        )

    p.append("</svg>")
    return "".join(p)


def main():
    ap = argparse.ArgumentParser(description="Generate animated ASCII SVG portrait")
    ap.add_argument("photo", nargs="?", default="assets/profile.jpg")
    ap.add_argument("out", nargs="?", default="ascii.svg")
    ap.add_argument("--cols", type=int, default=COLS)
    ap.add_argument("--preview", action="store_true", help="Print ASCII to terminal")
    args = ap.parse_args()

    if not os.path.exists(args.photo):
        sys.exit(f"Photo not found at {args.photo}")

    processed_img = prep_image(args.photo)
    lines = to_lines(processed_img, cols=args.cols)

    if args.preview:
        print("\n".join(lines))

    svg_content = build_svg(lines, cols=args.cols)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(svg_content)

    print(f"Generated {args.out} ({len(lines)} rows, {args.cols} cols)")

    # Inline JetBrains Mono font
    embed_script = os.path.join(os.path.dirname(__file__), "embed_portrait_font.py")
    if os.path.exists(embed_script):
        os.system(f'python "{embed_script}" "{args.out}"')


if __name__ == "__main__":
    main()
