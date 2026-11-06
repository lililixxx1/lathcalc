# -*- coding: utf-8 -*-
"""A4 quant check: baseline span, fillet/line geometry, O50 text-arc crossing crop."""
from PIL import Image
import os

BASE = r"C:\Users\Administrator\Desktop\ccc\q-novel\CNC Machinist Calculator\docs\evidence\V4.3-FIG\runs"
OUT  = r"C:\Users\Administrator\Desktop\ccc\q-novel\CNC Machinist Calculator\docs\evidence\V4.3-FIG\tools\crops-a4"

shots = {
    "ac01a": "p06-ac01-param-a-390x844.png",
    "ac01b": "p06-ac01-param-b-390x844.png",
    "ac05a": "p06-ac05-param-a-390x844.png",
    "ac05b": "p06-ac05-param-b-390x844.png",
}

imgs = {k: Image.open(os.path.join(BASE, v)).convert("L") for k, v in shots.items()}

def rows_report(img, y0, y1, thr=140):
    """for rows y0..y1 report dark-pixel min/max x and count (top 8 by count)"""
    w = img.width
    res = []
    px = img.load()
    for y in range(y0, y1):
        xs = [x for x in range(40, w-40) if px[x, y] < thr]
        if xs:
            res.append((y, min(xs), max(xs), len(xs), max(xs)-min(xs)+1))
    res.sort(key=lambda r: -r[4])
    return res[:8]

def col_report(img, x0, x1, y0=210, y1=430, thr=140):
    px = img.load()
    out = {}
    for x in range(x0, x1):
        ys = [y for y in range(y0, y1) if px[x, y] < thr]
        if ys:
            out[x] = (min(ys), max(ys), len(ys))
    return out

for k, im in imgs.items():
    print("=== ", k, " rows y360-430 top8 by span:")
    for r in rows_report(im, 360, 430):
        print("   y=%d xmin=%d xmax=%d n=%d span=%d" % r)

# right long vertical line columns (x 460..510) for ac05 shots
for k in ("ac05a", "ac05b"):
    cr = col_report(imgs[k], 460, 515)
    longest = max(cr.items(), key=lambda kv: kv[1][1]-kv[1][0])
    print(k, "right vertical line: x=%d ytop=%d ybot=%d len=%d" % (longest[0], longest[1][0], longest[1][1], longest[1][1]-longest[1][0]))

# left diameter line y position: rows 290..340 top3 by span
for k in ("ac05a", "ac05b"):
    print("=== ", k, " left dia line rows y290-345 top3:")
    for r in rows_report(imgs[k], 290, 345)[:3]:
        print("   y=%d xmin=%d xmax=%d n=%d span=%d" % r)

# arc lowest point for ac01 shots: dark pixels in x 370..430 below y 380
for k in ("ac01a", "ac01b"):
    px = imgs[k].load()
    low = None
    for y in range(380, 440):
        for x in range(360, 440):
            if px[x, y] < 140:
                low = (x, y)
    print(k, "arc lowest dark pixel (x,y) below y380:", low)

# zoom crops: baseline text area for ac01a / ac01b
for tag, fn, box in [
    ("ac01a-baseline", "p06-ac01-param-a-390x844.png", (290, 350, 500, 430)),
    ("ac01b-baseline", "p06-ac01-param-b-390x844.png", (290, 330, 500, 432)),
]:
    im = Image.open(os.path.join(BASE, fn)).crop(box)
    im = im.resize((im.width*8, im.height*8), Image.NEAREST)
    im.save(os.path.join(OUT, tag + ".png"))
    print("saved", tag, im.size)
