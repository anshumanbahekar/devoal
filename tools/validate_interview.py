"""Validate interview pattern coverage and the packaged frontend contract."""

import json
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1]
challenge_files = sorted((root / "content" / "challenges").glob("*.json"))
challenges = [item for path in challenge_files for item in json.loads(path.read_text(encoding="utf-8"))]
patterns = json.loads((root / "content" / "interview-patterns.json").read_text(encoding="utf-8"))
hints = json.loads((root / "content" / "interview-hints.json").read_text(encoding="utf-8"))
companies = json.loads((root / "content" / "interview-companies.json").read_text(encoding="utf-8"))

ids = [item["id"] for item in challenges]
assert len(ids) == len(set(ids)), "Challenge IDs must be unique"
assert len(patterns) >= 6, "Interview prep needs several distinct patterns"
assert len({item["id"] for item in patterns}) == len(patterns), "Pattern IDs must be unique"

coverage = Counter(problem for pattern in patterns for problem in pattern["problems"])
assert set(coverage) == set(ids), f"Missing or unknown problems: {set(ids) ^ set(coverage)}"
assert all(count == 1 for count in coverage.values()), "Each challenge must belong to one primary pattern"
assert set(hints) == set(ids), "Each challenge needs its own hints"
assert all(isinstance(lines, list) and len(lines) == 2 and all(isinstance(line, str) and len(line.strip()) >= 20 for line in lines) for lines in hints.values()), "Each problem needs two useful hints"
for pattern in patterns:
    assert all(isinstance(pattern[key], str) and len(pattern[key].strip()) >= 15 for key in ("title", "recognize", "approach", "hint")), pattern["id"]
    assert pattern["problems"], pattern["id"]
for company in companies:
    assert (root / "apps" / "prototype" / "company-icons" / f"{company['id']}.svg").is_file(), company["id"]
    assert len(company["problems"]) >= 6 and set(company["problems"]) <= set(ids), company["id"]
    levels = {challenge["level"] for challenge in challenges if challenge["id"] in company["problems"]}
    assert levels == {"Easy", "Medium", "Hard"}, company["id"]

site = root / "apps" / "prototype"
html = (site / "index.html").read_text(encoding="utf-8")
for asset in ("style.css", "app.js", "interview.js"):
    assert (site / asset).is_file() and asset in html, f"Missing site asset: {asset}"
print(f"{len(patterns)} interview patterns cover all {len(challenges)} challenges")
