# DEKUWEC app download page

Standalone static site that tells members what the Android app is, how to install it and which
warnings to expect along the way.

Live at **https://dekuwec-app.pages.dev** (Cloudflare Pages).

> This file lives in `docs/` on purpose. Cloudflare Pages serves **every** file in the deploy
> folder — `.assetsignore` is not honoured on direct uploads — so nothing that shouldn't be public
> goes in `download-site/`. Keep this folder to assets only.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The whole page — hero, features, install steps, troubleshooting, FAQ |
| `styles.css` | Theme, layout and animations (brand palette from the portal) |
| `app.js` | Mobile nav, scroll reveals, and live release info from the GitHub API |
| `assets/app-icon.png` | App icon used in the nav, hero and phone mockup |
| `_headers` | Cache and security headers applied by Cloudflare Pages |

No build step, no dependencies, no frameworks — it is three text files.

## The download link

Every download button points at:

```
https://github.com/KIOKO23-HUB/DEKUWEC-PORTAL/releases/latest/download/DEKUWEC.apk
```

`releases/latest` always resolves to the newest release, so this URL never needs updating — **as long
as each release includes an asset named exactly `DEKUWEC.apk`**. Publish that alongside the
versioned file (for example `DEKUWEC-1.2.apk`) when you cut a release.

`app.js` also queries the GitHub API on load and, when it responds, replaces the static version,
file size, download URL and SHA-256 with the real values from the latest release. If the API is
unreachable or rate-limited the hard-coded values stay in place, so the page never breaks.

## Deploying

```bash
# from the repository root
npx wrangler pages deploy download-site --project-name dekuwec-app
```

Wrangler prints a warning about `wrangler.jsonc` missing `pages_build_output_dir`; that file
configures the Cloudflare Worker for the portal, so it is deliberately left alone and the warning
can be ignored.

## Attaching a custom domain

The site can be served from a subdomain such as `get.dekuwec.app`. Two steps are needed, because
DNS for `dekuwec.app` is hosted at **name.com**, not Cloudflare:

1. Cloudflare dashboard → **Workers & Pages → dekuwec-app → Custom domains → Set up a domain** →
   enter the subdomain. Cloudflare then shows the CNAME target.
2. At name.com, add a **CNAME** record for that subdomain pointing at `dekuwec-app.pages.dev`.

Cloudflare issues the TLS certificate once the CNAME resolves.

## Updating the content

Edit the files here, then re-run the deploy command. `styles.css` and `app.js` are served with a
one-hour cache, and everything under `assets/` is immutable for a year — so when replacing
`assets/app-icon.png`, give it a new filename or the old copy may be served from cache.
