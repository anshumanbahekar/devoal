"""Check the shipped Python practice pack before deployment."""
import ast
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
problems = json.loads((root / "content/python-practice.json").read_text(encoding="utf-8"))
assert isinstance(problems, list) and len(problems) >= 10
ids = set()
for problem in problems:
    assert problem["id"] not in ids, problem["id"]
    ids.add(problem["id"])
    assert problem["level"] in {"Easy", "Medium", "Hard"}
    assert all(isinstance(problem[key], str) and problem[key].strip() for key in ("title", "topic", "function", "prompt", "starter"))
    module = ast.parse(problem["starter"])
    assert any(isinstance(node, ast.FunctionDef) and node.name == problem["function"] for node in module.body), problem["id"]
    assert len(problem["tests"]) >= 3, problem["id"]
    for test in problem["tests"]:
        assert isinstance(test["args"], list) and "expected" in test, problem["id"]
        json.dumps(test)
print(f"{len(problems)} Python problems checked")
