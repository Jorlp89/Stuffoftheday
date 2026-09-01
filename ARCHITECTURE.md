# Thing of the Day: architecture and implementation plan

## Isolation boundary

This project is a standalone public display. It must live in its own Git repository and its own Railway service and domain. It does not import, proxy, link to, or share storage with Garg.

The service has no authentication, database, user records, cookies, analytics, forms, school data, or private APIs. Its only optional runtime variables are:

- `PORT`, supplied by Railway
- `PUBLIC_BASE_URL`, used for canonical metadata
- `CACHE_DIR`, defaulting to `/tmp/thing-of-the-day-cache`
- `FETCH_TIMEOUT_MS`, defaulting to 3500

Do not copy any Garg variables into this service.

## Runtime shape

One Node.js 20 process serves static HTML/CSS/JavaScript and a single public JSON endpoint, `/api/today`. It uses built-in platform APIs, so production has no third-party npm runtime dependencies.

The server calculates the civil date in `Asia/Tokyo`. A stable hash of that date selects local word, kanji, fact/quotation, image candidate, and maths parameters. Refreshing or restarting does not change the day's board.

External content is fetched server-side only. Responses are treated as untrusted, reduced to an allowlist of plain fields, stripped of markup, length-limited, and returned with conservative security headers.

## Source and licensing choices

| Section | Primary source | Failure behavior | Licensing/provenance |
| --- | --- | --- | --- |
| English word | Curated local records and original classroom definitions | Always available | Facts and original wording; source link supplied for checking |
| Kanji | Curated local records | Always available | Factual character/readings; source link supplied for checking |
| This day in history | Wikimedia REST “on this day” feed | Exact-date local fallback where present, then an explicitly labelled unavailable message | Wikipedia text is attributed and linked under CC BY-SA |
| Daily image | Curated Wikimedia Commons file titles, resolved through `imageinfo` | Last-known-good, then bundled original SVG | The API-reported license must match an allowlist; creator, file page, and license link are displayed |
| Maths challenge | Locally generated from the Tokyo date | Always available | Original generated content |
| Fact or quotation | Curated local records with verification URLs | Always available | Original paraphrase or public-domain quotation, with source link |

Commons files are individually licensed. The server therefore checks `LicenseShortName`, retains the creator and attribution fields, and links to both the file page and license. Allowed families are CC0, public domain, CC BY, and CC BY-SA. Any missing or unexpected license is rejected.

## Resilience and cost

- Network timeout: 3.5 seconds by default.
- Cache: one JSON object per Tokyo date, written atomically to an ephemeral directory and also retained in memory.
- Last-known-good: upstream-specific cached values may be reused and are marked as such.
- Local fallbacks: every visual region renders even with no network.
- Refresh: the browser checks shortly after Tokyo midnight and when the tab becomes visible; it does not poll continuously.
- Cost: one small stateless Railway service, no database or volume, and at most two upstream requests per uncached day/process.

## Security posture

- Strict CSP; scripts and styles are local.
- No cookies, browser storage, trackers, form input, or user identifiers.
- `frame-ancestors` permits Canva HTTPS origins and ordinary HTTPS embedding; `X-Frame-Options` is intentionally omitted because it would block the requested embed.
- Upstream URLs are created by the server, never accepted from query parameters.
- JSON and static responses have size and cache controls.
- A minimal `/health` endpoint supports Railway deployment checks.

## Canva embed proof

`proof/canva-embed-proof.html` is a local iframe harness using the same 16:9 constraints as an embedded Canva element. After deployment, replace its placeholder URL with the public HTTPS address and verify interaction, resizing, and the answer reveal. The production response headers are configured to allow framing from Canva origins. This proves our side of the contract; Canva's Embed app must still accept the deployed URL.

## Implementation plan

1. Create the dependency-free Node service and security headers.
2. Add deterministic Tokyo-date content generation and curated datasets.
3. Add sanitized Wikimedia history and Commons image adapters with timeout, cache, and fallback.
4. Build the projector-first 16:9 dashboard and accessible answer reveal.
5. Add automated tests for determinism, isolation headers, fallbacks, and sanitization.
6. Add Railway configuration, deployment checklist, and Canva verification proof.

