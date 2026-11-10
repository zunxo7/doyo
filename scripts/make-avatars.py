"""Crops the simulated workers' profile photos from the character art.

Writes backend/src/avatars/sim-<name>.webp (served by /api/worker-photo) and the website demo's
copies. Run from the repo root: python scripts/make-avatars.py
"""
import pathlib
import shutil

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP_ART = ROOT / "frontend/assets/images"
DESIGN_ART = ROOT / "design/art"
OUT = ROOT / "backend/src/avatars"
SITE = ROOT / "website/assets/avatars"

# Source image and the square around the face, in that image's pixels.
CROPS = {
    "sim-bilal": (APP_ART / "Illustration4.webp", (206, 50, 516, 360)),
    "sim-ayesha": (APP_ART / "Illustration4.webp", (760, 120, 1060, 420)),
    "sim-sana": (DESIGN_ART / "DoyoFemaleAvatar.png", (330, 40, 730, 440)),
    "sim-usman": (DESIGN_ART / "BarberServicesWorkerIcon.png", (330, 20, 930, 620)),
}
ACCENT = (0, 186, 240, 255)

OUT.mkdir(exist_ok=True)
for name, (source, box) in CROPS.items():
    face = Image.open(source).convert("RGBA").crop(box).resize((256, 256), Image.LANCZOS)
    tile = Image.new("RGBA", (256, 256), ACCENT)
    tile.alpha_composite(face)
    tile.convert("RGB").save(OUT / f"{name}.webp", "WEBP", quality=88)

# The website demo shows Ayesha and Sana.
SITE.mkdir(exist_ok=True)
for name in ("ayesha", "sana"):
    shutil.copy(OUT / f"sim-{name}.webp", SITE / f"{name}.webp")
print("avatars written to", OUT)
