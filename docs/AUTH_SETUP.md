# Public account setup

The public GitHub Pages frontend now contains Google and GitHub sign-in and Firestore progress sync. The Sign in button opens an account dialog for both returning and new learners. Until the Firebase web configuration is present, the dialog explains availability and offers guest practice.

1. Create a Firebase web app and a Firestore database. Enable Google and GitHub in Firebase Authentication. Add `anshumanbahekar.github.io` to Authentication authorized domains.
2. In the GitHub OAuth app settings, use the callback URL shown by Firebase's GitHub provider setup. Add the OAuth client ID and secret in Firebase, not in this repository.
3. Deploy [`firebase/firestore.rules`](../firebase/firestore.rules) to the Firebase project. They restrict the progress document to its signed-in owner.
4. Set these public GitHub repository variables for the Pages workflow: `DEVOAL_FIREBASE_API_KEY`, `DEVOAL_FIREBASE_AUTH_DOMAIN`, `DEVOAL_FIREBASE_PROJECT_ID`, and `DEVOAL_FIREBASE_APP_ID`. They are Firebase's public web app identifiers, not server secrets. The next `main` deployment writes them to `firebase-config.json` and enables the two provider buttons. A first successful provider sign-in creates the Firebase account.

The browser merges completed lessons and challenges, practice drafts, and attempt history on first sign-in. When a different account signs in on the same browser, it loads that account's data instead of merging the previous user's data. Draft conflicts favor the current browser. Cloud writes are throttled to changes and capped at 750 KB; if a write fails, the browser copy remains available for export in Progress.

The Grok API key must be stored on a server deployment for `apps/web`. It must never be placed in GitHub Pages variables or `firebase-config.json`.

References: [Firebase web setup](https://firebase.google.com/docs/web/setup), [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [GitHub sign-in](https://firebase.google.com/docs/auth/web/github-auth), and [Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started).
