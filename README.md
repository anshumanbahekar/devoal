# Devoal

An open-source platform for learning to code properly: short lessons, JavaScript challenges with browser tests, a tutor grounded in the lessons,
and review that brings back what you forgot. Eight languages, five-stage roadmaps, all free.

> **Status: early.** The public interface covers learning paths, JavaScript practice, timed interview rounds, resources, and local progress. See [apps/prototype/README.md](apps/prototype/README.md) for its current scope.

The [public site](https://anshumanbahekar.github.io/devoal/) uses the original folder and workspace interface from `apps/prototype`. Every push to `main` packages that interface with the real language logos and prepared lessons.

## What's here today

| Area | State |
|---|---|
| Lessons | **116** across Python, JavaScript, TypeScript, SQL, Go and Java |
| Needed | **41** lessons: all of **C++** (20) and **Rust** (21). Great first contributions. |
| Quick-start lessons | 4 per language, each with a starter-to-solution diff |
| Practice | 40 original JavaScript challenges with browser-run tests |
| Interview prep | 8 pattern guides, 4 independently curated company prep paths, timed two problem rounds, and browser-local coins |
| Quiz | 12 starter questions (more wanted) |
| Review | Quiz answers scheduled for recall in the web app |
| Roadmaps | 5 stages per language, with curated official resources |
| Service candidate | `apps/web/`, a separate Next.js implementation with Firebase and Grok wiring |
| Public interface | `apps/prototype/`, the original folder and workspace design |

### How the lessons were made (read this)

Every lesson so far was **written with AI assistance (Claude)**, then **executed** with the real toolchain (`tools/verify.py`).
That proves the code runs. It does **not** prove the teaching is good. Each lesson carries `"review": "unreviewed"` until a human
reads it and changes it to `"reviewed"` with their GitHub handle in `reviewedBy`. Reviewing a lesson is a very welcome contribution.

## Quick start

```bash
git clone https://github.com/<you>/devoal && cd devoal
python tools/validate.py          # lesson file shape, no dependencies
python tools/verify.py            # runs every lesson's code (skips languages you don't have installed)
```

To verify everything locally you need Python 3, Node 22, Go 1.22, JDK 21 and `npm i` inside `tools/` (TypeScript).
Missing toolchains are skipped with a warning; CI installs all of them and runs `--strict`.

## Repository layout

```
content/
  lessons/<language>/<topic>.json   one file per roadmap topic
  quickstart/<language>.json        4 starter lessons + capstone idea
  roadmaps/<language>.json          the 5 stages and their topics
  resources/<language>.json         official docs, courses, practice sites
  challenges/ quiz/ schema/         practice tests, quiz bank, JSON schema
tools/        validate.py, verify.py
apps/web/     Next.js learning and practice app
apps/prototype/  public folder and workspace interface
docs/         ARCHITECTURE.md, ROADMAP.md
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). The short version: pick a lesson (or a missing C++/Rust topic), keep the code runnable,
run the two tools, open a pull request. You do not need to run any backend to contribute content.

## License

Code: [MIT](LICENSE). Content in `content/`: [CC BY-SA 4.0](content/LICENSE.md). Name and logo: not licensed for reuse.
