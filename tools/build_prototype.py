"""Package the original Devoal interface with its real logos and prepared lessons."""

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "apps" / "prototype" / "dist"
DEST.mkdir(parents=True, exist_ok=True)
shutil.copy2(ROOT / "apps" / "prototype" / "index.html", DEST / "index.html")

icons = DEST / "icons"
icons.mkdir(exist_ok=True)
for source in (ROOT / "apps" / "web" / "public" / "icons").glob("*.svg"):
    shutil.copy2(source, icons / source.name)

def slug(text: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", text.lower()))[:60]

count = 0
for source in (ROOT / "content" / "lessons").glob("*/*.json"):
    lesson = json.loads(source.read_text(encoding="utf-8"))
    target_dir = DEST / "lessons" / lesson["language"]
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{slug(lesson['topic'])}.json"
    target.write_text(json.dumps({key: lesson[key] for key in ("explain", "file", "code", "exercise", "tip")}), encoding="utf-8")
    count += 1

print(f"Packaged original UI, {len(list(icons.glob('*.svg')))} logos and {count} lessons")
