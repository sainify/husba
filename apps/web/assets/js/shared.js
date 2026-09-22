import { api } from "./api.js";

const config = window.HUSBA_CONFIG || {};
const state = {
  settings: {
    brand_name: "HUSBA Beads",
    instagram_url: "",
    whatsapp_number: "919004931823",
  announcement_1: "",
  announcement_2: "",
  announcement_3: "",
    whatsapp_social_url: "",
    instagram_url: "",
    facebook_url: "",
    youtube_url: "",
    pinterest_url: "",
    tiktok_url: "",
  },
};

export const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export const safeMediaUrl = (value = "", fallback = "/assets/media/products/pearl-glow-hero.webp") => {
  const url = String(value || "").trim();
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && (parsed.hostname === "res.cloudinary.com" || parsed.hostname.endsWith(".cloudinary.com"))) return parsed.href;
  } catch {
    // The fallback is intentionally used for invalid media URLs.
  }
  return fallback;
};

export const cloudinaryImageUrl = (value, width = 960) => {
  const url = safeMediaUrl(value);
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    const boundedWidth = Math.min(2400, Math.max(160, Math.round(Number(width) || 960)));
    parsed.pathname = parsed.pathname.replace("/upload/", `/upload/f_auto,q_auto:good,c_limit,w_${boundedWidth}/`);
    return parsed.href;
  } catch {
    return url;
  }
};

export const cloudinarySrcset = (value, widths = [360, 640, 960]) => {
  const url = safeMediaUrl(value);
  if (url.startsWith("/")) return "";
  return widths.map((width) => `${cloudinaryImageUrl(url, width)} ${width}w`).join(", ");
};

export const formatPrice = (product) => {
  if (!product?.show_price) return "Enquire for details";
  if (product.price_label) {
    const label = String(product.price_label).trim();
    if (/^[\d,.]+$/.test(label)) {
      const amount = Number(label.replaceAll(",", ""));
      if (Number.isFinite(amount)) return `Rs. ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return label;
  }
  const amount = Number(product.price_minor || 0) / 100;
  const currency = product.currency || "INR";
  if (currency === "INR") return `Rs. ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
};

export const productWhatsAppUrl = (product) => {
  const number = normalisePhone(state.settings.whatsapp_number) || "919004931823";
  const productUrl = `${location.origin}/product/?slug=${encodeURIComponent(product.slug)}`;
  const message = [
    "Hello HUSBA Beads,",
    "",
    "I am interested in this product:",
    `Product: ${product.name}`,
    product.product_code ? `Product code: ${product.product_code}` : "",
    product.category_name ? `Category: ${product.category_name}` : "",
    `Product link: ${productUrl}`,
    "",
    "Please share the price, availability and ordering details."
  ].filter(Boolean).join("\n");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

const activePath = () => {
  const path = location.pathname;
  if (path.startsWith("/collections") || path.startsWith("/product")) return "/collections/";
  if (path.startsWith("/videos")) return "/videos/";
  if (path.startsWith("/about")) return "/about/";
  if (path.startsWith("/contact")) return "/contact/";
  return "/";
};

const navLink = (href, label) => `<a href="${href}"${activePath() === href ? ' aria-current="page"' : ""}>${label}</a>`;

class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="announcement" data-announcement hidden><button class="announcement__arrow announcement__arrow--prev" type="button" data-announcement-prev aria-label="Previous announcement">‹</button><div class="announcement__track" data-announcement-track></div><button class="announcement__arrow announcement__arrow--next" type="button" data-announcement-next aria-label="Next announcement">›</button></div>
      <header class="site-header" data-header>
        <div class="site-header__inner">
          <a class="wordmark wordmark--image" href="/" aria-label="HUSBA Beads home">
            <img class="site-logo" data-site-logo src="/assets/media/brand/original-logo.webp" alt="HUSBA Beads logo">
            <span class="wordmark__monogram" aria-hidden="true">UB</span>
            <span class="wordmark__text"><span class="wordmark__name">HUSBA</span><span class="wordmark__sub">Beads</span></span>
          </a>
          <a class="header-search" href="/collections/" aria-label="Search collections"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg></a>
          <nav class="desktop-nav" aria-label="Main navigation">
            ${navLink("/", "Home")}
            ${navLink("/collections/", "Collections")}
            ${navLink("/videos/", "The HUSBA Edit")}
            ${navLink("/about/", "Our story")}
            ${navLink("/contact/", "Contact")}
          </nav>
          <div class="header-actions">
            <button class="button button--ghost button--small header-enquire" type="button" data-open-enquiry>Enquire</button>
            <button class="menu-button" type="button" aria-label="Open navigation" aria-expanded="false" data-menu-button><span aria-hidden="true"></span></button>
          </div>
        </div>
      </header>
      <nav class="mobile-nav" aria-label="Mobile navigation" data-mobile-nav inert>
        <div class="mobile-nav__inner">
          <div class="mobile-nav__eyebrow"><span>HUSBA Beads</span><span>Navigation</span></div>
          <div class="mobile-nav__links">
            ${navLink("/", "Home")}
            ${navLink("/collections/", "Collections")}
            ${navLink("/videos/", "The HUSBA Edit")}
            ${navLink("/about/", "Our story")}
            ${navLink("/contact/", "Contact")}
          </div>
          <div class="mobile-nav__footer">
            <div class="mobile-nav__social"><span>Follow us</span><a data-instagram-link hidden href="https://instagram.com/" target="_blank" rel="noopener">Instagram</a><a data-whatsapp-link href="https://wa.me/919326840719" target="_blank" rel="noopener">WhatsApp</a></div>
            <button class="mobile-nav__cta" type="button" data-open-enquiry>Start an enquiry <span aria-hidden="true">↗</span></button>
          </div>
        </div>
      </nav>`;
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="site-footer" itemscope itemtype="https://schema.org/Organization">
        <meta itemprop="name" content="HUSBA Beads">
        <div class="container">
          <div class="footer-brand">
            <a class="wordmark wordmark--image" href="/" aria-label="HUSBA Beads home" itemprop="url">
              <img class="site-logo" data-site-logo src="/assets/media/brand/original-logo.webp" alt="HUSBA Beads logo">
              <span class="wordmark__monogram" aria-hidden="true">UB</span>
              <span class="wordmark__text"><span class="wordmark__name">HUSBA</span><span class="wordmark__sub">Beads</span></span>
            </a>
            <p itemprop="description" data-footer-description>Thoughtfully handcrafted beaded pieces made in India, created for everyday stories, gifting and custom moments.</p>
          </div>
          <div class="footer-grid">
            <div class="footer-column"><h3>Explore</h3><a href="/collections/">Collections</a><a href="/videos/">The HUSBA Edit</a><a href="/about/">Our story</a></div>
            <div class="footer-column"><h3>Enquiries</h3><button type="button" data-open-enquiry>Product enquiry</button><button type="button" data-open-enquiry data-enquiry-type="custom">Custom design</button><button type="button" data-open-enquiry data-enquiry-type="bulk">Bulk order</button></div>
            <div class="footer-column"><h3>Information</h3><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></div>
          </div>
          <div class="footer-social" data-footer-social aria-label="Social media"></div>
          <div class="footer-bottom"><span>© <span data-year></span> HUSBA Beads</span><a href="https://wa.me/919326840719" target="_blank" rel="noopener" aria-label="WhatsApp Mohd Husain">All rights reserved by Mohd Husain</a></div>
        </div>
      </footer>`;
  }
}

customElements.define("site-header", SiteHeader);
customElements.define("site-footer", SiteFooter);

const enquiryDialogMarkup = `
  <dialog class="enquiry-dialog" id="enquiryDialog" aria-labelledby="enquiryTitle">
    <div class="dialog-head">
      <h2 id="enquiryTitle">Product enquiry</h2>
      <button class="dialog-close" type="button" data-close-dialog aria-label="Close enquiry form">×</button>
    </div>
    <div class="dialog-body">
      <form class="enquiry-form" data-enquiry-form novalidate>
        <input type="hidden" name="product_id">
        <input type="hidden" name="product_name">
        <div class="honeypot" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="form-grid">
          <div class="field field--full" data-product-field hidden><label>Selected piece</label><input name="product_display" readonly></div>
          <div class="field"><label for="dialog-name">Your name *</label><input id="dialog-name" name="name" maxlength="80" autocomplete="name" required></div>
          <div class="field"><label for="dialog-phone">WhatsApp number *</label><input id="dialog-phone" name="phone" inputmode="tel" maxlength="20" autocomplete="tel" required></div>
          <div class="field"><label for="dialog-city">City</label><input id="dialog-city" name="city" maxlength="80" autocomplete="address-level2"></div>
          <div class="field"><label for="dialog-type">Enquiry type</label><select id="dialog-type" name="enquiry_type"><option value="product">Product enquiry</option><option value="custom">Custom design</option><option value="bulk">Bulk order</option></select></div>
          <div class="field"><label for="dialog-quantity">Quantity</label><input id="dialog-quantity" name="quantity" type="number" min="1" max="10000" inputmode="numeric" value="1"></div>
          <div class="field field--full"><label for="dialog-message">Tell us what you need <small>(optional)</small></label><textarea id="dialog-message" name="message" maxlength="1200" placeholder="Colour, size, customization or other details"></textarea></div>
          <label class="checkbox-field field--full"><input type="checkbox" name="consent"><span>I agree that HUSBA Beads may contact me about this enquiry. <small>(optional)</small></span></label>
          <div class="field--full" data-turnstile></div>
          <div class="field--full"><button class="button" type="submit" data-submit-enquiry>Send enquiry <span aria-hidden="true">↗</span></button></div>
        </div>
        <p class="form-status" data-form-status role="status" aria-live="polite"></p>
        <a class="button button--ghost" data-whatsapp-after hidden target="_blank" rel="noopener">Continue on WhatsApp</a>
      </form>
    </div>
  </dialog>`;

document.body.insertAdjacentHTML("beforeend", enquiryDialogMarkup);
document.body.insertAdjacentHTML("beforeend", '<div class="toast-region" aria-live="polite" aria-atomic="true"></div>');
document.body.insertAdjacentHTML("beforeend", '<a class="floating-whatsapp" data-floating-whatsapp target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C8.85 3 3 8.8 3 15.94c0 2.53.74 5 2.13 7.1L3.73 29l6.12-1.6a13.1 13.1 0 0 0 6.18 1.56h.01C23.23 28.96 29 23.16 29 16S23.23 3 16.04 3Zm7.64 18.35c-.32.9-1.87 1.72-2.58 1.8-.66.07-1.5.1-2.42-.15-.56-.15-1.28-.41-2.2-.8-3.88-1.67-6.4-5.57-6.6-5.83-.19-.26-1.57-2.08-1.57-3.97 0-1.9.99-2.83 1.34-3.22.35-.39.77-.49 1.03-.49h.74c.24.01.55-.09.86.66.32.77 1.09 2.66 1.18 2.85.1.19.16.42.03.68-.13.26-.19.42-.39.65-.19.23-.41.51-.58.68-.2.19-.4.4-.17.78.23.39 1.02 1.68 2.19 2.72 1.5 1.34 2.77 1.76 3.16 1.95.39.2.61.16.84-.1.23-.26.97-1.14 1.23-1.53.26-.39.52-.32.87-.19.36.13 2.26 1.06 2.65 1.26.39.19.65.29.74.45.1.16.1.94-.22 1.84Z"/></svg></a>');

const dialog = document.querySelector("#enquiryDialog");

const normalisePhone = (value = "") => String(value).replace(/\D/g, "");

let announcementMessages = [];
let announcementIndex = 0;
let announcementTimer = null;

const renderAnnouncement = () => {
  const announcement = document.querySelector("[data-announcement]");
  const track = announcement?.querySelector("[data-announcement-track]");
  if (!announcement || !track) return;
  const mobileAnnouncement = document.querySelector("[data-mobile-announcement]");
  const hasMessages = announcementMessages.length > 0;
  announcement.hidden = !hasMessages;
  announcement.classList.toggle("is-empty", !hasMessages);
  announcement.style.display = hasMessages ? "" : "none";
  if (!hasMessages) {
    if (mobileAnnouncement) { mobileAnnouncement.textContent = ""; mobileAnnouncement.hidden = true; }
    if (announcementTimer) clearInterval(announcementTimer);
    announcementTimer = null;
    return;
  }
  if (mobileAnnouncement) { mobileAnnouncement.hidden = false; mobileAnnouncement.textContent = announcementMessages[announcementIndex] || ""; }
  announcement.hidden = false;
  track.textContent = announcementMessages[announcementIndex] || "";
  const multiple = announcementMessages.length > 1;
  announcement.querySelector("[data-announcement-prev]")?.toggleAttribute("hidden", !multiple);
  announcement.querySelector("[data-announcement-next]")?.toggleAttribute("hidden", !multiple);
  if (announcementTimer) clearInterval(announcementTimer);
  announcementTimer = multiple ? setInterval(() => {
    announcementIndex = (announcementIndex + 1) % announcementMessages.length;
    track.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
    track.textContent = announcementMessages[announcementIndex];
    if (mobileAnnouncement) mobileAnnouncement.textContent = announcementMessages[announcementIndex];
  }, 4200) : null;
};

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-announcement-prev], [data-announcement-next]");
  if (!button || !announcementMessages.length) return;
  announcementIndex = button.matches("[data-announcement-prev]")
    ? (announcementIndex - 1 + announcementMessages.length) % announcementMessages.length
    : (announcementIndex + 1) % announcementMessages.length;
  renderAnnouncement();
});

export const setSiteSettings = (settings = {}) => {
  state.settings = { ...state.settings, ...settings };
  document.querySelectorAll("[data-instagram-link]").forEach((link) => {
    const value = String(state.settings.instagram_url || "");
    link.hidden = !/^https:\/\//i.test(value);
    if (!link.hidden) link.href = value;
  });
  const announcement = document.querySelector("[data-announcement]");
  if (announcement) {
    const messages = [state.settings.announcement_1, state.settings.announcement_2, state.settings.announcement_3]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    announcementMessages = messages;
    announcementIndex = Math.min(announcementIndex, Math.max(0, messages.length - 1));
    renderAnnouncement();
  }
  document.querySelectorAll("[data-footer-description]").forEach((element) => {
    if (state.settings.footer_description) element.textContent = state.settings.footer_description;
  });
  document.querySelectorAll("[data-site-logo]").forEach((logo) => {
    const fallback = "/assets/media/brand/original-logo.webp";
    const url = state.settings.logo_url ? safeMediaUrl(state.settings.logo_url, fallback) : fallback;
    logo.hidden = false;
    logo.src = url;
    logo.onerror = () => {
      if (!logo.src.endsWith(fallback)) {
        logo.src = fallback;
        return;
      }
      logo.onerror = null;
      logo.hidden = true;
      logo.closest(".wordmark")?.classList.remove("wordmark--image");
    };
    logo.closest(".wordmark")?.classList.add("wordmark--image");
  });
  const socialConfig = [
    ["whatsapp_social_url", "WhatsApp", "M16 3a13 13 0 0 0-11.3 19.5L3 29l6.7-1.7A13 13 0 1 0 16 3Zm0 23.5a10.5 10.5 0 0 1-5.3-1.4l-.4-.2-4 .9 1-3.9-.3-.4A10.5 10.5 0 1 1 16 26.5Zm-5.1-7.8c.6 1 2.5 2.8 4.9 3.7.6.2 1.1.3 1.5.1.5-.2.9-.9 1.1-1.2.1-.3.1-.5-.2-.7l-1.4-.7c-.3-.1-.5-.2-.7.2l-.6.8c-.2.2-.4.3-.7.1-.4-.2-1.6-.6-2.9-1.9-1.1-1-1.8-2.2-2-2.6-.2-.3 0-.5.2-.7l.5-.6c.2-.2.2-.4.1-.7l-.6-1.5c-.2-.4-.4-.4-.7-.4h-.6c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.6 1 2.8Z"],
    ["instagram_url", "Instagram", "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5ZM17.5 6a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"],
    ["facebook_url", "Facebook", "M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3l1-4h-4V9a1 1 0 0 1 1-1Z"],
    ["youtube_url", "YouTube", "M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2C2 9 2 12 2 12s0 3 .4 4.8a2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"],
    ["pinterest_url", "Pinterest", "M12 2a10 10 0 0 0-3.6 19.3c-.1-1.6 0-3.4.4-4.9l1-4.1s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-.9 3.9-.3 1.2.7 2.1 1.9 2.1 2.3 0 3.9-2.4 3.9-5.8 0-3-2.1-5.1-5.2-5.1-3.5 0-5.6 2.6-5.6 5.4 0 1.1.4 2.2 1 2.8.1.1.1.2.1.4l-.4 1.5c-.1.5-.5.6-.8.4-1.5-.7-2.4-2.8-2.4-4.5C4.7 7 7.9 4 12.8 4c4.2 0 7.5 3 7.5 7 0 4.2-2.6 7.6-6.2 7.6-1.2 0-2.4-.6-2.8-1.3l-.7 2.7c-.3 1.2-1.1 2.7-1.6 3.6A10 10 0 1 0 12 2Z"],
    ["tiktok_url", "TikTok", "M9 3h4v11.2a3.8 3.8 0 1 1-3.8-3.8c.3 0 .6 0 .8.1V7.1a7.7 7.7 0 0 0-1-.1A7.8 7.8 0 1 0 17 14.8V9.2c1.2 1 2.7 1.6 4 1.6V7.1c-1.9-.1-3.4-1.6-3.5-3.5H13v11.2a3.8 3.8 0 0 1-3.8 3.8 3.8 3.8 0 0 1 0-7.6c.3 0 .6 0 .8.1V3Z"]
  ];
  const socialHost = document.querySelector("[data-footer-social]");
  if (socialHost) {
    socialHost.innerHTML = socialConfig.filter(([key]) => /^https:\/\//i.test(String(state.settings[key] || "").trim())).map(([key, label, path]) => `<a class="footer-social__link" href="${escapeHtml(String(state.settings[key]).trim())}" target="_blank" rel="noopener" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg></a>`).join("");
    socialHost.hidden = !socialHost.children.length;
  }

  const whatsapp = document.querySelector("[data-floating-whatsapp]");
  const number = normalisePhone(state.settings.whatsapp_number) || "919004931823";
  document.querySelectorAll("[data-whatsapp-link]").forEach(link => { link.href = `https://wa.me/${number}`; });
  if (whatsapp) {
    whatsapp.hidden = false;
    whatsapp.href = `https://wa.me/${number}`;
  }
};

export const openEnquiry = ({ product = null, type = "product" } = {}) => {
  const form = dialog.querySelector("form");
  const selectedProduct = product ? {
    id: product.id || product.product_id || "",
    name: product.name || product.product_name || product.title || "Selected product",
    code: product.product_code || "",
  } : null;
  form.reset();
  form.elements.enquiry_type.value = type;
  form.elements.quantity.value = "1";
  form.elements.product_id.value = selectedProduct?.id || "";
  form.elements.product_name.value = selectedProduct?.name || "";
  form.elements.product_display.value = selectedProduct ? `${selectedProduct.name}${selectedProduct.code ? ` · ${selectedProduct.code}` : ""}` : "";
  form.querySelector("[data-product-field]").hidden = !selectedProduct;
  form.querySelector("[data-form-status]").textContent = "";
  form.querySelector("[data-whatsapp-after]").hidden = true;
  document.querySelector("[data-menu-button][aria-expanded=true]")?.click();
  dialog.showModal();
  document.body.classList.add("dialog-open");
  requestAnimationFrame(() => form.elements.name.focus());
};

window.HUSBA = { openEnquiry, setSiteSettings };

const closeDialog = () => {
  dialog.close();
  document.body.classList.remove("dialog-open");
};

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-reload]")) {
    location.reload();
    return;
  }
  const opener = event.target.closest("[data-open-enquiry]");
  if (opener) {
    event.preventDefault();
    openEnquiry({ type: opener.dataset.enquiryType || "product" });
  }
  if (event.target.closest("[data-close-dialog]")) closeDialog();
});

dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});

const loadTurnstile = () => {
  if (!config.TURNSTILE_SITE_KEY || document.querySelector("script[data-turnstile-script]")) return;
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
  script.async = true;
  script.defer = true;
  script.dataset.turnstileScript = "true";
  document.head.append(script);
  document.querySelectorAll("[data-turnstile]").forEach((container) => {
    container.className = "cf-turnstile";
    container.dataset.sitekey = config.TURNSTILE_SITE_KEY;
    container.dataset.theme = "light";
  });
};

const handleEnquirySubmit = async (form) => {
  const status = form.querySelector("[data-form-status]");
  const submit = form.querySelector("[data-submit-enquiry]");
  status.className = "form-status";
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const payload = {
    product_id: data.get("product_id") || null,
    product_name: data.get("product_name") || "",
    name: data.get("name"),
    phone: data.get("phone"),
    city: data.get("city"),
    enquiry_type: data.get("enquiry_type"),
    quantity: Number(data.get("quantity") || 1),
    message: data.get("message"),
    website: data.get("website"),
    turnstile_token: data.get("cf-turnstile-response") || "",
  };

  submit.disabled = true;
  submit.textContent = "Sending…";
  try {
    const result = await api.submitEnquiry(payload);
    status.classList.add("is-success");
    status.textContent = result.message || "Thank you. Your enquiry has been received.";
    const whatsapp = form.querySelector("[data-whatsapp-after]");
    const number = normalisePhone(result.whatsapp_number || state.settings.whatsapp_number);
    if (number) {
      const text = `Hello HUSBA Beads, I submitted an enquiry${payload.product_name ? ` for ${payload.product_name}` : ""}. Reference: ${result.reference || "new enquiry"}.`;
      whatsapp.href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
      whatsapp.hidden = false;
    }
    form.querySelectorAll("input:not([type=hidden]):not([readonly]), textarea").forEach((field) => {
      if (field.type !== "checkbox") field.value = "";
    });
  } catch (error) {
    status.classList.add("is-error");
    status.textContent = error.message || "We could not send your enquiry. Please try again.";
  } finally {
    submit.disabled = false;
    submit.textContent = "Send enquiry ↗";
    if (window.turnstile) window.turnstile.reset();
  }
};

document.addEventListener("submit", (event) => {
  if (!event.target.matches("[data-enquiry-form]")) return;
  event.preventDefault();
  handleEnquirySubmit(event.target);
});

export const toast = (message, type = "success") => {
  const item = document.createElement("div");
  item.className = `toast${type === "error" ? " is-error" : ""}`;
  item.textContent = message;
  document.querySelector(".toast-region").append(item);
  setTimeout(() => item.remove(), 4200);
};

export const renderProductCard = (product) => {
  const media = product.media?.find((item) => item.media_type === "image") || product.media?.[0] || {};
  const image = safeMediaUrl(media.url || product.primary_image_url);
  const srcset = cloudinarySrcset(image, [360, 640, 960]);
  const badge = product.status === "sold_out" ? "Currently unavailable" : product.is_new ? "New piece" : product.status === "made_to_order" ? "Made to order" : product.is_featured ? "Featured" : "";
  return `<article class="product-card">
    <a class="product-card__media" href="/product/?slug=${encodeURIComponent(product.slug)}" aria-label="View ${escapeHtml(product.name)}">
      ${badge ? `<span class="product-card__badge">${escapeHtml(badge)}</span>` : ""}
      <img src="${escapeHtml(cloudinaryImageUrl(image, 720))}"${srcset ? ` srcset="${escapeHtml(srcset)}" sizes="(max-width: 760px) 46vw, 30vw"` : ""} alt="${escapeHtml(media.alt_text || product.name)}" width="800" height="1000" loading="lazy" decoding="async">
      <span class="product-card__quick"><span class="button button--light button--small">View piece <span aria-hidden="true">↗</span></span></span>
    </a>
    <div class="product-card__body">
      <div><a class="product-card__title" href="/product/?slug=${encodeURIComponent(product.slug)}">${escapeHtml(product.name)}</a><div class="product-card__meta">${escapeHtml(product.category_name || "Handmade piece")}</div></div>
      <div class="product-card__price"><strong>${escapeHtml(formatPrice(product))}</strong>${product.show_price ? "<small>INR</small>" : ""}</div>
      <a class="product-card__whatsapp" href="${escapeHtml(productWhatsAppUrl(product))}" target="_blank" rel="noopener">WhatsApp enquiry</a>
    </div>
  </article>`;
};

const observeReveals = () => {
  const items = document.querySelectorAll(".reveal:not(.is-visible), .stagger:not(.is-visible)");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
  items.forEach((item) => observer.observe(item));
};

export const refreshAnimations = () => observeReveals();

const initNavigation = () => {
  const button = document.querySelector("[data-menu-button]");
  const navigation = document.querySelector("[data-mobile-nav]");
  if (button && navigation) {
    const setMenuState = (open) => {
      navigation.classList.toggle("is-open", open);
      navigation.inert = !open;
      navigation.style.top = `${document.querySelector("site-header").getBoundingClientRect().bottom}px`;
      navigation.style.height = `calc(100dvh - ${document.querySelector("site-header").getBoundingClientRect().bottom}px)`;
      document.querySelector("main")?.toggleAttribute("inert", open);
      document.querySelector("site-footer")?.toggleAttribute("inert", open);
      if (!open) button.focus();
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      document.body.classList.toggle("menu-open", open);
    };
    button.addEventListener("click", () => setMenuState(!navigation.classList.contains("is-open")));
    window.addEventListener("resize", () => { if (window.innerWidth > 760 && navigation.classList.contains("is-open")) setMenuState(false); });
    navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenuState(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Tab" && navigation.classList.contains("is-open")) {
        const links = [button, ...navigation.querySelectorAll('a:not([hidden]), button')];
        const first = links[0], last = links.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      if (event.key === "Escape" && navigation.classList.contains("is-open")) setMenuState(false);
    });
  }

  const header = document.querySelector("[data-header]");
  let previous = window.scrollY;
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    header?.classList.toggle("is-compact", current > 24);
    header?.classList.toggle("is-hidden", current > previous && current > 320 && !document.body.classList.contains("menu-open"));
    previous = current;
  }, { passive: true });
};

const initParallax = () => {
  const media = document.querySelector("[data-parallax] .hero__image");
  if (!media || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let scheduled = false;
  const update = () => {
    const bounds = media.parentElement.getBoundingClientRect();
    const progress = Math.min(1, Math.max(-1, -bounds.top / Math.max(1, bounds.height)));
    media.style.setProperty("--parallax-y", `${Math.round(progress * 34)}px`);
    scheduled = false;
  };
  window.addEventListener("scroll", () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
};

const initPageTransitions = () => {
  // Use native navigation. It is instant, works reliably with the browser back
  // button and cannot leave a full-screen transition layer behind on mobile.
};

window.addEventListener("pageshow", () => {
  document.body.classList.remove("is-leaving", "menu-open");
  document.body.classList.add("is-ready");
  document.querySelector("[data-mobile-nav]")?.classList.remove("is-open");
  document.querySelector("[data-mobile-nav]")?.setAttribute("inert", "");
  document.querySelector("main")?.removeAttribute("inert");
  document.querySelector("site-footer")?.removeAttribute("inert");
  document.querySelector("[data-menu-button]")?.setAttribute("aria-expanded", "false");
});

const init = () => {
  document.querySelectorAll("[data-year]").forEach((item) => { item.textContent = String(new Date().getFullYear()); });
  initNavigation();
  initParallax();
  initPageTransitions();
  loadTurnstile();
  // Static story/policy pages still use the real admin-managed brand settings.
  if (["/about/", "/privacy/", "/terms/"].includes(location.pathname)) api.getBootstrap().then(data => setSiteSettings(data.settings)).catch(() => {});
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) document.querySelectorAll("video").forEach(video => video.pause());
  });
  observeReveals();
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("is-ready")));
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
