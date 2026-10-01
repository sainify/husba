# HUSBA Atelier update — inspection and implementation

## Source and stack

Inspected the supplied `husba-main (3).zip`, not a newly invented replacement. Keep vanilla HTML/CSS and native ES modules: this project already has working Cloudflare APIs, static routes and a small admin SPA. React/Vite would introduce migration and deployment work without a clear benefit here. TypeScript could be introduced incrementally for API contracts later; a wholesale conversion is not part of this update.

Folder map:
- `apps/web/`: public HTML, shared components, media, CSS, JS; `admin/` holds the existing PWA shell, manifest, icons and service worker.
- Public routes: `/`, `/collections/`, `/product/?slug=…`, `/videos/` (The Edit), `/story/`, `/about/`, `/contact/`, `/privacy/`, `/terms/`, `/404.html`. Existing product-path fallback in the preview server remains.
- Admin hash routes: dashboard, products, categories, videos, enquiries, content.
- `worker/src/index.js`: existing API, validation, sessions and Cloudinary handling.
- `worker/migrations/0001_initial.sql`: site_settings, categories, products, product_media, product_videos, enquiries, reviews. Existing runtime admin_credentials table remains. No schema changes or migrations in this release.
- `scripts/build-web.mjs`: copies the site into `dist`, creates public config, versioned entry URLs, headers and robots. `scripts/check.mjs` checks source syntax, internal references, build tokens and accidental secret markers.
- `functions/product/index.js`, `functions/sitemap.xml.js`, `server/catalogue-seo.js`: new Pages Functions for public metadata and sitemap only. They read existing public API endpoints; no D1 binding or credentials are passed to them.

Bindings/environment variable names: `DB`, `ENVIRONMENT`, `ALLOWED_ORIGINS`, `CLOUDINARY_CLOUD_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `TURNSTILE_SECRET_KEY`, `DEV_ADMIN_TOKEN` (development only). Frontend build variables: `API_BASE_URL`, `SITE_URL`, `TURNSTILE_SITE_KEY`, `DEMO_MODE`. Existing Worker media integration may also use Cloudinary credentials; preserve all account-managed values. Never copy secrets into this repository. Production fallback origins remain HUSBA-specific.

API contracts remain: public `/api/health`, `/api/bootstrap`, `/api/products`, `/api/products/:slug`, `/api/videos`, POST `/api/enquiries`; protected `/api/admin/session`, dashboard, products, categories, videos, enquiries, settings and account; existing login/logout endpoints. Product/enquiry field names are preserved.

Authentication code is unchanged. The Worker signs/verifies sessions and checks configured or stored admin credentials; the browser maintains its existing token and IndexedDB/localStorage recovery. A redesign cannot guarantee against expired sessions, changed secrets, account permissions or Cloudflare outages.

## Design system

| Token | Value / treatment |
|---|---|
| Primary / deep | `#8A4556` / `#542A38` |
| Ivory / blush | `#FAF6F1` / `#F0E3E6` |
| Champagne / ink | `#BAA180` / `#30252A` |
| Muted / line | `#71646A` / `#DFD1C7` |
| Type | Fraunces headings + Manrope UI; serif/system fallbacks |
| Hero scale | `clamp(42px, 6.8vw, 96px)`, smaller fluid phone override |
| Spacing | 8/12/18/24/32px controls; 54–104px sections |
| Corners | 20–28px cards/dialogs, pill CTAs |
| Shadows | low-opacity mulberry, restrained depth |
| Motion | 180ms interactions, 220–500ms reveals, cubic-bezier(.2,.75,.25,1) |

Components: glass header, full-screen mobile menu, collection carousel, product tiles/quick view, category tiles, media modal, image gallery, details accordions, enquiry step form, mobile product actions, shared footer; admin sidebar/top bar, command palette, stat cards/chart, product table/cards, tabbed drawer, enquiry board, content accordions/live preview, toasts and update banner.

Native CSS, Web Animations and scroll snapping keep the site small and preserve native touch scrolling. No GSAP/Lenis/CDN runtime dependencies were added. Custom cursor styling is limited to films on fine-pointer devices. Reduced-motion disables decorative motion. Hero video play/pause controls remain removed; a separate film-viewer dialog has normal accessible playback controls after the user chooses Watch film.

## Page-by-page result

| Page | Result and motion |
|---|---|
| Home | Cinematic hero, word reveal/italic accents, moving-image treatment, clear featured preview and collection link, draggable/snap carousel, category hover affordance, three-step counters, story strip, optional film viewer, enquiry CTA and real Instagram invitation |
| Collections | Full pagination loaded, search/category/availability filters, image swap, card reveal, quick view, loading/error/empty states |
| Product | Existing video-first gallery, thumbnail controls, touch swipe, photo zoom modal/desktop zoom, price/availability, details/care, share, related products, sticky phone enquiry actions |
| The Edit | Existing video catalogue, shared luxury styling, lazy media and playback |
| Story/About | Existing brand story preserved with shared typography, layout and reveal system |
| Enquire | Two steps with inline name/phone errors, existing payload and Turnstile flow, success reference, WhatsApp fallback |
| Policies/404 | Shared navigation, type and layout; policy content preserved |
| Admin overview | Unified light theme, counts, real seven-day enquiry chart, most-enquired pieces, recent list/quick actions |
| Admin products | Table/cards, selection, publish/hide/delete, reorder with touch-friendly up/down fallback, hidden duplicate, Details/Media/Pricing/SEO drawer, previews, URL validation, counters and unsaved warnings |
| Admin categories/videos | Existing editors and visibility, category counts/image settings, reorder controls and video previews |
| Admin enquiries | Board/table with existing statuses, notes, date filters, CSV export, call/WhatsApp links and reply templates |
| Admin content | Grouped accordions, live unsaved content preview, media URL previews, sticky Save and dirty-content protection during refresh |
| Sign-in/PWA | Existing auth, styled split sign-in, show-password, loading/error feedback, install flow preserved, waiting-update banner |

## Reliability and caching

The products API now defaults an absent limit correctly, returns totals and has deterministic ordering. Public and admin clients fetch every product page instead of stopping at a small initial limit. The homepage is intentionally a six-featured-piece preview supplied by the existing bootstrap endpoint; the full collection is one visible link away. Newly published non-featured products appear in Collections. Mark them Featured if you want them in the home preview.

Public list/search/detail and linked films enforce visibility. Runtime sitemap and product metadata use the same public API, exclude hidden pieces and return a temporary error instead of stale data when the service fails. Existing slugs are never rewritten. Suspected category mistakes require identifying the correct category; no live products are silently reassigned.

API JSON is `no-store`; public in-memory read deduplication expires after 15 seconds. A currently open page does not receive pushed changes: navigate, search again after expiry, or reload to fetch updated data. This is a short read cache, not real-time synchronization.

The admin service worker caches only its static shell, not API responses/configuration/credentials. The new cache version and explicit activation banner avoid automatic reload while edits or deletion Undo are pending. CSS/JS entries are versioned, unversioned imports revalidate, and admin HTTP responses remain no-store. The first upgrade from an old installed worker may need a normal close/reopen. Future static app changes must bump the service-worker version and build asset version.

Deletes wait eight seconds before calling DELETE; Undo cancels that pending deletion. This is not restoration after a completed delete. Do not close the tab with a pending deletion; a warning is installed. Bulk writes are sequential, not transactional: an interrupted operation may partially complete and reports an error. Inspect and retry remaining items.

## Decisions, limits and approval-dependent items

- Existing enquiry statuses **New / Contacted / Closed** remain. Confirmed/Completed/Cancelled would require a reviewed non-destructive schema migration; not included.
- Existing category images use `site_settings.category_images`; no new column. Historical `UZ-` enquiry references remain valid and unchanged.
- Media uses the existing **Cloudinary URL paste** workflow, URL drag/drop and preview/reordering. Direct file upload/widget needs your authorized Cloudinary upload configuration and is not fabricated or enabled through an insecure preset.
- Chart and most-enquired list use real loaded enquiries. The backend still returns up to 500 recent enquiry records; chart/CSV cover those loaded records. No fake visitor counts, sparklines, testimonials or Instagram feed were invented. Visitor analytics/top-viewed products need consent and backend design first.
- Product SEO uses existing name/description/slug fields; there are no new SEO columns. Pages Functions add request-time Open Graph/JSON-LD and sitemap support and must be included in deployment. Existing product URLs are unchanged.
- No payment/cart, dark-mode toggle, custom scroll interception or background image uploads were introduced.
- The generic missing-image fallback does not repair the original Cloudinary asset. Replace a broken URL in the existing editor to restore the real photo.
- Existing stored homepage text/contact/visibility values override defaults. Your current settings are preserved, so a saved custom headline will remain until you edit it.

## Deployment and rollback

Use the package `START-HERE.md` command. No D1 export is needed for this update because no schema/data migration runs. The installer creates a local Git backup branch and private copies of each changed existing file, validates first, then commits only update paths, deploys the API explicitly and pushes main to trigger Pages. It never changes secrets or either Wrangler file.

If the deployment fails, read the original error above the stop message. The installer stops before later steps. It recognizes already-updated hashes on rerun. Conflicting newer source is refused instead of overwritten.

For rollback, find the **Verified commit** printed by the installer and the backup branch in `husba-private-backups/atelier-…/rollback.json`. On main with a clean working tree:

```bash
git revert <UPDATE_COMMIT>
npm run build && npm run check && npm test
npx --yes wrangler@4 deploy --config worker/wrangler.toml --keep-vars
git push origin main
```

Replace `<UPDATE_COMMIT>` with the printed commit, never a guessed value. If subsequent updates depend on it, review Git's conflicts rather than force-resetting. In a previous installed PWA, close/reopen and check the deployed version. Cloudflare can also roll Pages and Worker back separately to their prior successful versions.

D1 restore is **not** a rollback step for this release: restoring it could erase new customer enquiries. If a separate future migration is approved, first export D1 with `wrangler d1 export DB --remote --config worker/wrangler.toml --output <PRIVATE_BACKUP_PATH>` outside the repository. Inspect that backup and migration before applying. Any later restore/import requires a separate reviewed recovery plan, a fresh export, and protection of enquiries created since the backup.

Cloudflare implementation references: https://developers.cloudflare.com/pages/functions/api-reference/ and https://developers.cloudflare.com/pages/functions/routing/ .
