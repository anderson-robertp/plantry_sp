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
