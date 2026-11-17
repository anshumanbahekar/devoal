"""Package the original Devoal interface with its real logos and prepared lessons."""

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "apps" / "prototype" / "dist"
DEST.mkdir(parents=True, exist_ok=True)
shutil.copy2(ROOT / "apps" / "prototype" / "index.html", DEST / "index.html")
shutil.copy2(ROOT / "apps" / "prototype" / "style.css", DEST / "style.css")
shutil.copy2(ROOT / "apps" / "prototype" / "app.js", DEST / "app.js")
shutil.copy2(ROOT / "apps" / "prototype" / "interview.js", DEST / "interview.js")
company_icons = DEST / "company-icons"
company_icons.mkdir(exist_ok=True)
for source in (ROOT / "apps" / "prototype" / "company-icons").glob("*.svg"):
    shutil.copy2(source, company_icons / source.name)
shutil.copy2(ROOT / "apps" / "web" / "public" / "devoal-logo.png", DEST / "favicon.png")

icons = DEST / "icons"
icons.mkdir(exist_ok=True)
for source in (ROOT / "apps" / "web" / "public" / "icons").glob("*.svg"):
    shutil.copy2(source, icons / source.name)

challenges = []
for source in sorted((ROOT / "content" / "challenges").glob("*.json")):
    challenges.extend(json.loads(source.read_text(encoding="utf-8")))
patterns = json.loads((ROOT / "content" / "interview-patterns.json").read_text(encoding="utf-8"))
for challenge in challenges:
    if not challenge.get("topic"):
        challenge["topic"] = next((pattern["title"] for pattern in patterns if challenge["id"] in pattern["problems"]), "Algorithms")
(DEST / "challenges.json").write_text(json.dumps(challenges), encoding="utf-8")
(DEST / "interview-patterns.json").write_text(json.dumps(patterns), encoding="utf-8")
shutil.copy2(ROOT / "content" / "interview-hints.json", DEST / "interview-hints.json")
shutil.copy2(ROOT / "content" / "interview-companies.json", DEST / "interview-companies.json")

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

print(f"Packaged original UI, {len(list(icons.glob('*.svg')))} logos, {count} lessons and {len(challenges)} challenges")
