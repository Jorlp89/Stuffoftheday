# Thing of the Day

A standalone, public, projector-friendly classroom dashboard showing six daily prompts at once. It is intentionally independent from every private teaching system.

Public dashboard: https://stuffoftheday-production.up.railway.app

## Run locally

Requires Node.js 20 or newer.

```sh
npm start
```

Open `http://localhost:3000`. Run checks with `npm test`.

## Create the separate Railway service

1. Create a new Git repository containing only this folder. Do not place it in the Garg repository or connect it to the Garg Railway project.
2. In a new Railway project, create a service from this repository.
3. Add only `PUBLIC_BASE_URL` after Railway assigns the new public HTTPS domain. Railway supplies `PORT` automatically.
4. Set the healthcheck path to `/health` if the included `railway.json` is not detected.
5. Do not attach a database or volume. Do not copy environment variables from another service.
6. Confirm the public domain is different from every private teaching application domain.

The cache uses ephemeral `/tmp` storage. It is an optimization, not a source of truth.

## Post-deployment checks

- Visit `/health` and confirm `{"ok":true}`.
- Visit `/api/today` and verify the date is the current date in Asia/Tokyo.
- Confirm the browser has no cookies or local storage for the site.
- Confirm each source and image licence link opens the expected public page.
- Disconnect the service from outbound networking temporarily and confirm the board still renders local content.
- Put the public HTTPS URL into `proof/canva-embed-proof.html`, then use Canva's Embed app with that same URL. Check 16:9 scaling and the answer disclosure.

## Content maintenance

Curated records live in `src/content.js`. Add source URLs to every new record. Commons candidates must be `File:` titles; the runtime rejects a file unless the Commons API reports an allowed open or public-domain licence. Review the daily output after changing a source list.

See `ARCHITECTURE.md` for boundaries, source policy, resilience, and the implementation plan.
