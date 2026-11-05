#!/usr/bin/env python3
"""W10-B · full tracked-tree comparison against the frozen baseline commit.

Read-only: for every blob recorded in `git ls-tree -r <base>` of the main repo,
hash the corresponding tree file with filter-aware `git hash-object --path`
(so CRLF/autocrlf does not produce false positives) and compare.

Usage:
  python -I docs/evidence/W10-B/tools/verify_all_tracked.py <TREE> <MAIN_REPO> <BASE>

Output: relative paths only; writes docs/evidence/W10-B/runs/isolation-check-all.txt.
"""
import subprocess, os, sys

tree, main, base = sys.argv[1], sys.argv[2], sys.argv[3]
res = subprocess.run(["git", "-C", main, "ls-tree", "-r", "-z", base], capture_output=True)
if res.returncode != 0:
    print("GIT_LS_TREE_FAILED", res.returncode)
    print(res.stderr.decode("utf-8", "replace"))
    sys.exit(2)

entries = {}
for rec in res.stdout.split(b"\0"):
    if not rec:
        continue
    meta, path = rec.split(b"\t", 1)
    mode, typ, h = meta.split()
    if typ == b"blob":
        entries[path.decode("utf-8")] = h.decode()

mismatch, missing, ok = [], [], 0
for rel, h in sorted(entries.items()):
    p = os.path.join(tree, rel.replace("/", os.sep))
    if not os.path.exists(p):
        missing.append(rel)
        continue
    r = subprocess.run(
        ["git", "-C", main, "hash-object", "--path=" + rel, "--", p],
        capture_output=True,
        text=True,
    )
    if r.stdout.strip() != h:
        mismatch.append(rel)
    else:
        ok += 1

lines = [
    "BASELINE_COMMIT=" + base,
    "TOTAL_TRACKED_BLOBS=" + str(len(entries)),
    "MATCH=" + str(ok),
    "MISMATCH=" + str(len(mismatch)),
]
for x in mismatch:
    lines.append("MISMATCH_FILE=" + x)
lines.append("MISSING=" + str(len(missing)))
for x in missing:
    lines.append("MISSING_FILE=" + x)
lines.append("JUDGMENT=" + ("PASS" if not mismatch and not missing else "FAIL"))
txt = "\n".join(lines) + "\n"
out = os.path.join(tree, "docs", "evidence", "W10-B", "runs", "isolation-check-all.txt")
open(out, "w", encoding="utf-8", newline="\n").write(txt)
print(txt, end="")
