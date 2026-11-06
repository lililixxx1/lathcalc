# -*- coding: utf-8 -*-
"""A4-R2 re-review: same protocol as round 1, fresh crops + measures."""
from PIL import Image, ImageChops
import os

BASE = r"C:\Users\Administrator\Desktop\ccc\q-novel\CNC Machinist Calculator\docs\evidence\V4.3-FIG\runs"
OUT  = r"C:\Users\Administrator\Desktop\ccc\q-novel\CNC Machinist Calculator\docs\evidence\V4.3-FIG\tools\crops-a4-r2"

shots = {
    "ac01a": "p06-ac01-param-a-390x844.png",
    "ac01b": "p06-ac01-param-b-390x844.png",
    "ac05a": "p06-ac05-param-a-390x844.png",
    "ac05b": "p06-ac05-param-b-390x844.png",
    "ac02":  "p06-ac02-static-390x844.png",
}
CARD = (36, 208, 744, 432)

imgs = {}
for k, name in shots.items():
    imgs[k] = Image.open(os.path.join(BASE, name)).convert("RGB")
    print(k, imgs[k].size)

crops = {
    "ac01a-card":  ("ac01a", CARD, 2),
    "ac01b-card":  ("ac01b", CARD, 2),
    "ac05a-card":  ("ac05a", CARD, 2),
    "ac05b-card":  ("ac05b", CARD, 2),
    "ac02-card":   ("ac02",  CARD, 2),
    "ac01a-label": ("ac01a", (300, 250, 470, 360), 6),
    "ac01b-label": ("ac01b", (300, 250, 470, 360), 6),
    "ac01b-baseline": ("ac01b", (290, 320, 500, 432), 8),
    "ac01a-baseline": ("ac01a", (290, 350, 500, 430), 8),
    "ac05a-fillet":("ac05a", (330, 230, 500, 340), 6),
    "ac05b-fillet":("ac05b", (330, 230, 500, 340), 6),
    "ac02-dz":     ("ac02",  (250, 270, 530, 420), 4),
}
for k, (shot, box, zoom) in crops.items():
    im = imgs[shot].crop(box)
    im = im.resize((im.width*zoom, im.height*zoom), Image.NEAREST)
    im.save(os.path.join(OUT, k + ".png"))
    print("saved", k, im.size)

def diff(ka, kb, tag):
    a = imgs[ka].crop(CARD); b = imgs[kb].crop(CARD)
    d = ImageChops.difference(a, b).convert("L")
    px = list(d.getdata())
    nz = sum(1 for v in px if v > 24)
    print("diff %s: changed(>24)=%d/158592 = %.2f%% bbox=%s" % (tag, nz, 100.0*nz/len(px), d.point(lambda v: 255 if v>24 else 0).getbbox()))
    d.point(lambda v: 255 if v > 24 else 0).save(os.path.join(OUT, "diff-%s.png" % tag))

diff("ac01a", "ac01b", "ac01-a-vs-b")
diff("ac05a", "ac05b", "ac05-a-vs-b")
diff("ac01a", "ac01a", "control-self")

# ---- measures (same protocol as round 1) ----
g = {k: im.convert("L") for k, im in imgs.items()}

def rows_report(img, y0, y1, thr=140, topn=8):
    px = img.load(); res = []
    for y in range(y0, y1):
        xs = [x for x in range(40, img.width-40) if px[x, y] < thr]
        if xs:
            res.append((y, min(xs), max(xs), len(xs), max(xs)-min(xs)+1))
    res.sort(key=lambda r: -r[4])
    return res[:topn]

for k in ("ac01a", "ac01b", "ac05a", "ac05b"):
    print("=== %s baseline rows (long-span rows y340-430):" % k)
    px = g[k].load()
    for y in range(340, 430):
        xs = [x for x in range(40, g[k].width-40) if px[x, y] < 160]
        if xs and max(xs)-min(xs) > 100:
            print("   y=%d xmin=%d xmax=%d span=%d n=%d" % (y, min(xs), max(xs), max(xs)-min(xs)+1, len(xs)))

for k in ("ac05a", "ac05b"):
    px = g[k].load(); out = {}
    for x in range(460, 515):
        ys = [y for y in range(210, 430) if px[x, y] < 140]
        if ys: out[x] = (min(ys), max(ys))
    longest = max(out.items(), key=lambda kv: kv[1][1]-kv[1][0])
    print(k, "right vertical line: x=%d ytop=%d ybot=%d len=%d" % (longest[0], longest[1][0], longest[1][1], longest[1][1]-longest[1][0]))
    print("=== %s left dia line rows y290-345 top3:" % k)
    for r in rows_report(g[k], 290, 345)[:3]:
        print("   y=%d xmin=%d xmax=%d n=%d span=%d" % r)

# arc low extent ac01 shots, x 360..440, report per-row dark xs below baseline zone
for k, ybase in (("ac01a", 390), ("ac01b", 350)):
    px = g[k].load()
    lowest = None
    for y in range(ybase, 440):
        xs = [x for x in range(360, 445) if px[x, y] < 140]
        if xs: lowest = (y, min(xs), max(xs), len(xs))
    print(k, "lowest dark row in x360-445 from y%d: %s" % (ybase, lowest))

# text row vs arc overlap ac01b: text bbox rows, arc xs inside text x-range
px = g["ac01b"].load()
print("ac01b rows y355..400, dark xs in x365..445 (text+arc):")
for y in range(355, 400, 3):
    xs = [x for x in range(365, 445) if px[x, y] < 140]
    print("   y=%d xs=%s" % (y, xs))
