from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import textwrap

W, H = 1200, 630
BG_COLOR = (248, 250, 252)
TITLE = "TipSplit"
SUBTITLE = "Hospitality-ready tip calculator"
BODY = "Tip, tax, service, exports, and insights — shareable in seconds."

OUTPUT = Path(__file__).resolve().parents[1] / "public" / "og.png"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

def load_font(name: str, size: int):
  try:
    return ImageFont.truetype(name, size)
  except OSError:
    return ImageFont.load_default()

card = Image.new("RGB", (W, H), BG_COLOR)
draw = ImageDraw.Draw(card)

TITLE_FONT = load_font("arial.ttf", 64)
BODY_FONT = load_font("arial.ttf", 32)

padding = 80

draw.text((padding, padding), TITLE, font=TITLE_FONT, fill=(15, 23, 42))
draw.text((padding, padding + 90), SUBTITLE, font=BODY_FONT, fill=(30, 41, 59))
wrapped = textwrap.fill(BODY, width=40)
draw.text((padding, padding + 160), wrapped, font=BODY_FONT, fill=(71, 85, 105))

badge_coords = (padding, H - 140, padding + 420, H - 60)
draw.rounded_rectangle(badge_coords, radius=24, fill=(15, 23, 42))
draw.text((padding + 20, H - 120), "ADVANCED TIP CALCULATION", font=BODY_FONT, fill=(248, 250, 252))

draw.text((W - 320, H - 120), "tipsplit.app", font=BODY_FONT, fill=(51, 65, 85))

card.save(OUTPUT)
print(f"Saved OG image -> {OUTPUT}")
