# HUSBA Beads

A premium, mobile-first product catalogue and enquiry website for **HUSBA Beads**. It is intentionally enquiry-led: there is no cart, checkout, payment gateway, customer account or automatic order creation.

The repository is ready for:

- GitHub source control and automatic quality checks
- Cloudflare Pages for the frontend
- Cloudflare Workers for the API
- Cloudflare D1 for products, content and enquiries
- Cloudflare Access for the private admin area
- Cloudflare Turnstile for enquiry spam protection
- Cloudinary for production image and video delivery

No Cloudinary API secret is used or exposed. The admin pastes secure Cloudinary delivery URLs for media that has already been uploaded to Cloudinary.

## Included experience

- Editorial luxury homepage with page transitions, scroll reveals, parallax and refined micro-interactions
- Searchable and filterable product collection
- Individual product pages with responsive Cloudinary images, materials, sizing, availability and optional prices
- Full-screen, vertically snapping product-film experience
- Product, custom-design and bulk enquiry forms
- Optional WhatsApp continuation after a successful enquiry
- Loading, empty, success and error states
- Responsive layouts for phone, tablet and desktop
- Keyboard focus, reduced-motion support, semantic content and accessible form labelling
- SEO metadata, sitemap generation, canonical product URLs and Schema.org microdata
- Secure admin for products, categories, videos, reviews, website content and enquiry status

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Static HTML, CSS and JavaScript, responsive UI and admin client |
| API | Cloudflare Worker | Validation, content API, enquiries and authenticated admin operations |
| Database | Cloudflare D1 | Products, media references, videos, content, reviews and enquiries |
| Media | Cloudinary | Production images, video files and poster images |
| Admin security | Cloudflare Access + Worker JWT verification | Identity gate and server-side authorization |
| Form security | Cloudflare Turnstile + origin checks | Bot resistance and cross-origin mutation protection |
| Source | GitHub | Version history, review and Cloudflare Git deployments |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for request flows, tables and API routes.

## Repository structure

```text
.
├── .github/workflows/quality.yml
├── apps/web/                    # Cloudflare Pages source
│   ├── assets/css/              # Public and admin design systems
│   ├── assets/js/               # UI, API client and admin logic
│   ├── assets/media/            # Brand and replaceable local preview media
│   ├── data/demo.json           # Frontend preview data
│   ├── admin/                   # Private admin interface
│   ├── collections/             # Catalogue
│   ├── product/                 # Dynamic product template
│   ├── videos/                  # Full-screen product films
│   └── ...                      # Home, story, contact and policy pages
├── docs/                        # Architecture, security and deployment guides
├── scripts/                     # Dependency-free build, preview and checks
├── tests/                       # Worker validation and security tests
├── worker/
│   ├── migrations/              # D1 schema
│   ├── seed/                    # Optional replaceable preview content
│   ├── src/index.js             # Worker API
│   ├── .dev.vars.example        # Local variable names only
│   └── wrangler.toml            # Worker and D1 binding configuration
└── package.json
```

## Verify locally

Node.js 20 or newer is required. The project has no runtime package dependencies.

```bash
npm run build
npm test
npm run check
npm run preview
```

Open `http://localhost:4173`. The frontend uses its local preview catalogue until a deployed API is configured.

## Frontend build variables

Set these in the Cloudflare Pages project. Values must come from your own Cloudflare deployments.

| Variable | Required | Where the real value comes from |
| --- | --- | --- |
| `API_BASE_URL` | Yes for a separate API domain | The HTTPS URL Cloudflare assigns to the deployed Worker. Leave blank only if `/api/*` is routed to the Worker on the same site domain. |
| `TURNSTILE_SITE_KEY` | Optional | The public site key shown after creating a Turnstile widget in your Cloudflare account. Leave blank when Turnstile is not configured. |
| `SITE_URL` | Recommended | The final Pages or custom-domain origin, with no trailing slash. |
| `DEMO_MODE` | Yes | Use `true` while previewing; change to `false` after the Worker and D1 are live. |

Pages settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

## Worker configuration

The D1 binding name is exactly `DB`; it matches the Worker code and migration.

Before deployment, create the D1 database in your Cloudflare account and replace only `REPLACE_WITH_REAL_D1_DATABASE_ID` in `worker/wrangler.toml` with the ID Cloudflare displays for that database.

Set these Worker variables using your own account values:

| Variable or secret | Type | Source |
| --- | --- | --- |
| `ENVIRONMENT` | Variable | `production` for the live Worker |
| `ALLOWED_ORIGINS` | Encrypted secret | Exact Pages and custom-domain origins, comma-separated |
| `CF_ACCESS_TEAM_DOMAIN` | Encrypted secret | Your Cloudflare Zero Trust team domain |
| `CF_ACCESS_AUD` | Encrypted secret | The application audience tag from the Access application protecting the admin API |
| `ADMIN_EMAIL` | Encrypted secret | Optional exact email allowed to administer the site |
| `TURNSTILE_SECRET_KEY` | Optional encrypted secret | The secret key from the Cloudflare Turnstile widget. Without it, honeypot and duplicate-submit protection are used. |

Although the first four values are configuration rather than credentials, storing all account-specific values as Worker secrets prevents a Git deployment from overwriting them with empty or placeholder values.

`DEV_ADMIN_TOKEN` is only for local development. It is ignored unless `ENVIRONMENT=development` and must never be used as the production admin mechanism.

From the `worker` directory, the equivalent Wrangler commands are:

```bash
npx wrangler@4 d1 migrations apply husba-beads --remote
npx wrangler@4 deploy
```

Cloudflare's Git integration can run the deployment from GitHub; a phone-friendly, screenshot-led sequence is documented in [docs/PHONE-DEPLOYMENT.md](docs/PHONE-DEPLOYMENT.md).

## D1 data

`worker/migrations/0001_initial.sql` creates the complete production schema and only neutral brand settings. It does not invent contact information, credentials or customer reviews.

`worker/seed/demo.sql` is optional. It adds the three clearly labelled sample products shown in local preview. Do not apply it if you want the live database to start empty.

## Cloudinary workflow

1. Upload the real product image, video or poster in your Cloudinary account.
2. Copy its secure delivery URL.
3. Open the website admin.
4. Paste image URLs into a product or paste a video and poster URL into **Product videos**.
5. Save and publish.

The browser automatically requests right-sized, quality-optimized Cloudinary images. Full-screen videos load only when the visitor reaches the current or next story. More details are in [docs/CLOUDINARY.md](docs/CLOUDINARY.md).

## Admin protection

Protect both of these paths with Cloudflare Access:

- the Pages admin path: `/admin/*`
- the Worker admin API path: `/api/admin/*`

The Worker also verifies the Access JWT signature, issuer, expiry and application audience on every admin API request. Hiding the admin link is not treated as security.

## Deployment rule for this project

Deployment should be done one screen at a time. If a Cloudflare or GitHub screen differs, stop and use a screenshot before changing another setting. Do not paste account IDs, tokens or secret keys into public repository files.

## Before launch

- Replace sample products and preview media with real products and Cloudinary URLs.
- Add the real WhatsApp display number, WhatsApp digits, email and location in admin.
- Add only genuine customer reviews.
- Test a real enquiry and confirm it appears in admin.
- Confirm Access blocks a signed-out visitor from both admin paths.
- Set `DEMO_MODE=false` and redeploy Pages.
- Review the privacy and website terms for your exact business and local legal requirements.

Security details and operational checks are in [docs/SECURITY.md](docs/SECURITY.md).
