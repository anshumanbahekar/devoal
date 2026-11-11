# Architecture

Goal: a real coding-education platform that anyone can run, fork and improve, without a backend to contribute content.

## Principles

1. **Content is files in git.** Lessons, roadmaps and quizzes are JSON in `content/`. The app reads them at build time.
   Contributors never need a database, and every change to a lesson is reviewable in a pull request.
2. **User data is the only thing in a database.** Progress, streaks, review schedule, leaderboard.
3. **Run learners' code in the learner's browser.** Never execute untrusted code on our servers without a real sandbox.
4. **Every example is executed in CI** (`tools/verify.py`). Broken lessons don't merge.

## Stack (chosen to fit what the maintainer already ships)

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router) + TypeScript | Static generation of lesson pages, easy API routes, already familiar |
| Hosting | Vercel | Free tier, preview deployments per pull request |
| Auth + user data | Firebase Auth + Firestore, behind a small `lib/store` interface | Fast to ship. The interface lets someone swap in Postgres/Supabase. Use the Firebase emulator for local development |
| JavaScript / TypeScript runner | Sandboxed iframe or Web Worker with a time limit | No server needed |
| Python runner | Pyodide (WebAssembly) | Real CPython in the browser |
| SQL runner | sql.js (SQLite in WebAssembly) | Real SQL engine in the browser |
| Go, Java, C++, Rust runner | Self-hosted Judge0 CE or Piston in Docker, added later | Compiled languages need a server-side sandbox |
| Tutor | Server route calling Grok through the xAI Responses API | Uses the current lesson or problem context. The API key remains server-side; account-based rate limiting and citation retrieval remain planned |

## Data model (Firestore, v1)

```
users/{uid}/progress/{language}   { learned: [slug...], quick: [i...], updatedAt }
users/{uid}/review/{questionId}   { box: 0-4, due: timestamp }
users/{uid}/stats                 { xp, streak, lastActiveDay, hist: {YYYY-MM-DD: n} }
leaderboard/{week}/entries/{uid}  { xp, name }           // public read, owner write
```

Security rules: users read and write only their own `users/{uid}/**`. The leaderboard is public read, owner write, and write only while signed in.

## Running untrusted code

- Browser runners: no network access, a hard timeout (terminate the worker), no access to the page's cookies or storage.
- Server runners (later): run only inside the container sandbox that Judge0/Piston provide, with CPU, memory, time and network limits,
  never in the web app's own process. Ship this behind rate limits and a kill switch.

## Testing

- `tools/validate.py` for lesson shape, `tools/verify.py --strict` for running every example.
- App: Vitest for logic (spaced repetition, progress merge), Playwright for the core flows (open lesson, run code, mark done, ask tutor).

## Accessibility

Keyboard navigation everywhere, visible focus, reduced-motion support, and color never the only signal. Check each page with a screen reader before release.
