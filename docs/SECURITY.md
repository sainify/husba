# Security and operations

## Implemented controls

- Cloudflare Access identity gate for admin routes
- Independent Worker verification of Access JWT signature, issuer, audience, expiry and optional email
- Exact-origin allowlist on all mutating API requests
- Cloudflare Turnstile server verification for public enquiries
- Request body size limits and strict field length/type allowlists
- Honeypot and duplicate-phone cooldown for basic spam resistance
- Cloudinary-only secure external media URLs
- Parameterized D1 statements
- HTML escaping for dynamic frontend and admin content
- No-store responses for admin data and errors
- Content Security Policy, clickjacking protection, MIME sniffing protection and restrictive permissions policy
- No production password, token, Cloudinary secret or account ID in source code

## Required production controls

1. Protect the Pages path `/admin/*` using a Cloudflare Access self-hosted application.
2. Protect `/api/admin/*` on the Worker hostname or route with Access as well.
3. Put the exact Access audience tag in `CF_ACCESS_AUD`.
4. Put the exact Zero Trust team domain in `CF_ACCESS_TEAM_DOMAIN`.
5. Set `ADMIN_EMAIL` if only one identity should be allowed.
6. Restrict `ALLOWED_ORIGINS` to the real Pages/custom origins; do not use `*`.
7. Store `TURNSTILE_SECRET_KEY` as an encrypted Worker secret, never a plain GitHub file.
8. Keep `ENVIRONMENT=production` on the live Worker. Turnstile is optional; when its secret is absent, honeypot and duplicate-submit protection remain active.

## Secret boundaries

Safe public values:

- Pages URL
- Worker URL
- Turnstile site key
- Cloudinary delivery URLs and public IDs

Private values:

- Turnstile secret key
- Cloudflare API tokens
- any future Cloudinary API secret

Private values belong only in Cloudflare encrypted secrets or the appropriate protected deployment settings.

## Enquiry data

Enquiries contain personal contact information. Limit admin access, periodically close/delete records that are no longer needed, and never expose the admin API publicly without Access. The included privacy text is a practical starting point, not jurisdiction-specific legal advice.

## Verification after every release

- Signed-out access to admin UI is challenged.
- Signed-out access to `/api/admin/session` is denied.
- Public catalogue and one product page load on a phone-sized viewport.
- A test enquiry passes Turnstile and appears in admin.
- A repeated immediate enquiry is rate-limited.
- A non-Cloudinary media URL is rejected by admin.
- Browser developer tools show no secret values in `config.js` or network payloads.
- Worker health returns success and no D1 binding error.

## Recovery

- GitHub retains source history and allows a previous commit to be redeployed.
- Cloudflare deployment history can roll the frontend or Worker back.
- D1 data should be exported or backed up before destructive schema work.
- Product media remains in Cloudinary even if a D1 product reference is removed; remove Cloudinary assets separately only after confirming they are no longer needed.
