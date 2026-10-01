# Validation report — HUSBA Atelier

## Actually run

- `npm run build`: passes; complete `dist` output generated.
- `npm run check`: passes; JavaScript syntax, local HTML/assets/import references, missing alt attributes, unresolved build placeholders, accidental secret markers and D1 configuration presence checked. Pages Functions/server JS included.
- `npm test`: **19 tests pass, 0 fail, 0 skipped** on Node 24. The SQLite test needs Node 22+ (installer enforces 22+).
- `npx --yes wrangler@4 pages functions build --outdir <temporary-directory>`: **Compiled Worker successfully** with Wrangler 4.145.0. This compiles Functions; it is not a production deployment.
- Public modules plus header/footer modules total **19,933 bytes gzipped individually** at measurement time, excluding media/fonts and the separate admin. No animation library was added. This is a size measurement, not a Lighthouse score.
- Both Wrangler configurations and the original D1 migration are byte-identical to the supplied baseline.

## Automated coverage

Tests cover input/media validation, cross-origin mutation rejection, unknown endpoints, API error propagation, real price/availability normalization, escaped product markup, correct enquiry payload, menu initialization guard, bootstrap deduplication and filters. Real in-memory SQLite with 106 fixture products verifies the missing-limit default, 100+5 pagination, stable IDs, correct totals, hidden-product detail/search rejection, six-piece featured preview, linked-hidden-video exclusion and no-store headers.

SEO tests cover escaped metadata, hidden-price omission, unpublished-product rejection, paginated sitemap, hidden-item omission and repeated-page failure. A service-worker event harness checks static-only caching, no admin API caching, waiting for explicit update acceptance, and removal of only HUSBA's old shell cache.

## Chromium browser checks actually run

Local Chromium 138 + Playwright with mocked, contract-shaped API responses. Fixture catalogue: 105 products. No live admin login, customer data mutation, database migration or production deployment was performed.

Passed:
- Mobile menu open, Escape close, navigation-link close; repeat-init regression covered by unit test.
- Public collection and admin product list load all 105 fixture products across API pages.
- Quick view opens, loads and closes.
- Product gallery thumbnails, image zoom/Escape, and sticky mobile WhatsApp URL containing the product code.
- Two-step enquiry validation and successful submission with the existing product ID/payload.
- Admin mobile menu Escape; product drawer tabs; opening enquiry editor after product editor without stale input-handler errors; enquiry board status/notes requests.
- Content live preview and retention of unsaved text during refresh.
- Homepage horizontal overflow checked at widths 360, 390, 768, 1024 and 1440.
- Reduced-motion disables headline animations.
- No uncaught page JavaScript errors in that browser run.

Home mobile/desktop, product mobile and product-editor mobile screenshots were reviewed. External Google font requests were blocked/unavailable in this local run, so fallback fonts were visible. A final small CSS/source change hides empty image-preview space and recognizes existing packaged image paths; build/syntax/unit tests were run after it. These screenshots are fixture verification, not representations of your live catalogue.

## Not tested or not claimed

- Actual Cloudflare production routing/Functions responses, credentials, session expiry/refresh across a real deploy, D1 permissions, real WhatsApp app opening, Turnstile and Cloudinary media/upload availability.
- Installed Android/iOS PWA update lifecycle, cross-tab update acceptance, offline reopen and phone hardware behavior. Service-worker unit checks do not replace those device checks.
- Physical pinch/swipe gestures, every drag/drop combination, CSV opened in spreadsheet software, partial-failure recovery for bulk writes, or automatic deletion completion after eight seconds.
- Full browser-based regression on every public/admin screen; policy/story pages share verified styles but were not individually covered in the completed browser run.
- Lighthouse 90+, 60fps measurement, Safari/Firefox compatibility, or a complete WCAG AA audit. They are goals, not verified scores/certifications.
- Repairing original missing Cloudinary photos or correcting product/category assignments. Fallback handling is implemented; the asset URL and intended category need owner verification.

## After deployment — phone checklist

1. Confirm the **husba Pages** production commit matches the installer output; check `/`, `/collections/`, `/product/?slug=<an-existing-slug>` and `/admin/`.
2. Verify menus, search, category and stock filters, real images/videos and product prices/visibility. Confirm the homepage's featured preview links to all products.
3. Publish one test piece; verify Collections after reload. Hide it; verify direct product URL returns 404, search excludes it and `/sitemap.xml` omits it. Restore its intended state.
4. Send one clearly labelled test enquiry; verify reference, product/code and WhatsApp destination. Remove only that test record if desired.
5. Sign in with your existing credentials, close/reopen the installed app, edit a product, and check content preview/Save.
6. Save drafts before accepting **Update now**. Verify a later PWA update does not clear credentials. Test offline reopening and reconnection.
7. Test a missing image and API outage to confirm a helpful error/fallback. Check keyboard focus/reduced-motion on a desktop when available.

Installer verification is reported in `INSTALLER-VERIFICATION.txt` at the ZIP root. Production is only updated when you run the provided command successfully.
