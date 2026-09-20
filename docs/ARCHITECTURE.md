# Production architecture

## Scope

HUSBA Beads is a product presentation and enquiry system. It deliberately has no cart, checkout, automated payment, customer login or order table. A visitor discovers a piece, sends an enquiry and continues the conversation personally with the brand.

## Request flows

### Public catalogue

1. Cloudflare Pages serves static, cached HTML, CSS and JavaScript.
2. The browser requests public content from the Worker under `/api/*`.
3. The Worker validates query parameters and reads active records from D1.
4. Product images and videos are delivered directly from Cloudinary.

### Enquiry

1. The browser validates required fields and obtains a Turnstile response.
2. The Worker checks the exact request origin, body size, honeypot, Turnstile response and field limits.
3. If a product ID was submitted, the Worker resolves the product name from D1 rather than trusting browser text.
4. D1 stores the enquiry with a generated reference.
5. The visitor receives confirmation and, if configured, a WhatsApp continuation link.

### Admin

1. Cloudflare Access challenges the administrator before the protected route reaches the application.
2. Access supplies a signed JWT assertion to the Worker.
3. The Worker downloads and caches the Access public keys, then verifies signature, issuer, expiry, audience and optional administrator email.
4. Only then can an admin endpoint read or mutate D1.

## D1 tables

| Table | Purpose | Important relationships |
| --- | --- | --- |
| `site_settings` | Small editable brand and contact values | Key/value table limited by an API allowlist |
| `categories` | Catalogue organization and display order | One category can contain many products |
| `products` | Product copy, availability, optional price and publication state | Belongs to a category; has media, films and enquiries |
| `product_media` | Ordered Cloudinary image/video URLs for a product gallery | Deleted automatically with its product |
| `product_videos` | Full-screen film URL, poster, caption and linked product | Product link can be cleared without deleting a film |
| `enquiries` | Customer request, reference, status and private admin notes | Keeps the submitted product name even if a product is later removed |
| `reviews` | Genuine public customer feedback and display order | Independent so it can be published or hidden safely |

Prices are stored as integer minor units (`price_minor`) to avoid floating-point errors. They remain optional because the site is enquiry-led.

## Public API

| Method | Route | Result |
| --- | --- | --- |
| `GET` | `/api/health` | D1 connectivity status |
| `GET` | `/api/bootstrap` | Settings, categories, featured products, films and reviews |
| `GET` | `/api/products` | Filtered public catalogue |
| `GET` | `/api/products/:slug` | Product detail and related pieces |
| `GET` | `/api/videos` | Published full-screen product films |
| `POST` | `/api/enquiries` | Validated enquiry creation |

## Admin API

All routes below require a valid Cloudflare Access assertion.

| Resource | Operations |
| --- | --- |
| `/api/admin/session` | Verify the current admin session |
| `/api/admin/dashboard` | Counts and recent enquiries |
| `/api/admin/settings` | Read and update allowed website settings |
| `/api/admin/products` | List, add, edit and remove products and their media |
| `/api/admin/categories` | List, add, edit and safely remove categories |
| `/api/admin/videos` | List, add, edit and remove full-screen films |
| `/api/admin/reviews` | List, add, edit and remove reviews |
| `/api/admin/enquiries` | Search enquiries and update status/notes |

## Frontend design

The frontend is dependency-free JavaScript with native web components for the shared header/footer and small page-specific modules. This keeps the transfer size low and avoids a framework runtime.

- Progressive demo fallback is available only while `DEMO_MODE=true`.
- Public data is HTML-escaped before dynamic rendering.
- Cloudinary image URLs receive width, format and quality transformations plus `srcset`.
- Full-screen video sources are lazy attached; only the visible and next film are prepared.
- Reduced-motion visitors do not receive autoplay or animated transitions.
- Page-specific loading, empty and error states prevent blank screens.

## URL and hosting layout

The recommended production arrangement is:

- Pages serves the website and `/admin/`.
- The Worker serves `/api/*`, either on its Cloudflare-assigned HTTPS hostname or a routed custom hostname.
- `API_BASE_URL` tells the Pages build which origin to call and is added to the Content Security Policy during the build.
- Cloudinary serves only media assets; D1 stores their delivery URLs and optional public IDs.

The source `wrangler.toml` contains one explicit placeholder for the real D1 database ID. No account identifiers are guessed.
