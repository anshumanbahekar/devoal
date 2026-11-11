# Devoal web app

The web app reads the repository's JSON lessons, roadmaps, resources, and challenges at build time.

## Run locally

From `apps/web`:

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app works without an account. Lesson completion, problem attempts, saved JavaScript solutions, quiz review schedules, and profile activity are stored in this browser's localStorage. Clearing browser data clears that progress.

## Enable the Grok tutor

Copy `.env.example` to `.env.local`, set `XAI_API_KEY`, and restart the dev server. The API key stays on the server. The tutor uses xAI's Responses API and sends the current lesson or problem context plus the learner's question to Grok. The route has basic per-IP throttling; production deployment should use a persistent rate limiter and authentication before broad public access.

## Current scope

- Five-stage learning paths for eight languages, with 116 available lessons across six languages. C++ and Rust topics appear as planned until lessons are contributed.
- 20 JavaScript coding problems across Easy, Medium, and Hard, with topic filters, saved problems, and in-browser tests. Tests are visible in the shipped client bundle, so this is practice feedback rather than a secure competition judge.
- Curated resources for each language and a local progress profile.
- A 12-question recall quiz with language filters and scheduled review. Correct answers return after progressively longer intervals; missed answers return the next day.
- Code execution is currently JavaScript only. Other language runners, account sync, and a hardened judge are future work.

Run `npm run build` to validate the app and `python ../../tools/validate.py` to validate lesson files.
