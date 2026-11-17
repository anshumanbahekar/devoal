# Server-backed Grok tutor

The public frontend uses the saved lesson guide until a Grok server endpoint is configured. The API key must stay on a server. The existing `apps/web` Next.js route at `/api/tutor` accepts a learner question and up to 6 KB of lesson context, calls the xAI Responses API with `store: false`, and returns plain text. The public frontend escapes the answer before displaying it and falls back to the saved lesson guide if the API fails.

To activate it, deploy `apps/web` to a server host, set `XAI_API_KEY` there, and set `DEVOAL_PUBLIC_ORIGIN` to `https://anshumanbahekar.github.io`. Optionally set `XAI_MODEL`; the default is `grok-4.7`. Set the public GitHub Pages repository variable `DEVOAL_TUTOR_API_URL` to the HTTPS URL of the deployed `/api/tutor` endpoint. The Pages build then exposes only that URL in `tutor-config.json`. Never put `XAI_API_KEY` in Pages variables or a browser file.

The route has request size limits and a basic per-process hourly rate limit. Before broad public use, replace the in-memory limiter with durable abuse protection and monitor cost and errors. The tutor does not grade code or claim hidden-test results.

Reference: [xAI Responses API](https://docs.x.ai/developers/rest-api-reference/inference/responses) and [text generation guidance](https://docs.x.ai/developers/model-capabilities/text/generate-text).
