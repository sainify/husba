-- Optional preview content. Apply only when you want the three replaceable sample products.
-- No fabricated customer testimonials, contact details, passwords or credentials are inserted.

INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order, is_active) VALUES
  ('cat_bracelets', 'Bracelets', 'bracelets', 'Delicate wrist details', 1, 1),
  ('cat_earrings', 'Earrings', 'earrings', 'Light-catching handmade pairs', 2, 1),
  ('cat_necklaces', 'Necklaces', 'necklaces', 'Layerable beaded accents', 3, 1),
  ('cat_custom', 'Custom pieces', 'custom', 'Made around your idea', 4, 1);

INSERT OR IGNORE INTO products (
  id, category_id, name, slug, product_code, description, materials, colors, sizes,
  status, price_minor, price_label, currency, show_price, is_featured, is_new,
  is_active, sort_order, primary_image_url
) VALUES
  (
    'sample_pearl_glow', 'cat_necklaces', 'Pearl Glow Set', 'pearl-glow-set', 'HB-SAMPLE-01',
    'A delicate pearl, crystal and champagne-gold edit designed to bring a quiet glow to everyday and occasion looks.',
    'Glass pearls, crystal beads and gold-toned findings', 'Pearl ivory and champagne gold',
    'Confirmed personally with your enquiry', 'made_to_order', NULL, '', 'INR', 0, 1, 1, 1, 1,
    '/assets/media/products/pearl-glow-hero.webp'
  ),
  (
    'sample_meadow', 'cat_bracelets', 'Meadow Bracelet', 'meadow-bracelet', 'HB-SAMPLE-02',
    'A soft mix of turquoise, coral, pearl and amber glass beads finished with restrained gold-toned accents.',
    'Glass beads, pearl accents and gold-toned clasp', 'Turquoise, coral, pearl and amber',
    'Custom sizing available', 'available', NULL, '', 'INR', 0, 1, 0, 1, 2,
    '/assets/media/products/meadow-bracelet.webp'
  ),
  (
    'sample_blush_bloom', 'cat_earrings', 'Blush Bloom', 'blush-bloom', 'HB-SAMPLE-03',
    'Translucent flower-bead earrings paired with delicate blush details for a feminine, quietly playful finish.',
    'Translucent glass beads and gold-toned findings', 'Blush, pearl and muted berry',
    'One size; matching custom pieces available', 'made_to_order', NULL, '', 'INR', 0, 1, 1, 1, 3,
    '/assets/media/products/blush-bloom.webp'
  );

INSERT OR IGNORE INTO product_media (id, product_id, media_type, url, alt_text, sort_order) VALUES
  ('sample_media_1', 'sample_pearl_glow', 'image', '/assets/media/products/pearl-glow-hero.webp', 'Pearl and champagne-gold handmade jewellery on ivory silk', 1),
  ('sample_media_2', 'sample_pearl_glow', 'image', '/assets/media/products/blush-bloom.webp', 'Blush flower earrings and a slim beaded anklet', 2),
  ('sample_media_3', 'sample_meadow', 'image', '/assets/media/products/meadow-bracelet.webp', 'Multicolour handmade glass-bead bracelet', 1),
  ('sample_media_4', 'sample_blush_bloom', 'image', '/assets/media/products/blush-bloom.webp', 'Blush flower-bead earrings and matching anklet', 1);
