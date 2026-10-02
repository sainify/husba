# Next.js migration notes

## Design system

Ivory `#fbf6f2`, paper `#fffdfb`, mulberry `#794454`, deep ink `#3b2630`, champagne hairlines `#c5a58b`. Playfair Display headings and DM Sans controls. Fluid serif headings, 15–24px spacing, 12–24px radius, soft shadows. Motion uses CSS transforms and opacity with a reduced-motion override.

## Pages and behaviour

- Home: dynamic admin content, banner image rotation or video, product preview, categories, films, story, enquiry CTA.
- Collections: fetches all product pages; category, search and in-stock filters. Hidden products are excluded by the Worker.
- Product: gallery images/video, swipe, specifications, WhatsApp and form enquiry, related products. Existing `/product/?slug=...` and dynamic Pages Function metadata remain.
- The Edit, story, about, enquiry, policies and 404: React pages with existing URL structure.
- Admin: React sign-in and dashboard, CRUD for products/categories/videos, enquiries, settings, account and responsive navigation. Hash routes are retained. Classic admin remains available at `/admin/classic/`.
- PWA: separate public and admin manifests/service workers. Admin update banner appears when a new worker waits.

## Safety and deployment

The installer copies only the Next frontend and related build/test files. It never replaces `worker/wrangler.toml`, Worker secrets, D1 data or `.env`. It backs up existing files and creates a Git backup branch before writing. A failed local build restores copied files. If the Git push succeeds but Pages fails, use the backup branch or revert the migration commit and push `main`; the Worker and database were not migrated. The backup directory is printed by the installer.

Cloudflare Pages build command: `npm run build`. Build output: `dist`. Node.js 22.16.0 is specified in `.node-version`. Keep existing `API_BASE_URL`, `TURNSTILE_SITE_KEY`, and `SITE_URL` build variables if configured. Do not put admin passwords in `NEXT_PUBLIC_*` variables.

## Phone verification after Pages reports Success

1. Open `/`, `/collections/`, a product detail, `/contact/`, `/videos/`, `/privacy/` and `/terms/` in an incognito browser.
2. Confirm product count, categories and search. Hide a test product in admin; confirm it disappears from collection and its direct product link returns unavailable. Restore it.
3. Open `/admin/` and sign in with the existing credentials. Edit a harmless text field in Website content, save, then reload the public home and confirm it changed. Restore the text.
4. Open Products, Categories, Videos and Enquiries; check counts and image thumbnails. Test a non-destructive edit and save. Do not test deletion on live data.
5. Submit a test enquiry and check it appears in admin; verify WhatsApp message and Turnstile if enabled.
6. Check installed public/admin PWAs after an update, on a phone and desktop. Try menu, search, back navigation, reduced-motion preference and offline state.
7. Confirm product Open Graph metadata and sitemap still work. If any critical function fails, revert the migration commit using the printed backup branch.

## Limits

Next static export does not run a Node server. Live data still comes from the existing Worker. Next framework JavaScript adds weight relative to the previous vanilla build: initial home scripts total about 174 KiB gzipped, above the earlier ~150 KiB target. Performance and Lighthouse 90+ are targets, not verified scores. Browser/device QA and authenticated live API checks require your account/session after deployment.
