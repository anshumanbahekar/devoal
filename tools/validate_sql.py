"""Validate SQL practice cases and run each authored reference query."""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def checked_problems():
    problems = json.loads((ROOT / "content/sql-practice.json").read_text(encoding="utf-8"))
    assert isinstance(problems, list) and len(problems) >= 12
    seen = set()
    for problem in problems:
        assert problem["id"] not in seen, problem["id"]
        seen.add(problem["id"])
        assert problem["level"] in {"Easy", "Medium", "Hard"}, problem["id"]
        assert all(isinstance(problem[key], str) and problem[key].strip() for key in ("title", "topic", "prompt", "schema", "starter", "solution")), problem["id"]
        assert problem["solution"].lstrip().upper().startswith(("SELECT", "WITH")), problem["id"]
        assert len(problem["cases"]) >= 2, problem["id"]
        for case in problem["cases"]:
            assert isinstance(case["seed"], str) and case["seed"].strip(), problem["id"]
            with sqlite3.connect(":memory:") as database:
                database.executescript(problem["schema"] + "\n" + case["seed"])
                rows = database.execute(problem["solution"]).fetchall()
                assert rows, problem["id"]
                assert all(all(value is None or isinstance(value, (str, int, float)) for value in row) for row in rows), problem["id"]
                case["expected"] = [list(row) for row in rows]
    return problems


if __name__ == "__main__":
    problems = checked_problems()
    print(f"{len(problems)} SQL problems and {sum(len(problem['cases']) for problem in problems)} reference cases checked")
