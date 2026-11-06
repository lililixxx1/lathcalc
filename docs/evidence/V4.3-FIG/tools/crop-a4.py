# -*- coding: utf-8 -*-
"""A4 vision verify: crop/zoom figure card + pixel diff between shots."""
from PIL import Image, ImageChops
import os

BASE = r"C:\Users\Administrator\Desktop\ccc\q-novel\CNC Machinist Calculator\docs\evidence\V4.3-FIG\runs"
OUT  = r"C:\Users\Administrator\Desktop\ccc\q-novel\CNC Machinist Calculator\docs\evidence\V4.3-FIG\tools\crops-a4"

shots = {
    "ac01a": "p06-ac01-param-a-390x844.png",
    "ac01b": "p06-ac01-param-b-390x844.png",
    "ac05a": "p06-ac05-param-a-390x844.png",
    "ac05b": "p06-ac05-param-b-390x844.png",
    "ac02":  "p06-ac02-static-390x844.png",
}

# figure card region (whole white card, CSS ~36..744 x 208..432 at 2x)
CARD = (36, 208, 744, 432)

crops = {
    # key: (shot, box, zoom)
    "ac01a-card":  ("ac01a", CARD, 2),
    "ac01b-card":  ("ac01b", CARD, 2),
    "ac05a-card":  ("ac05a", CARD, 2),
    "ac05b-card":  ("ac05b", CARD, 2),
    "ac02-card":   ("ac02",  CARD, 2),
    # label close-ups, 6x
    "ac01a-label": ("ac01a", (300, 250, 470, 360), 6),
    "ac01b-label": ("ac01b", (300, 250, 470, 360), 6),
    "ac05a-fillet":("ac05a", (330, 230, 500, 340), 6),
    "ac05b-fillet":("ac05b", (330, 230, 500, 340), 6),
    "ac02-dz":     ("ac02",  (250, 270, 530, 420), 4),
}

imgs = {}
for k, name in shots.items():
    imgs[k] = Image.open(os.path.join(BASE, name)).convert("RGB")
    print(k, imgs[k].size)

for k, (shot, box, zoom) in crops.items():
    im = imgs[shot].crop(box)
    im = im.resize((im.width*zoom, im.height*zoom), Image.NEAREST)
    im.save(os.path.join(OUT, k + ".png"))
    print("saved", k, im.size)

# pixel diff between a/b pairs over the card region
def diff(ka, kb, tag):
    a = imgs[ka].crop(CARD); b = imgs[kb].crop(CARD)
    d = ImageChops.difference(a, b).convert("L")
    px = list(d.getdata())
    nz = sum(1 for v in px if v > 24)   # ignore antialias noise
    ratio = 100.0 * nz / len(px)
    print(f"diff {tag}: changed(>24)={nz}/{len(px)} = {ratio:.2f}%")
    # amplify diff map for visual record
    d2 = d.point(lambda v: 255 if v > 24 else 0)
    d2.save(os.path.join(OUT, f"diff-{tag}.png"))
    # bounding box of change
    print(f"diff {tag} bbox:", d2.getbbox())

diff("ac01a", "ac01b", "ac01-a-vs-b")
diff("ac05a", "ac05b", "ac05-a-vs-b")

# sanity: identical-name control (ac01a vs itself should be 0)
diff("ac01a", "ac01a", "control-self")
