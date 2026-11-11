#!/usr/bin/env python3
"""Runs the code in every lesson with the real toolchain, so no lesson ships with broken code.
Usage: python tools/verify.py [--strict] [language/slug ...]
Missing toolchains are skipped with a warning (use --strict to fail instead, as CI does)."""
import json, os, pathlib, re, shutil, sqlite3, subprocess, sys, tempfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
STRICT = "--strict" in sys.argv
ONLY = [a for a in sys.argv[1:] if not a.startswith("--")]
TSC = os.environ.get("TSC") or next((str(p) for p in [ROOT/"tools/node_modules/.bin/tsc"] if p.exists()), None) or shutil.which("tsc")

def run(cmd, cwd, timeout=90, env=None):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, env={**os.environ, **(env or {})}, input="Ada\n17\n")

def need(tool):
    if tool and (shutil.which(tool) or os.path.exists(tool)): return True
    return False

def check(d, tmp):
    mode, code, file = d["verify"], d["code"], d["file"]
    if mode == "python":
        (tmp/"main.py").write_text(code); r = run(["python3", "main.py"], tmp, env={"API_KEY": "x"}); return r
    if mode == "python-compile":
        (tmp/"main.py").write_text(code); return run(["python3", "-m", "py_compile", "main.py"], tmp)
    if mode in ("sqlite", "sqlite-expect-fail"):
        db = sqlite3.connect(":memory:")
        try:
            if mode == "sqlite": db.executescript(code)
            else:
                *head, last = [s for s in code.split(";\n") if s.strip()]
                for s in head: db.executescript(s + ";")
                try: db.executescript(last.split("--")[0].strip().rstrip(";") + ";")
                except sqlite3.IntegrityError: return subprocess.CompletedProcess([], 0, "", "")
                return subprocess.CompletedProcess([], 1, "", "last statement was expected to fail but succeeded")
        except Exception as e: return subprocess.CompletedProcess([], 1, "", str(e))
        return subprocess.CompletedProcess([], 0, "", "")
    if mode == "node":
        if not need("node"): return None
        (tmp/"main.js").write_text(code); return run(["node", "main.js"], tmp)
    if mode == "tsc-run":
        if not (need("node") and need(TSC)): return None
        (tmp/"x.ts").write_text(code)
        nm = os.path.dirname(os.path.dirname(TSC))  # .../node_modules
        r = run([TSC, "--strict", "--target", "es2022", "--module", "commonjs", "--typeRoots", nm + "/@types", "--types", "node", "--skipLibCheck", "--outDir", "out", "x.ts"], tmp)
        return r if r.returncode else run(["node", "out/x.js"], tmp)
    if mode == "go-run":
        if not need("go"): return None
        (tmp/"go.mod").write_text("module example.com/app\n\ngo 1.22\n"); (tmp/"main.go").write_text(code)
        return run(["go", "run", "."], tmp, env={"GOFLAGS": "-mod=mod"})
    if mode == "java-run":
        if not (need("javac") and need("java")): return None
        cls = pathlib.Path(file).stem; (tmp/file).write_text(code)
        r = run(["javac", "-Xlint:all", "-d", "out", file], tmp)
        return r if r.returncode else run(["java", "-cp", "out", cls], tmp)
    return "manual"

lessons = sorted((ROOT/"content"/"lessons").glob("*/*.json"))
ok = fail = skipped = manual = 0
for f in lessons:
    d = json.loads(f.read_text(encoding="utf-8"))
    if ONLY and d["id"] not in ONLY: continue
    with tempfile.TemporaryDirectory() as t:
        try: r = check(d, pathlib.Path(t))
        except subprocess.TimeoutExpired: r = subprocess.CompletedProcess([], 1, "", "timed out")
    if r == "manual": manual += 1
    elif r is None: skipped += 1; print(f"skip  {d['id']}  (toolchain for '{d['verify']}' not installed)")
    elif r.returncode == 0 and not (d["verify"] in ("tsc-run","java-run","go-run") and r.stderr.strip() and "error" in r.stderr.lower()): ok += 1
    else: fail += 1; print(f"FAIL  {d['id']}  [{d['verify']}]\n      " + (r.stderr or r.stdout).strip().split("\n")[-1][:200])
print(f"verified {ok} | failed {fail} | skipped {skipped} | manual {manual} (checked by hand, see CONTRIBUTING)")
sys.exit(1 if fail or (STRICT and skipped) else 0)
