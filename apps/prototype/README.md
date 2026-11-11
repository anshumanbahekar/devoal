# Prototype

`index.html` is the original Devoal interface and the GitHub Pages entry point. The Pages build packages it with real language logos, 116 prepared lessons, and all 20 JavaScript challenges from `content/`. The browser keeps progress and practice drafts locally. Practice code runs in a sandboxed frame with a three second limit.

The live tutor uses saved lesson notes. AI grading, live Grok responses, cloud accounts, and a community leaderboard require server services that GitHub Pages does not provide. The Next.js implementation in `apps/web` contains Firebase account setup and a server based Grok route; those need Firebase configuration and a server deployment before they can be enabled on this interface.
