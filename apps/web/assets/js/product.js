import { api } from "./api.js";
import { cloudinaryImageUrl, cloudinarySrcset, escapeHtml, formatPrice, openEnquiry, productWhatsAppUrl, refreshAnimations, renderProductCard, safeMediaUrl, setSiteSettings } from "./shared.js";

const shell = document.querySelector("[data-product-shell]");
const relatedGrid = document.querySelector("[data-related-products]");
const pathParts = location.pathname.split("/").filter(Boolean);
const pathSlug = ["product", "products"].includes(pathParts[0]) ? pathParts[1] || "" : "";
const slug = new URLSearchParams(location.search).get("slug") || pathSlug;

const renderMedia = (item, product, active = false) => {
  const url = safeMediaUrl(item.url || product.primary_image_url);
  if (item.media_type === "video") {
    return `<video src="${escapeHtml(url)}" poster="${escapeHtml(safeMediaUrl(item.poster_url, product.primary_image_url))}" playsinline muted loop controls preload="metadata" aria-label="${escapeHtml(item.alt_text || `${product.name} video`)}"></video>`;
  }
  const srcset = cloudinarySrcset(url, [480, 800, 1200, 1600]);
  return `<img src="${escapeHtml(cloudinaryImageUrl(url, 1200))}"${srcset ? ` srcset="${escapeHtml(srcset)}" sizes="(max-width: 52rem) 100vw, 58vw"` : ""} alt="${escapeHtml(item.alt_text || product.name)}" width="960" height="1200" decoding="async" itemprop="image"${active ? " fetchpriority=\"high\"" : " loading=\"lazy\""}>`;
};

const updateMetadata = (product) => {
  const description = product.description || `Enquire about ${product.name}, handmade by HUSBA Beads.`;
  const setMeta = (attribute, key, content) => {
    let meta = document.querySelector(`meta[${attribute}="${key}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(attribute, key);
      document.head.append(meta);
    }
    meta.content = content;
  };
  document.title = `${product.name} · HUSBA Beads`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  const canonical = document.querySelector('link[rel="canonical"]') || document.head.appendChild(document.createElement("link"));
  canonical.rel = "canonical";
  canonical.href = `${location.origin}/product/?slug=${encodeURIComponent(product.slug)}`;
  setMeta("property", "og:type", "product");
  setMeta("property", "og:title", `${product.name} · HUSBA Beads`);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", canonical.href);
  setMeta("property", "og:image", new URL(safeMediaUrl(product.primary_image_url), location.origin).href);
};

const initGallery = (product) => {
  const main = document.querySelector("[data-main-media]");
  document.querySelector("[data-thumbs]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-media-index]");
    if (!button) return;
    const index = Number(button.dataset.mediaIndex);
    const item = product.media[index];
    main.innerHTML = renderMedia(item, product, true);
    document.querySelectorAll("[data-media-index]").forEach((thumb) => thumb.classList.toggle("is-active", thumb === button));
  });
};

const renderProduct = (product) => {
  const media = product.media?.length ? product.media : [{ media_type: "image", url: product.primary_image_url, alt_text: product.name }];
  media.sort((a, b) => (a.media_type === "video" ? -1 : b.media_type === "video" ? 1 : Number(a.sort_order || 0) - Number(b.sort_order || 0)));
  const statusLabel = { available: "Available", made_to_order: "Made to order", sold_out: "Currently unavailable" }[product.status] || "Enquire for availability";
  shell.setAttribute("itemscope", "");
  shell.setAttribute("itemtype", "https://schema.org/Product");
  shell.innerHTML = `
    <div class="product-gallery">
      <div class="product-thumbs" data-thumbs>${media.map((item, index) => `<button class="product-thumb${index === 0 ? " is-active" : ""}" type="button" data-media-index="${index}" aria-label="Show media ${index + 1}">${item.media_type === "video" ? `<img src="${escapeHtml(safeMediaUrl(item.poster_url, product.primary_image_url))}" alt="">` : `<img src="${escapeHtml(safeMediaUrl(item.url))}" alt="">`}</button>`).join("")}</div>
      <div class="product-main-media" data-main-media>${renderMedia(media[0], product, true)}</div>
      <div class="product-mobile-gallery">${media.map((item, index) => `<div class="product-mobile-media">${renderMedia(item, product, index === 0)}</div>`).join("")}</div>
    </div>
    <div class="product-info">
      <meta itemprop="brand" content="HUSBA Beads">
      <span class="eyebrow">${escapeHtml(product.category_name || "Handmade collection")}</span>
      <h1 itemprop="name">${escapeHtml(product.name)}</h1>
      ${product.product_code ? `<div class="product-code">Product code · <span itemprop="sku">${escapeHtml(product.product_code)}</span></div>` : ""}
      <div class="product-status">${escapeHtml(statusLabel)}</div>
      <p class="product-description" itemprop="description">${escapeHtml(product.description || "A thoughtfully handcrafted piece made with care.")}</p>
      ${product.show_price && product.price_minor !== null ? `<div class="product-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer"><small>Price</small><meta itemprop="priceCurrency" content="${escapeHtml(product.currency || "INR")}"><meta itemprop="availability" content="${product.status === "sold_out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"}"><span itemprop="price" content="${(Number(product.price_minor) / 100).toFixed(2)}">${escapeHtml(formatPrice(product))}</span><em>Inclusive of all taxes</em></div>` : `<div class="product-price"><small>Price</small><span>${escapeHtml(formatPrice(product))}</span></div>`}
      <div class="product-highlights" aria-label="Product highlights"><span>Handmade</span><span>Customisable</span><span>Made in Mumbai</span></div>
      <p class="product-delivery">Delivery timeline and final availability are confirmed personally on WhatsApp.</p>
      <div class="product-actions">
        <a class="button" href="${escapeHtml(productWhatsAppUrl(product))}" target="_blank" rel="noopener">Enquire on WhatsApp <span aria-hidden="true">↗</span></a>
        <button class="button button--ghost" type="button" data-product-enquiry>Website enquiry</button>
        <button class="button button--ghost" type="button" data-share-product aria-label="Share product">Share</button>
      </div>
      <dl class="product-specs">
        ${product.materials ? `<div class="product-spec"><dt>Materials</dt><dd>${escapeHtml(product.materials)}</dd></div>` : ""}
        ${product.colors ? `<div class="product-spec"><dt>Colours</dt><dd>${escapeHtml(product.colors)}</dd></div>` : ""}
        ${product.sizes ? `<div class="product-spec"><dt>Size</dt><dd>${escapeHtml(product.sizes)}</dd></div>` : ""}
        <div class="product-spec"><dt>Craft</dt><dd>Handmade in India</dd></div>
        <div class="product-spec"><dt>Ordering</dt><dd>Submit an enquiry and we will confirm details with you personally.</dd></div>
      </dl>
    </div>`;
  document.querySelector("[data-product-enquiry]").addEventListener("click", () => openEnquiry({ product }));
  document.querySelector("[data-share-product]").addEventListener("click", async () => {
    if (navigator.share) await navigator.share({ title: `${product.name} · HUSBA Beads`, text: product.description, url: location.href });
    else {
      await navigator.clipboard.writeText(location.href);
      document.querySelector("[data-share-product]").textContent = "Link copied";
    }
  });
  initGallery({ ...product, media });
};

const init = async () => {
  if (!slug) {
    shell.innerHTML = '<div class="error-state"><div class="error-state__inner"><h2>Select a piece to view.</h2><a class="button" href="/collections/">Browse collections</a></div></div>';
    return;
  }
  try {
    const [data, bootstrap] = await Promise.all([api.getProduct(slug), api.getBootstrap().catch(() => null)]);
    if (bootstrap) setSiteSettings(bootstrap.settings);
    const { product, related = [] } = data;
    updateMetadata(product);
    renderProduct(product);
    if (related.length) {
      relatedGrid.innerHTML = related.map(renderProductCard).join("");
      document.querySelector("[data-related-section]").hidden = false;
    }
    refreshAnimations();
  } catch (error) {
    shell.innerHTML = `<div class="error-state"><div class="error-state__inner"><h2>This piece could not be found.</h2><p>${escapeHtml(error.message)}</p><a class="button" href="/collections/">Browse collections</a></div></div>`;
  }
};

init();
