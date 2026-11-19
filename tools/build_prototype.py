"""Package the original Devoal interface with its real logos and prepared lessons."""

import json
import os
import re
import shutil
from pathlib import Path

from validate_sql import checked_problems

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "apps" / "prototype" / "dist"
DEST.mkdir(parents=True, exist_ok=True)
shutil.copy2(ROOT / "apps" / "prototype" / "index.html", DEST / "index.html")
shutil.copy2(ROOT / "apps" / "prototype" / "style.css", DEST / "style.css")
shutil.copy2(ROOT / "apps" / "prototype" / "app.js", DEST / "app.js")
shutil.copy2(ROOT / "apps" / "prototype" / "interview.js", DEST / "interview.js")
shutil.copy2(ROOT / "apps" / "prototype" / "readiness.js", DEST / "readiness.js")
shutil.copy2(ROOT / "apps" / "prototype" / "readiness-language.js", DEST / "readiness-language.js")
shutil.copy2(ROOT / "apps" / "prototype" / "mock.js", DEST / "mock.js")
shutil.copy2(ROOT / "apps" / "prototype" / "python-practice.js", DEST / "python-practice.js")
shutil.copy2(ROOT / "apps" / "prototype" / "python-worker.mjs", DEST / "python-worker.js")
shutil.copy2(ROOT / "content" / "python-practice.json", DEST / "python-practice.json")
sql_problems = checked_problems()
(DEST / "sql-practice.json").write_text(json.dumps([{key: value for key, value in problem.items() if key != "solution"} for problem in sql_problems]), encoding="utf-8")
shutil.copy2(ROOT / "apps" / "prototype" / "sql-practice.js", DEST / "sql-practice.js")
shutil.copy2(ROOT / "apps" / "prototype" / "sql-worker.js", DEST / "sql-worker.js")
sql_vendor = DEST / "vendor"
sql_vendor.mkdir(exist_ok=True)
for filename in ("sql-wasm.js", "sql-wasm.wasm", "sql-js-LICENSE.txt"):
    shutil.copy2(ROOT / "apps" / "prototype" / "vendor" / filename, sql_vendor / filename)
shutil.copy2(ROOT / "apps" / "prototype" / "auth.js", DEST / "auth.js")
shutil.copy2(ROOT / "apps" / "prototype" / "auth-data.mjs", DEST / "auth-data.js")
tutor_url = os.environ.get("DEVOAL_TUTOR_API_URL", "")
(DEST / "tutor-config.json").write_text(json.dumps({"apiUrl": tutor_url}), encoding="utf-8")
shutil.copy2(ROOT / "apps" / "prototype" / "tutor.js", DEST / "tutor.js")
firebase_config = {key: os.environ.get(env, "") for key, env in {
    "apiKey": "DEVOAL_FIREBASE_API_KEY",
    "authDomain": "DEVOAL_FIREBASE_AUTH_DOMAIN",
    "projectId": "DEVOAL_FIREBASE_PROJECT_ID",
    "appId": "DEVOAL_FIREBASE_APP_ID",
}.items()}
(DEST / "firebase-config.json").write_text(json.dumps(firebase_config), encoding="utf-8")
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
companies = json.loads((ROOT / "content/interview-companies.json").read_text(encoding="utf-8"))
python_problems = json.loads((DEST / "python-practice.json").read_text(encoding="utf-8"))
library = []
for language, problems in (("javascript", challenges), ("python", python_problems), ("sql", sql_problems)):
    for problem in problems:
        entry = {key: problem[key] for key in ("id", "title", "level", "topic")}
        entry["language"] = language
        entry["companies"] = [company["id"] for company in companies
                              if language == "javascript" and problem["id"] in company["problems"]]
        library.append(entry)
(DEST / "library.json").write_text(json.dumps({
    "problems": library,
    "companies": {company["id"]: company["name"] for company in companies},
}), encoding="utf-8")
shutil.copy2(ROOT / "apps/prototype/library.js", DEST / "library.js")
(DEST / "interview-patterns.json").write_text(json.dumps(patterns), encoding="utf-8")
shutil.copy2(ROOT / "content" / "interview-hints.json", DEST / "interview-hints.json")
shutil.copy2(ROOT / "content" / "interview-companies.json", DEST / "interview-companies.json")
shutil.copy2(ROOT / "content" / "mock-scenarios.json", DEST / "mock-scenarios.json")

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
