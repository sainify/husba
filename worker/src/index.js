const SETTING_KEYS = new Set([
  "brand_name", "announcement", "announcement_1", "announcement_2", "announcement_3", "category_images", "whatsapp_social_url", "facebook_url", "youtube_url", "pinterest_url", "tiktok_url", "hero_title", "hero_copy", "hero_cta_text", "hero_cta_url", "hero_media_type", "whatsapp_number",
  "whatsapp_display", "email", "location", "instagram_url", "hero_eyebrow",
  "hero_image_url", "hero_image_alt", "hero_video_url", "hero_video_poster_url", "featured_eyebrow", "featured_title",
  "featured_copy", "video_eyebrow", "video_title", "video_copy",
  "categories_eyebrow", "categories_title", "categories_copy",
  "enquiry_eyebrow", "enquiry_title", "enquiry_copy", "footer_description",
  "logo_url", "seo_title", "seo_description", "seo_image_url",
  "banner_image_1", "banner_image_2", "banner_image_3", "banner_image_4",
  "banner_image_5", "show_products_section", "show_videos_section",
  "show_categories_section", "show_enquiry_section",
]);
const PRODUCT_STATUSES = new Set(["available", "made_to_order", "sold_out"]);
const ENQUIRY_TYPES = new Set(["product", "custom", "bulk"]);
const ENQUIRY_STATUSES = new Set(["new", "contacted", "closed"]);
const BOOLEAN_COLUMNS = ["show_price", "is_featured", "is_new", "is_active"];

export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export const sanitizeText = (value, maximum = 500, { required = false, minimum = 0 } = {}) => {
  const cleaned = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim();
  if (required && cleaned.length < Math.max(1, minimum)) throw new HttpError(400, "Please complete all required fields.");
  if (cleaned.length > maximum) throw new HttpError(400, `A field is longer than the allowed ${maximum} characters.`);
  return cleaned;
};

export const slugify = (value) => sanitizeText(value, 160)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 140);

const toBoolean = (value, fallback = false) => value === undefined
  ? fallback
  : value === true || value === 1 || value === "1" || value === "true";

const boundedInteger = (value, minimum, maximum, fallback = 0) => {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
};

const isCloudinaryHost = (hostname) => hostname === "res.cloudinary.com" || hostname.endsWith(".cloudinary.com");

export const validateCloudinaryUrl = (value, expectedType = "any", required = false) => {
  const input = String(value ?? "").trim();
  if (!input && !required) return "";
  if (!input && required) throw new HttpError(400, "A Cloudinary media URL is required.");
  if (input.startsWith("/assets/media/")) return input;
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new HttpError(400, "Please use a valid Cloudinary URL.");
  }
  if (parsed.protocol !== "https:" || !isCloudinaryHost(parsed.hostname)) throw new HttpError(400, "Media URLs must use secure Cloudinary links.");
  if (expectedType === "image" && !parsed.pathname.includes("/image/upload/") && !parsed.pathname.includes("/video/upload/")) throw new HttpError(400, "Please use a Cloudinary image URL.");
  if (expectedType === "video" && !parsed.pathname.includes("/video/upload/")) throw new HttpError(400, "Please use a Cloudinary video URL.");
  return parsed.href;
};

const validateHttpsUrl = (value, required = false) => {
  const input = String(value ?? "").trim();
  if (!input && !required) return "";
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "https:") throw new Error("invalid protocol");
    return parsed.href;
  } catch {
    throw new HttpError(400, "Please enter a valid secure URL.");
  }
};

const mapBooleans = (row, columns = BOOLEAN_COLUMNS) => {
  if (!row) return row;
  const mapped = { ...row };
  columns.forEach((column) => {
    if (column in mapped) mapped[column] = Boolean(mapped[column]);
  });
  return mapped;
};

const json = (payload, status = 200, headers = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": status >= 400 ? "no-store" : "no-cache",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  },
});

const allowedOrigins = (env) => String(env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const isAllowedOrigin = (origin, env, ownOrigin) => {
  if (!origin) return false;
  if (origin === ownOrigin) return true;
  return allowedOrigins(env).some((configuredOrigin) => {
    if (origin === configuredOrigin) return true;
    try {
      const originHost = new URL(origin).hostname;
      const configuredHost = new URL(configuredOrigin).hostname;
      return originHost.endsWith(`.${configuredHost}`);
    } catch {
      return false;
    }
  });
};

const corsHeaders = (request, env) => {
  const origin = request.headers.get("Origin");
  if (!origin) return { Vary: "Origin" };
  const ownOrigin = new URL(request.url).origin;
  if (!isAllowedOrigin(origin, env, ownOrigin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Dev-Admin-Token",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    Vary: "Origin",
  };
};

const assertOrigin = (request, env) => {
  const origin = request.headers.get("Origin");
  if (!origin) return;
  const ownOrigin = new URL(request.url).origin;
  if (!isAllowedOrigin(origin, env, ownOrigin)) throw new HttpError(403, "This website origin is not allowed.");
};

const readJson = async (request, maximumBytes = 64_000) => {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > maximumBytes) throw new HttpError(413, "The submitted information is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maximumBytes) throw new HttpError(413, "The submitted information is too large.");
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new HttpError(400, "The submitted information is not valid.");
  }
};

const requireDatabase = (env) => {
  if (!env.DB) throw new HttpError(503, "The website database is not connected yet.");
  return env.DB;
};

const getSettings = async (env) => {
  const result = await requireDatabase(env).prepare("SELECT key, value FROM site_settings ORDER BY key").all();
  return Object.fromEntries((result.results || []).map((row) => [row.key, row.value]));
};

const getCategories = async (env, includeInactive = false) => {
  const sql = `SELECT id, name, slug, description, sort_order, is_active, created_at, updated_at FROM categories ${includeInactive ? "" : "WHERE is_active = 1"} ORDER BY sort_order ASC, name ASC`;
  const result = await requireDatabase(env).prepare(sql).all();
  return (result.results || []).map((row) => mapBooleans(row, ["is_active"]));
};

const attachMedia = async (env, products) => {
  if (!products.length) return products;
  const ids = products.map((product) => product.id);
  const placeholders = ids.map(() => "?").join(",");
  const result = await requireDatabase(env)
    .prepare(`SELECT id, product_id, media_type, url, cloudinary_public_id, poster_url, alt_text, sort_order FROM product_media WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC, created_at ASC`)
    .bind(...ids)
    .all();
  const grouped = new Map(ids.map((id) => [id, []]));
  (result.results || []).forEach((item) => grouped.get(item.product_id)?.push(item));
  return products.map((product) => ({ ...mapBooleans(product), media: grouped.get(product.id) || [] }));
};

const listProducts = async (env, options = {}) => {
  const clauses = [];
  const bindings = [];
  if (!options.includeInactive) clauses.push("p.is_active = 1");
  if (options.category) {
    clauses.push("c.slug = ?");
    bindings.push(sanitizeText(options.category, 100));
  }
  if (options.search) {
    clauses.push("(p.name LIKE ? OR p.product_code LIKE ? OR p.description LIKE ?)");
    const search = `%${sanitizeText(options.search, 80)}%`;
    bindings.push(search, search, search);
  }
  if (options.featured) clauses.push("p.is_featured = 1");
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = boundedInteger(options.limit, 1, 100, 48);
  const offset = boundedInteger(options.offset, 0, 100_000, 0);
  const select = `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where} ORDER BY p.is_featured DESC, p.sort_order ASC, p.created_at DESC LIMIT ? OFFSET ?`;
  const count = `SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`;
  const db = requireDatabase(env);
  const [rows, total] = await Promise.all([
    db.prepare(select).bind(...bindings, limit, offset).all(),
    db.prepare(count).bind(...bindings).first(),
  ]);
  return { products: await attachMedia(env, rows.results || []), total: Number(total?.total || 0) };
};

const getProductBySlug = async (env, slug, includeInactive = false) => {
  const row = await requireDatabase(env)
    .prepare(`SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.slug = ? ${includeInactive ? "" : "AND p.is_active = 1"} LIMIT 1`)
    .bind(slug)
    .first();
  if (!row) throw new HttpError(404, "Product not found.");
  const [product] = await attachMedia(env, [row]);
  return product;
};

const listVideos = async (env, includeInactive = false) => {
  const result = await requireDatabase(env).prepare(`
    SELECT v.id, v.product_id, v.title, v.caption, v.video_url, v.cloudinary_public_id,
      COALESCE(NULLIF(v.poster_url, ''), p.primary_image_url, '') AS poster_url,
      v.poster_alt, v.is_featured, v.is_active, v.sort_order, v.created_at, v.updated_at,
      p.name AS product_name, p.slug AS product_slug, p.primary_image_url, c.name AS category_name
    FROM product_videos v
    LEFT JOIN products p ON p.id = v.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    ${includeInactive ? "" : "WHERE v.is_active = 1"}
    ORDER BY v.sort_order ASC, v.created_at DESC
  `).all();
  return (result.results || []).map((row) => mapBooleans(row, ["is_featured", "is_active"]));
};

const listReviews = async (env, includeInactive = false) => {
  const result = await requireDatabase(env)
    .prepare(`SELECT id, customer_name, location, quote, rating, is_active, sort_order, created_at, updated_at FROM reviews ${includeInactive ? "" : "WHERE is_active = 1"} ORDER BY sort_order ASC, created_at DESC`)
    .all();
  return (result.results || []).map((row) => mapBooleans(row, ["is_active"]));
};

const verifyTurnstile = async (request, env, token) => {
  if (!env.TURNSTILE_SECRET_KEY) return;
  if (!token) throw new HttpError(400, "Please complete the security check.");
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) form.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const result = await response.json();
  if (!result.success) throw new HttpError(400, "The security check could not be verified. Please try again.");
};

export const validateEnquiry = (input) => {
  const name = sanitizeText(input.name, 80, { required: true, minimum: 2 });
  const phone = sanitizeText(input.phone, 20, { required: true, minimum: 7 });
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) throw new HttpError(400, "Please enter a valid WhatsApp number.");
  const normalizedPhone = `${phone.startsWith("+") ? "+" : ""}${phoneDigits}`;
  const enquiryType = sanitizeText(input.enquiry_type || "product", 20);
  if (!ENQUIRY_TYPES.has(enquiryType)) throw new HttpError(400, "Please select a valid enquiry type.");
  return {
    product_id: sanitizeText(input.product_id, 64) || null,
    product_name: sanitizeText(input.product_name, 120),
    name,
    phone: normalizedPhone,
    city: sanitizeText(input.city, 80),
    enquiry_type: enquiryType,
    quantity: boundedInteger(input.quantity, 1, 10_000, 1),
    message: sanitizeText(input.message, 1200),
    website: sanitizeText(input.website, 120),
    turnstile_token: sanitizeText(input.turnstile_token, 2048),
  };
};

const makeReference = () => {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase();
  return `UZ-${date}-${random}`;
};

const submitEnquiry = async (request, env) => {
  const input = validateEnquiry(await readJson(request));
  if (input.website) return { message: "Thank you. Your enquiry has been received.", reference: "received", whatsapp_number: "" };
  await verifyTurnstile(request, env, input.turnstile_token);
  const db = requireDatabase(env);

  let productName = input.product_name;
  if (input.product_id) {
    const product = await db.prepare("SELECT name FROM products WHERE id = ? AND is_active = 1 LIMIT 1").bind(input.product_id).first();
    if (!product) throw new HttpError(400, "The selected product is no longer available.");
    productName = product.name;
  }
  const id = crypto.randomUUID();
  const reference = makeReference();
  await db.prepare("INSERT INTO enquiries (id, reference, product_id, product_name, name, phone, city, enquiry_type, quantity, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, reference, input.product_id, productName, input.name, input.phone, input.city, input.enquiry_type, input.quantity, input.message)
    .run();
  const settings = await getSettings(env);
  return { message: "Thank you. Your enquiry has been received.", reference, whatsapp_number: settings.whatsapp_number || "" };
};

const base64UrlEncode = (value) => {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlDecodeText = (value) => {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(value).length / 4) * 4, "=");
  return new TextDecoder().decode(Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0)));
};

const sessionKey = async (env) => {
  const password = String(env.ADMIN_PASSWORD || "");
  if (password.length < 12) throw new HttpError(503, "Admin login is not configured securely.");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
};

const signSession = async (email, expiresAt, env) => {
  const payload = base64UrlEncode(JSON.stringify({ email, exp: expiresAt }));
  const key = await sessionKey(env);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return `${payload}.${base64UrlEncode(signature)}`;
};

const ensureAdminCredentials = async (db) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_credentials (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
};

const passwordHash = async (password, salt) => {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(password)),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(String(salt)), iterations: 120000 },
    material,
    256
  );
  return base64UrlEncode(new Uint8Array(bits));
};

const currentAdminCredential = async (env) => {
  const db = requireDatabase(env);
  await ensureAdminCredentials(db);
  const stored = await db.prepare("SELECT email, password_hash, password_salt FROM admin_credentials WHERE id = 1").first();
  if (stored) return { ...stored, stored: true };
  return {
    email: String(env.ADMIN_EMAIL || "").trim().toLowerCase(),
    password: String(env.ADMIN_PASSWORD || ""),
    stored: false
  };
};

const credentialMatches = async (credential, password) => credential.stored
  ? await passwordHash(password, credential.password_salt) === credential.password_hash
  : String(password) === credential.password;

const verifySession = async (token, env) => {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) throw new HttpError(401, "Admin login is required.");
  let payload;
  let signature;
  try {
    payload = JSON.parse(base64UrlDecodeText(parts[0]));
    signature = Uint8Array.from(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "=")), (character) => character.charCodeAt(0));
  } catch {
    throw new HttpError(401, "The admin session is invalid.");
  }
  const key = await sessionKey(env);
  const valid = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(parts[0]));
  const now = Math.floor(Date.now() / 1000);
  if (!valid || !payload?.email || !payload?.exp || payload.exp <= now) throw new HttpError(401, "The admin session has expired. Please sign in again.");
  return payload;
};

const getBearerToken = (request) => {
  const authorization = String(request.headers.get("Authorization") || "");
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  const cookie = String(request.headers.get("Cookie") || "");
  const match = cookie.match(/(?:^|;\\s*)husba_admin_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
};

const adminSessionCookie = (token, maxAge = 365 * 24 * 60 * 60) =>
  `husba_admin_session=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=None`;

const clearAdminSessionCookie = () =>
  "husba_admin_session=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None";

const requireAdmin = async (request, env) => {
  if (env.ENVIRONMENT === "development" && env.DEV_ADMIN_TOKEN && request.headers.get("X-Dev-Admin-Token") === env.DEV_ADMIN_TOKEN) return { email: "local-development" };
  const identity = await verifySession(getBearerToken(request), env);
  const credential = await currentAdminCredential(env);
  if (String(identity.email).toLowerCase() !== credential.email) throw new HttpError(403, "This admin session is no longer valid. Please sign in again.");
  return identity;
};

const handleAdminLogin = async (request, env) => {
  if (request.method !== "POST") throw new HttpError(405, "Method not allowed.");

  const credential = await currentAdminCredential(env);
  const configuredEmail = String(credential.email || "").trim().toLowerCase();
  const envEmail = String(env.ADMIN_EMAIL || "").trim().toLowerCase();
  const envPassword = String(env.ADMIN_PASSWORD || "");

  if (!configuredEmail && !envEmail) throw new HttpError(503, "Admin login is not configured yet.");
  if (!credential.stored && !envPassword) throw new HttpError(503, "Admin login is not configured yet.");
  if (!credential.stored && envPassword.length < 12) throw new HttpError(503, "Admin login is not configured securely.");

  const input = await readJson(request, 16_000);
  const email = sanitizeText(input.email, 160).toLowerCase();
  const password = String(input.password || "");

  const matchesStored = credential.stored
    ? email === configuredEmail && await credentialMatches(credential, password)
    : false;

  const matchesBootstrap = Boolean(
    envEmail &&
    envPassword &&
    email === envEmail &&
    password === envPassword
  );

  if (!email || !password || (!matchesStored && !matchesBootstrap)) {
    throw new HttpError(401, "Incorrect email or password.");
  }

  const loginEmail = matchesBootstrap ? envEmail : configuredEmail;

  if (matchesBootstrap && !matchesStored) {
    const db = requireDatabase(env);
    await ensureAdminCredentials(db);
    const salt = base64UrlEncode(crypto.getRandomValues(new Uint8Array(18)));
    const hash = await passwordHash(envPassword, salt);
    await db.prepare(`INSERT INTO admin_credentials(id, email, password_hash, password_salt, updated_at)
      VALUES(1, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET email=excluded.email, password_hash=excluded.password_hash,
      password_salt=excluded.password_salt, updated_at=CURRENT_TIMESTAMP`)
      .bind(envEmail, hash, salt)
      .run();
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const token = await signSession(loginEmail, expiresAt, env);

  return json({ authenticated: true, email: loginEmail, token, expires_at: expiresAt }, 200, {
    "Cache-Control": "no-store",
    "Set-Cookie": adminSessionCookie(token),
  });
};

const validateCategory = (input) => {
  const name = sanitizeText(input.name, 80, { required: true, minimum: 2 });
  const slug = slugify(input.slug || name);
  if (!slug) throw new HttpError(400, "Please enter a valid category name.");
  return {
    name,
    slug,
    description: sanitizeText(input.description, 300),
    sort_order: boundedInteger(input.sort_order, -10_000, 10_000, 0),
    is_active: toBoolean(input.is_active, true),
  };
};

const validateProduct = (input) => {
  const name = sanitizeText(input.name, 120, { required: true, minimum: 2 });
  const slug = slugify(input.slug || name);
  const categoryId = sanitizeText(input.category_id, 64, { required: true });
  const status = sanitizeText(input.status || "available", 30);
  if (!PRODUCT_STATUSES.has(status)) throw new HttpError(400, "Please select a valid availability status.");
  const mediaInput = Array.isArray(input.media) ? input.media.slice(0, 20) : [];
  const media = mediaInput.map((item, index) => {
    const type = item.media_type === "video" ? "video" : "image";
    return {
      media_type: type,
      url: validateCloudinaryUrl(item.url, type, true),
      cloudinary_public_id: sanitizeText(item.cloudinary_public_id, 250),
      poster_url: item.poster_url ? validateCloudinaryUrl(item.poster_url, "image") : "",
      alt_text: sanitizeText(item.alt_text || name, 180),
      sort_order: boundedInteger(item.sort_order, -10_000, 10_000, index + 1),
    };
  });
  if (!media.some((item) => item.media_type === "image")) throw new HttpError(400, "Add at least one Cloudinary product image.");
  const priceMinor = input.price_minor === null || input.price_minor === "" || input.price_minor === undefined
    ? null
    : boundedInteger(input.price_minor, 0, 100_000_000, 0);
  return {
    category_id: categoryId,
    name,
    slug,
    product_code: sanitizeText(input.product_code, 60),
    description: sanitizeText(input.description, 1800, { required: true, minimum: 4 }),
    materials: sanitizeText(input.materials, 300),
    colors: sanitizeText(input.colors, 300),
    sizes: sanitizeText(input.sizes, 300),
    status,
    price_minor: priceMinor,
    price_label: sanitizeText(input.price_label, 80),
    currency: sanitizeText(input.currency || "INR", 3).toUpperCase(),
    show_price: toBoolean(input.show_price),
    is_featured: toBoolean(input.is_featured),
    is_new: toBoolean(input.is_new),
    is_active: toBoolean(input.is_active, true),
    sort_order: boundedInteger(input.sort_order, -10_000, 10_000, 0),
    primary_image_url: media.find((item) => item.media_type === "image").url,
    media,
  };
};

const validateVideo = (input) => ({
  product_id: sanitizeText(input.product_id, 64) || null,
  title: sanitizeText(input.title, 120, { required: true, minimum: 2 }),
  caption: sanitizeText(input.caption, 600),
  video_url: validateCloudinaryUrl(input.video_url, "video", true),
  cloudinary_public_id: sanitizeText(input.cloudinary_public_id, 250),
  poster_url: input.poster_url ? validateCloudinaryUrl(input.poster_url, "image") : "",
  poster_alt: sanitizeText(input.poster_alt || input.title, 180),
  is_featured: toBoolean(input.is_featured),
  is_active: toBoolean(input.is_active, true),
  sort_order: boundedInteger(input.sort_order, -10_000, 10_000, 0),
});

const validateReview = (input) => ({
  customer_name: sanitizeText(input.customer_name, 100, { required: true, minimum: 2 }),
  location: sanitizeText(input.location, 100),
  quote: sanitizeText(input.quote, 700, { required: true, minimum: 4 }),
  rating: boundedInteger(input.rating, 1, 5, 5),
  is_active: toBoolean(input.is_active, true),
  sort_order: boundedInteger(input.sort_order, -10_000, 10_000, 0),
});

const ensureCategory = async (db, id) => {
  const category = await db.prepare("SELECT id FROM categories WHERE id = ? LIMIT 1").bind(id).first();
  if (!category) throw new HttpError(400, "Please select an existing category.");
};

const saveProduct = async (env, input, id = null) => {
  const db = requireDatabase(env);
  const product = validateProduct(input);
  await ensureCategory(db, product.category_id);
  const productId = id || crypto.randomUUID();
  if (id) {
    const existing = await db.prepare("SELECT id FROM products WHERE id = ? LIMIT 1").bind(id).first();
    if (!existing) throw new HttpError(404, "Product not found.");
  }
  const statement = id
    ? db.prepare("UPDATE products SET category_id=?, name=?, slug=?, product_code=?, description=?, materials=?, colors=?, sizes=?, status=?, price_minor=?, price_label=?, currency=?, show_price=?, is_featured=?, is_new=?, is_active=?, sort_order=?, primary_image_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(product.category_id, product.name, product.slug, product.product_code, product.description, product.materials, product.colors, product.sizes, product.status, product.price_minor, product.price_label, product.currency, Number(product.show_price), Number(product.is_featured), Number(product.is_new), Number(product.is_active), product.sort_order, product.primary_image_url, productId)
    : db.prepare("INSERT INTO products (id, category_id, name, slug, product_code, description, materials, colors, sizes, status, price_minor, price_label, currency, show_price, is_featured, is_new, is_active, sort_order, primary_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(productId, product.category_id, product.name, product.slug, product.product_code, product.description, product.materials, product.colors, product.sizes, product.status, product.price_minor, product.price_label, product.currency, Number(product.show_price), Number(product.is_featured), Number(product.is_new), Number(product.is_active), product.sort_order, product.primary_image_url);
  const statements = [statement];
  if (id) statements.push(db.prepare("DELETE FROM product_media WHERE product_id = ?").bind(productId));
  product.media.forEach((media) => statements.push(
    db.prepare("INSERT INTO product_media (id, product_id, media_type, url, cloudinary_public_id, poster_url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), productId, media.media_type, media.url, media.cloudinary_public_id, media.poster_url, media.alt_text, media.sort_order),
  ));
  try {
    await db.batch(statements);
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "That product URL slug is already in use.");
    throw error;
  }
  const row = await db.prepare("SELECT slug FROM products WHERE id = ?").bind(productId).first();
  return getProductBySlug(env, row.slug, true);
};

const listEnquiries = async (env, url) => {
  const clauses = [];
  const bindings = [];
  const status = url.searchParams.get("status");
  const search = sanitizeText(url.searchParams.get("search"), 80);
  if (status && ENQUIRY_STATUSES.has(status)) {
    clauses.push("e.status = ?");
    bindings.push(status);
  }
  if (search) {
    const query = `%${search}%`;
    clauses.push("(e.name LIKE ? OR e.phone LIKE ? OR e.reference LIKE ? OR e.product_name LIKE ?)");
    bindings.push(query, query, query, query);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await requireDatabase(env)
    .prepare(`SELECT e.* FROM enquiries e ${where} ORDER BY e.created_at DESC LIMIT 500`)
    .bind(...bindings)
    .all();
  return result.results || [];
};

const adminDashboard = async (env) => {
  const db = requireDatabase(env);
  const results = await db.batch([
    db.prepare("SELECT COUNT(*) AS count FROM products WHERE is_active = 1"),
    db.prepare("SELECT COUNT(*) AS count FROM enquiries WHERE status = 'new'"),
    db.prepare("SELECT COUNT(*) AS count FROM product_videos WHERE is_active = 1"),
    db.prepare("SELECT COUNT(*) AS count FROM categories WHERE is_active = 1"),
    db.prepare("SELECT id, reference, name, phone, product_name, enquiry_type, status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 6"),
  ]);
  return {
    counts: {
      products: Number(results[0].results?.[0]?.count || 0),
      new_enquiries: Number(results[1].results?.[0]?.count || 0),
      videos: Number(results[2].results?.[0]?.count || 0),
      categories: Number(results[3].results?.[0]?.count || 0),
    },
    recent_enquiries: results[4].results || [],
  };
};

const handleAdmin = async (request, env, url, parts, identity) => {
  const db = requireDatabase(env);
  const resource = parts[0] || "session";
  const id = parts[1] || "";
  const method = request.method;

  if (resource === "session" && method === "GET") {
    const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    const token = await signSession(identity.email || "admin", expiresAt, env);
    return json(
      { authenticated: true, email: identity.email || "admin", token, expires_at: expiresAt },
      200,
      { "Cache-Control": "private, no-store", "Set-Cookie": adminSessionCookie(token) },
    );
  }
  if (resource === "dashboard" && method === "GET") return json({ dashboard: await adminDashboard(env) });

  if (resource === "account" && method === "PUT") {
    const input = await readJson(request, 16_000);
    const currentPassword = String(input.current_password || "");
    const newPassword = String(input.new_password || "");
    const newEmail = sanitizeText(input.new_email, 160, { required: true }).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) throw new HttpError(400, "Please enter a valid login email address.");
    if (newPassword.length < 12) throw new HttpError(400, "The new password must contain at least 12 characters.");
    const credential = await currentAdminCredential(env);
    if (!(await credentialMatches(credential, currentPassword))) throw new HttpError(401, "The current password is incorrect.");
    const saltBytes = crypto.getRandomValues(new Uint8Array(18));
    const salt = base64UrlEncode(saltBytes);
    const hash = await passwordHash(newPassword, salt);
    await ensureAdminCredentials(db);
    await db.prepare(`INSERT INTO admin_credentials(id, email, password_hash, password_salt, updated_at)
      VALUES(1, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET email=excluded.email, password_hash=excluded.password_hash,
      password_salt=excluded.password_salt, updated_at=CURRENT_TIMESTAMP`)
      .bind(newEmail, hash, salt).run();
    const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    const token = await signSession(newEmail, expiresAt, env);
    return json({ success: true, email: newEmail, token, expires_at: expiresAt }, 200, {
      "Set-Cookie": adminSessionCookie(token),
    });
  }

  if (resource === "settings") {
    if (method === "GET") return json({ settings: await getSettings(env) });
    if (method === "PUT") {
      const input = await readJson(request);
      const statements = [];
      for (const key of SETTING_KEYS) {
        if (!(key in input)) continue;
        const longCopy = key.endsWith("_copy") || key === "footer_description" || key === "seo_description" || key.startsWith("announcement_") || key === "category_images";
        const mediaSetting = key === "hero_image_url" || key === "hero_video_url" || key === "hero_video_poster_url" || key === "logo_url" || key === "seo_image_url" || key.startsWith("banner_image_");
        const maxLength = key === "category_images" ? 5000 : longCopy ? 600 : key.endsWith("_title") ? 160 : mediaSetting ? 500 : 180;
        let value = sanitizeText(input[key], maxLength);
        if (key === "category_images" && value) {
          try {
            const parsed = JSON.parse(value);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
            for (const imageUrl of Object.values(parsed)) {
              if (imageUrl) validateCloudinaryUrl(imageUrl, "image");
            }
          } catch {
            throw new HttpError(400, "Category image data is not valid.");
          }
        }
        if (key === "hero_media_type" && value && !new Set(["banner", "video"]).has(value)) throw new HttpError(400, "Hero media must be Banner or Video.");
        if (key === "instagram_url" && value) value = validateHttpsUrl(value);
        if (key === "hero_image_url" && value) value = validateCloudinaryUrl(value, "image");
        if (key === "hero_video_url" && value) value = validateCloudinaryUrl(value, "video");
        if (key === "hero_video_poster_url" && value) value = validateCloudinaryUrl(value, "image");
        if ((key === "logo_url" || key === "seo_image_url" || key.startsWith("banner_image_")) && value) value = validateCloudinaryUrl(value, "image");
        if (key === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new HttpError(400, "Please enter a valid email address.");
        if (key === "whatsapp_number") value = value.replace(/[^\d+]/g, "").slice(0, 16);
        statements.push(
          db.prepare("INSERT INTO site_settings(key, value, updated_at) VALUES(?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP")
            .bind(key, value),
        );
      }
      if (statements.length) await db.batch(statements);
      return json({ settings: await getSettings(env) });
    }
  }

  if (resource === "products") {
    if (method === "GET") return json(await listProducts(env, { includeInactive: url.searchParams.get("include_inactive") === "1", limit: 100 }));
    if (method === "POST") return json({ product: await saveProduct(env, await readJson(request)) }, 201);
    if (method === "PUT" && id) return json({ product: await saveProduct(env, await readJson(request), id) });
    if (method === "DELETE" && id) {
      const result = await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
      if (!result.meta?.changes) throw new HttpError(404, "Product not found.");
      return json({ success: true });
    }
  }

  if (resource === "categories") {
    if (method === "GET") return json({ categories: await getCategories(env, url.searchParams.get("include_inactive") === "1") });
    if (method === "POST" || (method === "PUT" && id)) {
      const category = validateCategory(await readJson(request));
      const categoryId = id || crypto.randomUUID();
      try {
        if (id) {
          const result = await db.prepare("UPDATE categories SET name=?, slug=?, description=?, sort_order=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
            .bind(category.name, category.slug, category.description, category.sort_order, Number(category.is_active), id)
            .run();
          if (!result.meta?.changes) throw new HttpError(404, "Category not found.");
        } else {
          await db.prepare("INSERT INTO categories(id, name, slug, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(categoryId, category.name, category.slug, category.description, category.sort_order, Number(category.is_active))
            .run();
        }
      } catch (error) {
        if (error instanceof HttpError) throw error;
        if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "That category URL is already in use.");
        throw error;
      }
      return json({ category: (await getCategories(env, true)).find((item) => item.id === categoryId) }, id ? 200 : 201);
    }
    if (method === "DELETE" && id) {
      const usage = await db.prepare("SELECT COUNT(*) AS count FROM products WHERE category_id = ?").bind(id).first();
      if (Number(usage?.count || 0) > 0) throw new HttpError(409, "Move or remove products from this category first.");
      const result = await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
      if (!result.meta?.changes) throw new HttpError(404, "Category not found.");
      return json({ success: true });
    }
  }

  if (resource === "videos") {
    if (method === "GET") return json({ videos: await listVideos(env, url.searchParams.get("include_inactive") === "1") });
    if (method === "POST" || (method === "PUT" && id)) {
      const video = validateVideo(await readJson(request));
      if (video.product_id) {
        const product = await db.prepare("SELECT id FROM products WHERE id = ? LIMIT 1").bind(video.product_id).first();
        if (!product) throw new HttpError(400, "Please select an existing product.");
      }
      const videoId = id || crypto.randomUUID();
      if (id) {
        const result = await db.prepare("UPDATE product_videos SET product_id=?, title=?, caption=?, video_url=?, cloudinary_public_id=?, poster_url=?, poster_alt=?, is_featured=?, is_active=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
          .bind(video.product_id, video.title, video.caption, video.video_url, video.cloudinary_public_id, video.poster_url, video.poster_alt, Number(video.is_featured), Number(video.is_active), video.sort_order, id)
          .run();
        if (!result.meta?.changes) throw new HttpError(404, "Product video not found.");
      } else {
        await db.prepare("INSERT INTO product_videos(id, product_id, title, caption, video_url, cloudinary_public_id, poster_url, poster_alt, is_featured, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(videoId, video.product_id, video.title, video.caption, video.video_url, video.cloudinary_public_id, video.poster_url, video.poster_alt, Number(video.is_featured), Number(video.is_active), video.sort_order)
          .run();
      }
      return json({ video: (await listVideos(env, true)).find((item) => item.id === videoId) }, id ? 200 : 201);
    }
    if (method === "DELETE" && id) {
      const result = await db.prepare("DELETE FROM product_videos WHERE id = ?").bind(id).run();
      if (!result.meta?.changes) throw new HttpError(404, "Product video not found.");
      return json({ success: true });
    }
  }

  if (resource === "reviews") {
    if (method === "GET") return json({ reviews: await listReviews(env, url.searchParams.get("include_inactive") === "1") });
    if (method === "POST" || (method === "PUT" && id)) {
      const review = validateReview(await readJson(request));
      const reviewId = id || crypto.randomUUID();
      if (id) {
        const result = await db.prepare("UPDATE reviews SET customer_name=?, location=?, quote=?, rating=?, is_active=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
          .bind(review.customer_name, review.location, review.quote, review.rating, Number(review.is_active), review.sort_order, id)
          .run();
        if (!result.meta?.changes) throw new HttpError(404, "Review not found.");
      } else {
        await db.prepare("INSERT INTO reviews(id, customer_name, location, quote, rating, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(reviewId, review.customer_name, review.location, review.quote, review.rating, Number(review.is_active), review.sort_order)
          .run();
      }
      return json({ review: (await listReviews(env, true)).find((item) => item.id === reviewId) }, id ? 200 : 201);
    }
    if (method === "DELETE" && id) {
      const result = await db.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
      if (!result.meta?.changes) throw new HttpError(404, "Review not found.");
      return json({ success: true });
    }
  }

  if (resource === "enquiries") {
    if (method === "GET") return json({ enquiries: await listEnquiries(env, url) });
    if (method === "PUT" && id) {
      const input = await readJson(request);
      const status = sanitizeText(input.status, 20);
      if (!ENQUIRY_STATUSES.has(status)) throw new HttpError(400, "Please select a valid enquiry status.");
      const notes = sanitizeText(input.admin_notes, 1200);
      const result = await db.prepare("UPDATE enquiries SET status=?, admin_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(status, notes, id)
        .run();
      if (!result.meta?.changes) throw new HttpError(404, "Enquiry not found.");
      return json({ enquiry: await db.prepare("SELECT * FROM enquiries WHERE id = ?").bind(id).first() });
    }
    if (method === "DELETE" && id) {
      const result = await db.prepare("DELETE FROM enquiries WHERE id = ?").bind(id).run();
      if (!result.meta?.changes) throw new HttpError(404, "Enquiry not found.");
      return json({ success: true });
    }
  }

  throw new HttpError(404, "Admin endpoint not found.");
};

const handlePublic = async (request, env, url, parts) => {
  const resource = parts[0] || "";
  if (resource === "health" && request.method === "GET") {
    await requireDatabase(env).prepare("SELECT 1 AS ok").first();
    return json({ ok: true, service: "husba-beads-api" });
  }
  if (resource === "bootstrap" && request.method === "GET") {
    const [settings, categories, productData, videos] = await Promise.all([
      getSettings(env),
      getCategories(env),
      listProducts(env, { featured: true, limit: 6 }),
      listVideos(env),
    ]);
    return json({
      settings,
      categories,
      products: productData.products,
      videos: videos.slice(0, 6),
    });
  }
  if (resource === "products" && request.method === "GET") {
    if (parts[1]) {
      const product = await getProductBySlug(env, sanitizeText(decodeURIComponent(parts[1]), 140));
      const relatedData = product.category_id
        ? await listProducts(env, { category: product.category_slug, limit: 4 })
        : { products: [] };
      return json({ product, related: relatedData.products.filter((item) => item.id !== product.id).slice(0, 3) });
    }
    const productData = await listProducts(env, {
      category: url.searchParams.get("category"),
      search: url.searchParams.get("search"),
      featured: url.searchParams.get("featured") === "1",
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
    });
    return json({ ...productData, categories: await getCategories(env) });
  }
  if (resource === "videos" && request.method === "GET") return json({ videos: await listVideos(env) });
  if (resource === "enquiries" && request.method === "POST") return json(await submitEnquiry(request, env), 201);
  throw new HttpError(404, "API endpoint not found.");
};

const errorResponse = (error) => {
  if (error instanceof HttpError) return json({ error: { message: error.message, details: error.details } }, error.status);
  console.error("Unhandled API error", error);
  return json({ error: { message: "The service could not complete this request." } }, 500);
};

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      try {
        assertOrigin(request, env);
        return new Response(null, { status: 204, headers });
      } catch (error) {
        const response = errorResponse(error);
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        return response;
      }
    }
    try {
      if (!["GET", "HEAD"].includes(request.method)) assertOrigin(request, env);
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/api\/?/, "");
      const parts = path.split("/").filter(Boolean);
      let response;
      if (parts[0] === "admin" && parts[1] === "login") {
        assertOrigin(request, env);
        response = await handleAdminLogin(request, env);
      } else if (parts[0] === "admin") {
        assertOrigin(request, env);
        const identity = await requireAdmin(request, env);
        if (parts[1] === "logout" && request.method === "POST") {
          response = json({ authenticated: false }, 200, { "Set-Cookie": clearAdminSessionCookie() });
        } else {
          response = await handleAdmin(request, env, url, parts.slice(1), identity);
        }
        response.headers.set("Cache-Control", "private, no-store");
      } else {
        response = await handlePublic(request, env, url, parts);
      }
      Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const response = errorResponse(error);
      Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      return response;
    }
  },
};
