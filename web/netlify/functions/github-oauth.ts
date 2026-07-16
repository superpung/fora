// GitHub OAuth token-exchange broker. Implementation lives in the shared
// package; this project supplies its own GitHub OAuth App via
// GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET (Netlify env vars).
export { handler } from "@repus/gist-sync/netlify";
