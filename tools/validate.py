#!/usr/bin/env python3
"""Checks the shape of every lesson file. Errors fail CI, warnings are style hints."""
import json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
REQ = ["id","language","topic","title","stage","order","explain","file","code","exercise","tip","verify","review"]
MODES = {"python","python-compile","sqlite","sqlite-expect-fail","node","tsc-run","go-run","java-run","manual"}
errors, warns, seen = [], [], set()
files = sorted((ROOT/"content"/"lessons").glob("*/*.json"))
for f in files:
    rel = f.relative_to(ROOT).as_posix()
    try: d = json.loads(f.read_text(encoding="utf-8"))
    except Exception as e: errors.append(f"{rel}: invalid JSON ({e})"); continue
    for k in REQ:
        if k not in d or d[k] in ("", None): errors.append(f"{rel}: missing '{k}'")
    if d.get("id") != f"{f.parent.name}/{f.stem}": errors.append(f"{rel}: id must be '{f.parent.name}/{f.stem}'")
    if d.get("id") in seen: errors.append(f"{rel}: duplicate id")
    seen.add(d.get("id"))
    if d.get("verify") not in MODES: errors.append(f"{rel}: unknown verify mode {d.get('verify')!r}")
    if d.get("review") not in ("unreviewed","reviewed"): errors.append(f"{rel}: review must be 'unreviewed' or 'reviewed'")
    if d.get("review") == "reviewed" and not d.get("reviewedBy"): errors.append(f"{rel}: 'reviewed' needs reviewedBy")
    sentences = len(re.findall(r"[.!?](\s|$)", re.sub(r"`[^`]*`", "X", d.get("explain",""))))
    if sentences != 3: warns.append(f"{rel}: explain has {sentences} sentences (style: 3)")
    if len(d.get("code","").split("\n")) > 24: warns.append(f"{rel}: code is long (>24 lines)")
for w in warns: print("warn ", w)
for e in errors: print("ERROR", e)
print(f"{len(files)} lessons checked: {len(errors)} errors, {len(warns)} warnings")
sys.exit(1 if errors else 0)
