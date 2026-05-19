#!/usr/bin/env python3
"""Generate iOS + Android app icons from a single 2048x2048 source PNG.

iOS: 1024x1024 no-alpha (App Store requirement)
Android legacy: ic_launcher.png + ic_launcher_round.png at 48/72/96/144/192
Android adaptive: ic_launcher_foreground.png at 108/162/216/324/432 with safe-zone scaling
"""
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parents[1]
SRC = Path.home() / "Downloads" / "slot-logo.png"
BG_COLOR = (42, 11, 74)  # dark purple matching logo

src = Image.open(SRC).convert("RGBA")
print(f"Source: {src.size}")

# --- iOS: 1024x1024 no alpha ---
ios_dir = REPO / "ios/App/App/Assets.xcassets/AppIcon.appiconset"
ios_dir.mkdir(parents=True, exist_ok=True)
ios = src.resize((1024, 1024), Image.LANCZOS)
flat = Image.new("RGB", (1024, 1024), BG_COLOR)
flat.paste(ios, (0, 0), ios)
flat.save(ios_dir / "AppIcon-512@2x.png", "PNG", optimize=True)
print(f"iOS: {ios_dir/'AppIcon-512@2x.png'}")

# --- Android legacy + round (ic_launcher.png, ic_launcher_round.png) ---
LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
res = REPO / "android/app/src/main/res"
for folder, size in LEGACY_SIZES.items():
    out_dir = res / folder
    resized = src.resize((size, size), Image.LANCZOS)
    # legacy square icon (keep alpha not needed but harmless)
    resized.save(out_dir / "ic_launcher.png", "PNG", optimize=True)
    # round mask
    mask = Image.new("L", (size, size), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    round_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    round_icon.paste(resized, (0, 0), mask)
    round_icon.save(out_dir / "ic_launcher_round.png", "PNG", optimize=True)
    print(f"Android legacy {folder}: {size}px")

# --- Android adaptive foreground (108dp safe zone = inner 66dp ≈ 61%) ---
# Foreground PNG is 108dp, but the visible area is only the inner 66dp.
# We scale the logo to ~70dp / 108dp = 65% so it sits inside the safe zone with breathing room.
ADAPTIVE_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}
SAFE_SCALE = 0.65
for folder, size in ADAPTIVE_SIZES.items():
    out_dir = res / folder
    inner = int(size * SAFE_SCALE)
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    logo = src.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    fg.paste(logo, (off, off), logo)
    fg.save(out_dir / "ic_launcher_foreground.png", "PNG", optimize=True)
    print(f"Android adaptive {folder}: {size}px (logo {inner}px)")

print("Done.")
