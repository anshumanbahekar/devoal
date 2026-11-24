# Public account setup

The public GitHub Pages frontend now contains Google and GitHub sign-in and Firestore progress sync. The Sign in button opens an account dialog for both returning and new learners. The Pages build uses the public Devoal web app configuration in `firebase/web-config.json`. A first successful provider sign-in creates the Firebase account.

1. Create a Firebase web app and a Firestore database. Enable Google and GitHub in Firebase Authentication. Add `anshumanbahekar.github.io` to Authentication authorized domains.
2. In the GitHub OAuth app settings, use the callback URL shown by Firebase's GitHub provider setup. Add the OAuth client ID and secret in Firebase, not in this repository.
3. Deploy [`firebase/firestore.rules`](../firebase/firestore.rules) to the Firebase project. They restrict the progress document to its signed-in owner.
4. The next `main` deployment packages `firebase/web-config.json` as `firebase-config.json`. To use a different Firebase project, set all four repository variables together — `DEVOAL_FIREBASE_API_KEY`, `DEVOAL_FIREBASE_AUTH_DOMAIN`, `DEVOAL_FIREBASE_PROJECT_ID`, and `DEVOAL_FIREBASE_APP_ID`. This replaces the bundled configuration for that build.

The browser merges completed lessons and challenges, practice drafts, and attempt history on first sign-in. When a different account signs in on the same browser, it loads that account's data instead of merging the previous user's data. Draft conflicts favor the current browser. Cloud writes are throttled to changes and capped at 750 KB; if a write fails, the browser copy remains available for export in Progress.

The account button shows the provider photo, with initials when it is unavailable. Signed-in learners can update their display name, bio, focus language, and daily activity goal. Display names are saved through [Firebase profile updates](https://firebase.google.com/docs/auth/web/manage-users#update_a_users_profile). Bio and learning preferences use the account-isolated `dv-profile.v1` state, are included in backups, and sync through Firestore when available. For preference conflicts, the newest saved version wins. The home page uses the saved language and goal. The account dialog also shows actual connected providers and account dates, and offers backup export and progress access.

The Grok API key must be stored on a server deployment for `apps/web`. It must never be placed in GitHub Pages variables or `firebase-config.json`.

Profile social fields accept only X and LinkedIn usernames. Links are constructed from fixed provider domains. These handles are included with the bio and learning preferences in account backups and sync. Appearance is a device preference (`dv-theme.v1`) with Dark, Light, and System options; it is separate from account data.

References: [Firebase web setup](https://firebase.google.com/docs/web/setup), [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [GitHub sign-in](https://firebase.google.com/docs/auth/web/github-auth), and [Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started).
