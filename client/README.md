# Plantry client

React + TypeScript + Tailwind, built with Vite.

    npm install
    cp .env.example .env     # set VITE_API_URL to your API
    npm run dev              # http://localhost:5173
    npm test                 # unit tests for the API client and helpers
    npm run build            # type-checks, then builds to dist/

The API must allow this app's origin: set `CORS_ORIGIN` on the server to include
`http://localhost:5173` (dev) and your deployed front-end URL (comma-separated).

Deploying to Render as a Static Site: build command `npm install && npm run build`, publish
directory `dist`, env var `VITE_API_URL=<your API URL>`, and a rewrite rule
`/*` to `/index.html` so refreshing a page like /pantry works.

## Deploy checklist (Render static site)

1. New > Static Site, connect the repo, root directory this folder.
2. Build command `npm install && npm run build`, publish directory `dist`.
3. Environment: `VITE_API_URL` = your API's URL (no trailing slash). It is baked in at build time, so redeploy after changing it.
4. Redirects/Rewrites: source `/*`, destination `/index.html`, action Rewrite.
5. On the API service set `CORS_ORIGIN` to include the static site's URL, then redeploy the API.
