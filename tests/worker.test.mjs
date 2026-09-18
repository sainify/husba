import test from "node:test";
import assert from "node:assert/strict";
import worker, { HttpError, sanitizeText, slugify, validateCloudinaryUrl, validateEnquiry } from "../worker/src/index.js";

test("brand-safe slugs remove accents", () => {
  assert.equal(slugify("HUSBA Pearl Glow"), "husba-pearl-glow");
});

test("text sanitization removes markup delimiters and controls", () => {
  assert.equal(sanitizeText("  <b>Glow</b>\u0000  "), "bGlow/b");
});

test("media validation accepts only secure Cloudinary delivery URLs", () => {
  assert.equal(
    validateCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg", "image", true),
    "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  );
  assert.throws(
    () => validateCloudinaryUrl("https://example.com/sample.jpg", "image", true),
    (error) => error instanceof HttpError && error.status === 400,
  );
  assert.throws(
    () => validateCloudinaryUrl("http://res.cloudinary.com/demo/video/upload/sample.mp4", "video", true),
    (error) => error instanceof HttpError && error.status === 400,
  );
});

test("enquiry validation normalizes the allowed fields", () => {
  const result = validateEnquiry({
    name: "  Asha  ",
    phone: "+91 98765 43210",
    enquiry_type: "custom",
    quantity: 12,
    message: "A blush bracelet for gifting.",
  });
  assert.equal(result.name, "Asha");
  assert.equal(result.phone, "+919876543210");
  assert.equal(result.enquiry_type, "custom");
  assert.equal(result.quantity, 12);
});

test("only name and WhatsApp number are required for enquiries", () => {
  const result = validateEnquiry({ name: "Asha", phone: "+91 98765 43210" });
  assert.equal(result.name, "Asha");
  assert.equal(result.phone, "+919876543210");
  assert.equal(result.message, "");
  assert.equal(result.city, "");
  assert.equal(result.enquiry_type, "product");
  assert.equal(result.quantity, 1);
});

test("invalid enquiry phone numbers are rejected", () => {
  assert.throws(
    () => validateEnquiry({ name: "Asha", phone: "123", message: "Custom piece" }),
    (error) => error instanceof HttpError && error.status === 400,
  );
});

test("unknown public endpoints return a safe JSON 404", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/api/missing"), {});
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error.message, "API endpoint not found.");
});

test("cross-origin mutations are rejected before database access", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/api/enquiries", {
    method: "POST",
    headers: { Origin: "https://malicious.example", "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }), { ALLOWED_ORIGINS: "https://shop.example.test" });
  assert.equal(response.status, 403);
});
