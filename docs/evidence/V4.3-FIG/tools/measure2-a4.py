# -*- coding: utf-8 -*-
from PIL import Image
import os
BASE = r"C:\Users\Administrator\Desktop\ccc\q-novel\CNC Machinist Calculator\docs\evidence\V4.3-FIG\runs"
im = Image.open(os.path.join(BASE, "p06-ac01-param-b-390x844.png")).convert("L")
px = im.load()
# find long horizontal gray baseline rows y 340..372
for y in range(340, 375):
    xs = [x for x in range(40, im.width-40) if px[x, y] < 160]
    if xs and max(xs)-min(xs) > 100:
        print("baseline row y=%d xmin=%d xmax=%d span=%d n=%d" % (y, min(xs), max(xs), max(xs)-min(xs)+1, len(xs)))
# arc pixels between y 352..400, x 395..430 (exclude text x<=410 at y 358..375)
for y in range(352, 402, 4):
    xs = [x for x in range(395, 435) if px[x, y] < 140]
    print("y=%d dark xs in 395..435: %s" % (y, xs))
