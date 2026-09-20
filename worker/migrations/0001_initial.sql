PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  product_code TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  materials TEXT NOT NULL DEFAULT '',
  colors TEXT NOT NULL DEFAULT '',
  sizes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'made_to_order', 'sold_out')),
  price_minor INTEGER CHECK (price_minor IS NULL OR price_minor >= 0),
  price_label TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'INR',
  show_price INTEGER NOT NULL DEFAULT 0 CHECK (show_price IN (0, 1)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_new INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  primary_image_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_media (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL DEFAULT '',
  poster_url TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_videos (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL DEFAULT '',
  poster_url TEXT NOT NULL DEFAULT '',
  poster_alt TEXT NOT NULL DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  enquiry_type TEXT NOT NULL CHECK (enquiry_type IN ('product', 'custom', 'bulk')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 10000),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  quote TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_active_order ON products(is_active, is_featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_media_product_order ON product_media(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_videos_active_order ON product_videos(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_enquiries_status_created ON enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_phone_created ON enquiries(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_active_order ON reviews(is_active, sort_order);

INSERT OR IGNORE INTO site_settings(key, value) VALUES
  ('brand_name', 'HUSBA Beads'),
  ('announcement', 'Handmade in India · Custom and bulk enquiries welcome'),
  ('hero_title', 'Small details. Made personal.'),
  ('hero_copy', 'Delicate beaded pieces thoughtfully made for everyday moments, meaningful gifts and designs that feel entirely your own.'),
  ('whatsapp_number', ''),
  ('whatsapp_display', ''),
  ('email', ''),
  ('location', 'India'),
  ('instagram_url', 'https://www.instagram.com/husba.beads/');
