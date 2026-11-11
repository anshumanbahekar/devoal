# Roadmap

Each phase ends with something a learner can use. Checkboxes are the real tasks.

## Phase 0: content foundation (done)
- [x] 116 lessons across 6 languages, executed with real toolchains
- [x] Lesson schema, validator, verifier, CI
- [x] Roadmaps and curated official resources for 8 languages

## Phase 1: the real web app (next)
- [ ] `apps/web`: Next.js + TypeScript project, reads `content/` at build time
- [ ] Pages: home, course (sidebar of stages and topics), lesson, roadmap, resources
- [ ] Progress in localStorage, then `lib/store` interface
- [ ] Deploy to Vercel with preview deployments
- [ ] Port the visual design from `apps/prototype`
- **Done when:** a stranger can open the site and finish a Python lesson with no account.

## Phase 2: run code for real
- [ ] JavaScript/TypeScript runner (worker with timeout)
- [ ] Python runner (Pyodide)
- [ ] SQL runner (sql.js)
- [ ] Practice challenges with hidden tests for Python and SQL, not only JavaScript
- **Done when:** a learner can edit a lesson's code, run it, and pass a hidden test, in the browser.

## Phase 3: accounts and community
- [ ] Firebase Auth, Firestore sync, security rules, emulator setup in docs
- [ ] Spaced review of missed quiz questions
- [ ] Weekly leaderboard, streaks, shareable progress card
- [ ] Discord link and contributor guide for lesson reviewers

## Phase 4: tutor
- [ ] Tutor API route with retrieval over `content/` and cited answers
- [ ] Rate limiting and abuse protection
- [ ] "Explain this code" on any lesson example

## Phase 5: compiled languages
- [ ] Self-hosted Judge0 CE or Piston behind rate limits
- [ ] C++ and Rust lessons (41 topics, community-written)
- [ ] Run Go and Java examples in the page

## Good first issues
- Write a C++ or Rust lesson (see `CONTRIBUTING.md`)
- Review any lesson and set `"review": "reviewed"`
- Add 10 quiz questions for a language
- Add Python or SQL practice challenges
- Translate the explanations (open an issue first to agree on the format)
