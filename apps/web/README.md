# Devoal web app

The web app reads the repository's JSON lessons, roadmaps, resources, and challenges at build time.

## Run locally

From `apps/web`:

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app works without an account. Lesson completion, problem attempts, saved JavaScript solutions, quiz review schedules, and profile activity are stored in this browser's localStorage. Sign-in can also sync that data through Firebase.

## Enable Google and GitHub sign-in

Create a Firebase project and web app, then fill the four `NEXT_PUBLIC_FIREBASE_*` values from `.env.example` in `.env.local`. In Firebase Authentication, enable Google and GitHub as sign-in providers. GitHub needs an OAuth App client ID and secret configured **in the Firebase console**, with the Firebase-provided callback URL configured in the GitHub OAuth App. Add your development and production domains to Firebase Authentication's authorized domains. Create a Firestore database and deploy the rules in the repository's `firestore.rules`; each account can access only its own progress document.

For GitHub Pages, set the same four public values as GitHub repository **Variables**. The Pages workflow embeds them at build time. Until those values and providers are configured, the app keeps working in local mode and labels sign-in as unavailable.

## Enable the Grok tutor

Copy `.env.example` to `.env.local`, set `XAI_API_KEY`, and restart the dev server. The API key stays on the server. The tutor uses xAI's Responses API and sends the current lesson or problem context plus the learner's question to Grok. The route has basic per-IP throttling; production deployment should use a persistent rate limiter and authentication before broad public access.

## Current scope

- Five-stage learning paths for eight languages, with 116 available lessons across six languages. C++ and Rust topics appear as planned until lessons are contributed.
- 20 JavaScript coding problems across Easy, Medium, and Hard, with topic filters, saved problems, and in-browser tests. Tests are visible in the shipped client bundle, so this is practice feedback rather than a secure competition judge.
- Curated resources for each language and a local progress profile.
- Optional Google/GitHub sign-in with browser-to-Firestore progress sync and account-specific security rules.
- A 12-question recall quiz with language filters and scheduled review. Correct answers return after progressively longer intervals; missed answers return the next day.
- Code execution is currently JavaScript only. Other language runners and a hardened judge are future work.

## GitHub Pages deployment

The `main` branch builds the real web app as a static export and publishes `apps/web/out`, including the language logos. GitHub Pages cannot run the Grok API route, so the static site labels that feature as requiring a server deployment. The standard `npm run build` keeps the API route for a Node.js deployment.

Run `npm run build` to validate the app and `python ../../tools/validate.py` to validate lesson files.
