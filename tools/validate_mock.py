"""Check mock interview prompts and rubric coverage."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
items = json.loads((root / "content" / "mock-scenarios.json").read_text(encoding="utf-8"))
assert len(items) >= 10, "Mock practice needs both design and behavioral variety"
assert len({item["id"] for item in items}) == len(items), "Mock IDs must be unique"
assert {item["type"] for item in items} == {"System design", "Behavioral"}
for item in items:
    assert item["minutes"] in (10, 35), item["id"]
    assert len(item["title"]) >= 10 and len(item["prompt"]) >= 80, item["id"]
    assert len(item["clarify"]) == 3 and all(len(text) >= 20 for text in item["clarify"]), item["id"]
    assert len(item["rubric"]) == 4 and all(len(text) >= 20 for text in item["rubric"]), item["id"]
print(f"{len(items)} mock scenarios with review rubrics checked")
