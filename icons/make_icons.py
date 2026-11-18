#!/usr/bin/env python3
"""오늘도득템 앱 아이콘 생성 (PWA manifest / apple-touch-icon 용 PNG).
   2048px 로 그린 뒤 필요한 크기로 줄입니다."""
from PIL import Image, ImageDraw
import os

OUT = os.path.dirname(os.path.abspath(__file__))
S = 2048                      # 슈퍼샘플 캔버스 (512 * 4 → 4배)
K = S / 512.0


def px(v):
    return round(v * K)


def gradient(size):
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    c1, c2 = (0xFF, 0x7C, 0x57), (0xEE, 0x3C, 0x16)
    for i in range(size * 2):
        t = i / (size * 2 - 1)
        d.line([(0, i), (i, 0)], fill=tuple(round(c1[k] + (c2[k] - c1[k]) * t) for k in range(3)), width=2)
    return img


def sparkle(d, cx, cy, r, fill):
    """네 갈래 반짝이 (득템 표시)."""
    w = r * 0.30                      # 가운데 두께
    pts = [
        (cx, cy - r), (cx + w, cy - w), (cx + r, cy),
        (cx + w, cy + w), (cx, cy + r), (cx - w, cy + w),
        (cx - r, cy), (cx - w, cy - w),
    ]
    d.polygon(pts, fill=fill)


def bag_layer(size, scale=1.0):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    white = (255, 255, 255, 255)

    # 몸통 — 가로로 넓은 사다리꼴(아래가 살짝 좁음)
    d.rounded_rectangle([px(158), px(204), px(354), px(378)], radius=px(26), fill=white)

    # 손잡이 (몸통 위로 나온 반원)
    r, w = px(36), px(16)
    cx, top = px(256), px(206)
    d.arc([cx - r, top - r, cx + r, top + r], start=180, end=360, fill=white, width=w)

    # 가운데 반짝이 (득템!)
    sparkle(d, px(250), px(290), px(48), (0xFF, 0x5A, 0x36, 255))
    sparkle(d, px(304), px(334), px(17), (0xFF, 0x5A, 0x36, 255))

    if scale != 1.0:
        inner = layer.resize((round(size * scale), round(size * scale)), Image.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        off = (size - inner.width) // 2
        canvas.paste(inner, (off, off), inner)
        layer = canvas
    return layer


def make(rounded=True, content_scale=1.0):
    card = gradient(S).convert("RGBA")
    if rounded:
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, S - 1, S - 1], radius=round(S * 118 / 512), fill=255
        )
        base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        base.paste(card, (0, 0), mask)
    else:
        base = card
    base.alpha_composite(bag_layer(S, content_scale))
    return base


def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), "PNG", optimize=True)
    print("saved", name, size)


any_icon = make(rounded=True, content_scale=1.0)
maskable = make(rounded=False, content_scale=0.80)

save(any_icon, "icon-192.png", 192)
save(any_icon, "icon-512.png", 512)
save(maskable, "icon-maskable-192.png", 192)
save(maskable, "icon-maskable-512.png", 512)
save(make(rounded=False, content_scale=0.90), "apple-touch-icon.png", 180)
save(any_icon, "favicon-32.png", 32)
