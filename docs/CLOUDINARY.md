# Cloudinary media guide

## Recommended folders

Use a simple structure in your own Cloudinary media library:

```text
husba/
├── products/
├── videos/
└── posters/
```

This is an organizational recommendation, not a required credential or account setting.

## Product images

- Upload the largest clean original available.
- Prefer consistent portrait framing; a 4:5 composition fits catalogue cards best.
- Use descriptive public IDs and meaningful alt text in the product name/details.
- Copy the secure delivery URL beginning with `https://`.
- Paste one image URL per line in the product editor. The first becomes the cover.

The frontend adds Cloudinary `f_auto`, `q_auto:good`, width limits and responsive `srcset` candidates. Original files remain in Cloudinary; no API secret reaches the browser.

## Full-screen product films

- Portrait video works best for the reel-style screen.
- Keep the first moment visually useful because playback may be blocked until a visitor interacts.
- Use a compressed web delivery asset with clear product detail and restrained movement.
- Upload a separate poster image when possible; it appears before the video loads.
- Copy the secure Cloudinary video delivery URL and poster URL.
- In admin, open **Product videos**, select an optional linked product, paste both URLs, set the order and publish.

The page uses `playsinline`, muted autoplay when motion preferences allow it, native controls through accessible buttons and lazy source loading. The next film is prepared in advance without downloading the entire feed at once.

## Product gallery video

The product editor also accepts one optional Cloudinary video URL inside the product gallery. This is separate from the full-screen Product videos section.

## Secrets

The admin supports both URL paste and secure camera/gallery upload. URL paste does not require:

- Cloudinary API key in the frontend
- Cloudinary API secret in the frontend or repository
- unsigned browser uploads

Direct camera/gallery upload uses a short-lived signature created by the authenticated Worker. Configure `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_API_KEY`, and store `CLOUDINARY_API_SECRET` as an encrypted Worker secret. The secret is never returned to the browser or committed to Git.

If direct uploads are added later, create a Worker signing endpoint and store the Cloudinary API secret as an encrypted Worker secret. Do not retrofit a secret into `config.js` or any file under `apps/web`.

## Replacing preview media

The three small local images are replaceable launch previews. Once the live API is connected, add real products through admin with real Cloudinary URLs and set `DEMO_MODE=false` for the Pages build.
