# Phone-first deployment reference

This is the complete reference included with the repository. During the actual deployment, perform only one screen/action at a time and compare the result with a screenshot before continuing. Cloudflare and GitHub labels can change.

## Phase 1 — GitHub

- Create a new repository named for the project.
- Do not pre-create another README, `.gitignore` or license because this package already contains the project files.
- Upload the extracted project contents so `package.json`, `apps`, `worker` and `docs` are at the repository root.
- Confirm the GitHub quality workflow finishes successfully.

## Phase 2 — D1

- Create a D1 database named `husba-beads` in your Cloudflare account.
- Copy the real database ID displayed by Cloudflare.
- In GitHub, edit `worker/wrangler.toml` and replace only `REPLACE_WITH_REAL_D1_DATABASE_ID`.
- Apply `worker/migrations/0001_initial.sql` through the D1 migration workflow.
- Apply `worker/seed/demo.sql` only if you intentionally want the three replaceable sample products.

## Phase 3 — Worker API

- Create/connect a Worker from the GitHub repository with `worker` as its root directory.
- Deploy using `npx wrangler@4 deploy`.
- Confirm the binding named `DB` points to the D1 database.
- Add the account-specific values listed in the README as encrypted Worker secrets using values from your account.
- Optionally add `TURNSTILE_SECRET_KEY` as an encrypted secret after the Turnstile widget exists. Enquiries continue to work without it using the built-in honeypot and duplicate-submit protection.
- Open the real `/api/health` URL and confirm it reports success.

## Phase 4 — Pages frontend

- Create a Cloudflare Pages project connected to the same GitHub repository.
- Use `npm run build` as the build command and `dist` as the output directory.
- Set `API_BASE_URL` to the real deployed Worker origin unless the Worker is routed on the same origin.
- Set `SITE_URL` to the real Pages/custom origin.
- Keep `DEMO_MODE=true` only until D1 content and the API are confirmed; then set it to `false` and redeploy.

## Phase 5 — Turnstile

- Create a Turnstile widget for the actual Pages/custom hostnames.
- Add the public site key to Pages as `TURNSTILE_SITE_KEY`.
- Add the matching secret key to the Worker as encrypted `TURNSTILE_SECRET_KEY`.
- Redeploy and send a test enquiry.

## Phase 6 — Cloudflare Access

- In Cloudflare Zero Trust, create an Access application that protects the website admin path.
- Protect the Worker admin API path too.
- Allow only your chosen administrator identity.
- Copy the real team domain and application audience tag into the Worker variables.
- Optionally set `ADMIN_EMAIL` to the exact permitted email.
- Confirm both admin routes fail closed while signed out and work after authentication.

## Phase 7 — Real content and Cloudinary

- Upload real media into your Cloudinary account.
- Sign in to the website admin.
- Add real categories, products, product images and product films using secure Cloudinary delivery URLs.
- Add real contact details and only genuine customer reviews.
- Hide or remove all sample records.

## Phase 8 — Launch checks

- Add the custom domain if one is available.
- Update `ALLOWED_ORIGINS`, `SITE_URL`, Turnstile hostnames and Access paths for that domain.
- Test navigation, film playback, an enquiry, WhatsApp continuation and admin on a phone.
- Review the privacy and terms pages for the exact business.
- Set `DEMO_MODE=false` and make the final Pages deployment.

Never paste a secret into a screenshot, GitHub file, frontend variable or chat message. When an error appears, stop at that screen, read the exact message and change only the setting tied to that error.
