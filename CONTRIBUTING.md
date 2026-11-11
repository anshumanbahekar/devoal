# Contributing to Devoal

Thank you. The most valuable contributions right now are **lessons** and **lesson reviews**.

## Add or improve a lesson

1. Find or create `content/lessons/<language>/<slug>.json`. The slug is the topic in lowercase with dashes (`if/else` becomes `if-else`).
   The topic must exist in `content/roadmaps/<language>.json`.
2. Fill every field (see `content/schema/lesson.schema.json`):

   | Field | Rule |
   |---|---|
   | `explain` | Exactly **three sentences**. Plain words. Use backticks for code names. |
   | `code` | A complete example that runs by itself. Aim for 12 lines or fewer (Go and Java need more boilerplate: keep it tight). |
   | `exercise` | One small task the learner can do in a few minutes. |
   | `tip` | One real, common mistake and how to avoid it. |
   | `verify` | How CI checks the code. See below. |
   | `review` | Leave as `unreviewed` for new lessons. |

3. Run `python tools/validate.py` and `python tools/verify.py <language>/<slug>`.
4. Open a pull request. Include what you ran and the output.

### `verify` modes

`python`, `python-compile`, `sqlite`, `sqlite-expect-fail`, `node`, `tsc-run`, `go-run`, `java-run` are run in CI with the real toolchain.
`manual` means the example is a config file, a multi-file project, or needs a server or library CI does not have (Dockerfile, pom.xml, Spring, etc.).
For `manual` lessons, say in your PR how you checked them. Please don't mark something `manual` just to skip a failing check.

## Review a lesson

Read it as a beginner would. Is each sentence true? Does the code teach one thing? Is the exercise doable? Is the tip real?
If it passes, set `"review": "reviewed"` and add your GitHub handle to `"reviewedBy"`. If not, fix it or open an issue.

## Facts, not guesses

Do not invent APIs, flags, version numbers or URLs. If you are not sure, run it. Official docs are the source of truth.

## Missing languages

C++ and Rust have roadmaps but no lessons yet. Claim a topic by opening an issue titled `C++: <topic>` before you start.
