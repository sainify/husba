# HUSBA Beads · The Thread release

## Inspected source
- Next.js 16.3.8, React 19.2.4, static export (`out/` assembled into `dist/`) on Cloudflare Pages.
- Public routes: `/`, `/collections/`, `/product/?slug=…`, `/videos/`, `/story/`, `/about/`, `/contact/`, `/privacy/`, `/terms/` and 404. `/admin/` remains the authenticated React workspace, with `/admin/classic/` compatibility.
- Separate Worker/D1 API. Existing D1 migrations have products, media, categories, videos, enquiries and settings. Existing Worker CORS, auth, settings and Cloudinary URLs remain unchanged. Worker and bindings are not redeployed by this installer.
- Public and admin PWAs retain separate service workers, now versioned for this release. Private API data is not cached by them.

## Changed
- Rebuilt the public visual language around ivory, mulberry, arch images and a fine thread/bead motif. Reworked home, navigation, search, footer, collections, product details, story, 404 and admin styling.
- Mobile navigation now traps focus, locks scroll, closes on Escape or link selection, and restores focus. Search shows live published matches from the existing API.
- Home films use muted autoplay only while visible, poster under reduced motion or Save-Data, and no play/pause button.
- Collections uses the existing paginated API (12 per request), load more, URL query for filters, missing-image fallback, loading and error states. Availability filtering applies to loaded batches; continue loading to see later matches. No product API or hidden product rule changed.
- Product gallery adds swipe, lightbox, keyboard arrows, related pieces, and personalisation notes in enquiry links. Contact form validates Indian mobile numbers and requires a message.
- Admin keeps the previously deployed fast-save patch; adds a delayed-operation notice, product category/visibility filters, password visibility, dirty-state warning, duplicate product shortcut and refreshed mobile styling. The Worker must confirm writes before Saved appears.
- No D1 migration, auth change, secret, or Worker deployment.

## Verified locally
- `npm test`: 10 passed (including session, pagination, worker, PWA and stalled request checks).
- `npm run build`: Next static export succeeded.
- `npm run check`: required public/admin compatibility routes and assembled `dist` verified.
- Installer dry-run validated against source hashes from the previous Next and fast-save releases.

## Limits and live checks
- Live admin sign-in/save time, D1 persistence, Pages deployment, mobile devices, Cloudinary media, actual visual layout, reduced-motion browser behavior, Lighthouse/INP/LCP/CLS and phone/network timings were not measured here. Verify them on the production site.
- The source contains no local Cormorant Garamond or Jost font binaries, and the isolated build environment cannot download them. This release loads the requested font families from Google Fonts in the browser with serif/sans fallbacks; self-hosting via `next/font/local` requires licensed font files.
- Direct Cloudinary uploads cannot be enabled safely without the account's upload preset/config; the existing Cloudinary URL paste workflow remains. The admin data schema does not contain new personalisation, care or legal-content fields; the design uses existing fields and sensible copy without destructive migrations.
- No fabricated reviews/social proof are rendered. Large admin feature requests such as Kanban and offline editing are not represented as complete in this release.

## Rollback
The installer prints a backup branch, private backup path and new commit. On a clean checkout, revert the printed new commit with `git revert <commit> && git push origin main`. No database restore is needed because D1 was not modified.
