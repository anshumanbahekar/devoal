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
challenge_files = sorted((ROOT/"content"/"challenges").glob("*.json"))
challenge_ids = set()
challenge_count = 0
for f in challenge_files:
    rel = f.relative_to(ROOT).as_posix()
    try: challenges = json.loads(f.read_text(encoding="utf-8"))
    except Exception as e: errors.append(f"{rel}: invalid JSON ({e})"); continue
    if not isinstance(challenges, list): errors.append(f"{rel}: expected an array"); continue
    for challenge in challenges:
        challenge_count += 1
        if not isinstance(challenge, dict): errors.append(f"{rel}: expected an object"); continue
        cid = challenge.get("id")
        if not isinstance(cid, str) or not re.fullmatch(r"[a-z0-9-]+", cid): errors.append(f"{rel}: invalid challenge id {cid!r}")
        if cid in challenge_ids: errors.append(f"{rel}: duplicate challenge id {cid!r}")
        challenge_ids.add(cid)
        for field in ("title", "function", "prompt", "starter"):
            if not isinstance(challenge.get(field), str) or not challenge[field].strip(): errors.append(f"{rel}/{cid}: missing {field}")
        if challenge.get("level") not in ("Easy", "Medium", "Hard"): errors.append(f"{rel}/{cid}: invalid level")
        tests = challenge.get("tests")
        if not isinstance(tests, list) or len(tests) < 2: errors.append(f"{rel}/{cid}: at least two tests required")
        else:
            for i, test in enumerate(tests):
                if not isinstance(test, dict) or not isinstance(test.get("args"), list) or "expected" not in test:
                    errors.append(f"{rel}/{cid}: invalid test {i+1}")
for w in warns: print("warn ", w)
for e in errors: print("ERROR", e)
print(f"{len(files)} lessons and {challenge_count} challenges checked: {len(errors)} errors, {len(warns)} warnings")
sys.exit(1 if errors else 0)
