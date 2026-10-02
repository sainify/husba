import { api } from "./api.js";
import { escapeHtml, openEnquiry, productWhatsAppUrl, refreshAnimations, renderProductCard, safeMediaUrl, setSiteSettings } from "./shared.js";

const productGrid = document.querySelector("[data-featured-products]");
const categoryGrid = document.querySelector("[data-categories]");
const homeVideos = document.querySelector("[data-home-videos]");
let bannerTimer = null;
const heroVideo = document.querySelector("[data-hero-video]");
const heroImage = document.querySelector("[data-hero-image]");
const heroBannerGrid = document.querySelector("[data-hero-banner-grid]");

const categoryImageMap = (settings = {}) => {
  try {
    const parsed = JSON.parse(String(settings.category_images || "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const renderCategories = (categories, settings = {}) => {
  if (!categories.length) {
    categoryGrid.innerHTML = '<div class="empty-state"><div class="empty-state__inner"><h2>Collections are being prepared.</h2><p>Please visit again soon or send us a custom enquiry.</p></div></div>';
    return;
  }
  const images = categoryImageMap(settings);
  categoryGrid.innerHTML = categories.slice(0, 4).map((category, index) => {
    const image = safeMediaUrl(images[category.slug] || "", "/assets/media/products/pearl-glow-hero.webp");
    return `<a class="category-card" href="/collections/?category=${encodeURIComponent(category.slug)}">
      <div class="category-card__image"><img src="${escapeHtml(image)}" alt="${escapeHtml(category.name)}" loading="lazy"></div>
      <div class="category-card__footer"><span class="category-card__name">${escapeHtml(category.name)}</span><span class="category-card__arrow" aria-hidden="true">→</span></div>
    </a>`;
  }).join("");
};

const renderProducts = (products) => {
  if (!products.length) {
    productGrid.innerHTML = '<div class="empty-state"><div class="empty-state__inner"><h2>New pieces are on their way.</h2><p>Ask us about a custom design in the meantime.</p><button class="button" type="button" data-open-enquiry data-enquiry-type="custom">Custom enquiry</button></div></div>';
    return;
  }
  productGrid.innerHTML = products.slice(0, 6).map(renderProductCard).join("");
};

const renderHomeVideos = (videos) => {
  if (!homeVideos) return;
  if (!videos.length) {
    homeVideos.innerHTML = '<div class="home-reels-empty">The HUSBA Edit will appear here.</div>';
    return;
  }
  homeVideos.innerHTML = videos.slice(0, 6).map((video) => `
    <article class="home-reel">
      <video
        data-src="${escapeHtml(safeMediaUrl(video.video_url, ""))}"
        poster="${escapeHtml(safeMediaUrl(video.poster_url))}"
        muted loop playsinline controls preload="none"
        aria-label="${escapeHtml(video.title)}"
      ></video>
      <div class="home-reel__caption">
        <strong>${escapeHtml(video.title)}</strong>
        <span>${escapeHtml(video.caption || video.product_name || "The HUSBA Edit")}</span>
        <button class="home-reel__enquire" type="button" data-reel-enquiry="${escapeHtml(String(video.id || ""))}">Enquire now <span aria-hidden="true">↗</span></button>
      </div>
    </article>`).join("");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector("video");
      if (!video) return;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
        if (!video.getAttribute("src")) video.src = video.dataset.src;
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches && !navigator.connection?.saveData) video.play().catch(() => {});
      }
      else video.pause();
    });
  }, { threshold: [0.65] });
  homeVideos.querySelectorAll(".home-reel").forEach((reel) => observer.observe(reel));
};

document.addEventListener("click", (event) => {
  const enquiry = event.target.closest("[data-reel-enquiry]");
  if (enquiry) {
    const reel = enquiry.closest(".home-reel");
    const index = [...homeVideos.querySelectorAll(".home-reel")].indexOf(reel);
    const video = window.__homeVideos?.[index];
    openEnquiry({ product: video?.product_id ? { id: video.product_id, name: video.product_name, slug: video.product_slug, product_code: video.product_code } : null });
    return;
  }
});

const settingEnabled = (value) => value === undefined || (String(value) !== "false" && String(value) !== "0");

const applySectionVisibility = (settings) => {
  ["products", "videos", "categories", "enquiry"].forEach((section) => {
    const element = document.querySelector(`[data-home-section="${section}"]`);
    if (element) element.hidden = !settingEnabled(settings?.[`show_${section}_section`]);
  });
};

const startBannerSlider = (settings, featuredProducts = []) => {
  const configuredImages = Array.from({ length: 5 }, (_, index) => settings?.[`banner_image_${index + 1}`])
    .filter(Boolean)
    .map((url) => safeMediaUrl(url, ""))
    .filter(Boolean);
  const productImages = featuredProducts
    .map((product) => product?.primary_image_url || product?.media?.find((item) => item.media_type === "image")?.url)
    .map((url) => safeMediaUrl(url, ""))
    .filter(Boolean);
  const fallback = safeMediaUrl(settings?.hero_image_url, "/assets/media/products/pearl-glow-hero.webp");
  const slides = configuredImages.length ? configuredImages : (productImages.length ? productImages : [fallback]);
  clearInterval(bannerTimer);

  if (!heroBannerGrid) return;
  heroBannerGrid.innerHTML = slides.map((url, index) => `<img class="hero__banner-slide${index === 0 ? " is-active" : ""}" src="${escapeHtml(url)}" alt="" loading="${index === 0 ? "eager" : "lazy"}" decoding="async">`).join("");
  heroBannerGrid.hidden = false;
  if (heroImage) heroImage.hidden = true;
  if (slides.length < 2) return;
  const controls = document.createElement("div");
  controls.className = "banner-controls";
  controls.setAttribute("aria-label", "Banner slideshow");
  controls.innerHTML = slides.map((_, i) => `<button type="button" data-slide="${i}" aria-label="Show banner ${i + 1}" aria-pressed="${i === 0}">${i + 1}</button>`).join("") + '<button type="button" data-pause-banner>Pause</button>';
  heroBannerGrid.parentElement.append(controls);
  let index = 0;
  let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pauseButton = controls.querySelector("[data-pause-banner]");
  pauseButton.textContent = paused ? "Play" : "Pause";
  const show = (next) => {
    index = next;
    heroBannerGrid.querySelectorAll("img").forEach((image, i) => image.classList.toggle("is-active", i === index));
    controls.querySelectorAll("[data-slide]").forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
  };
  controls.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-slide")) {
      show(Number(button.dataset.slide));
      paused = true;
    } else paused = !paused;
    pauseButton.textContent = paused ? "Play" : "Pause";
  });
  bannerTimer = setInterval(() => {
    if (!paused && !document.hidden && !controls.contains(document.activeElement)) show((index + 1) % slides.length);
  }, 5500);
};

const setupHeroMedia = (settings, featuredVideo = null, featuredProducts = []) => {
  const mode = String(settings?.hero_media_type || "banner").toLowerCase() === "video" ? "video" : "banner";
  const videoUrl = safeMediaUrl(settings?.hero_video_url || featuredVideo?.video_url, "");
  if (mode !== "video" || !videoUrl || !heroVideo) {
    if (heroVideo) {
      heroVideo.pause();
      heroVideo.removeAttribute("src");
      heroVideo.load();
      heroVideo.hidden = true;
    }
    startBannerSlider(settings, featuredProducts);
    return;
  }
  clearInterval(bannerTimer);
  if (heroBannerGrid) {
    heroBannerGrid.innerHTML = "";
    heroBannerGrid.hidden = true;
  }
  heroVideo.src = videoUrl;
  heroVideo.poster = safeMediaUrl(settings?.hero_video_poster_url || featuredVideo?.poster_url || settings?.hero_image_url, "");
  heroVideo.muted = true;
  heroVideo.hidden = false;
  if (heroImage) heroImage.hidden = true;
  heroVideo.controls = true;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && !navigator.connection?.saveData) heroVideo.play().catch(() => {});
};

const applySeo = (settings) => {
  if (settings?.seo_title) document.title = settings.seo_title;
  const setMeta = (selector, value) => {
    const meta = document.querySelector(selector);
    if (meta && value) meta.content = value;
  };
  setMeta('meta[name="description"]', settings?.seo_description);
  setMeta('meta[property="og:title"]', settings?.seo_title);
  setMeta('meta[property="og:description"]', settings?.seo_description);
  setMeta('meta[property="og:image"]', settings?.seo_image_url);
};

const init = async () => {
  try {
    const data = await api.getBootstrap();
    setSiteSettings(data.settings);
    applySectionVisibility(data.settings || {});
    applySeo(data.settings || {});
    renderProducts(data.products || []);
    renderCategories(data.categories || [], data.settings || {});
    window.__homeVideos = (data.videos || []).slice(0, 6);
    renderHomeVideos(window.__homeVideos);
    const heroTitle = document.querySelector("[data-hero-title]");
    const heroCopy = document.querySelector("[data-hero-copy]");
    if (heroTitle) heroTitle.textContent = String(data.settings?.hero_title || "Handmade Jewellery").trim();
    if (heroCopy) heroCopy.textContent = String(data.settings?.hero_copy || "Thoughtful beaded jewellery, made by hand for you.").trim();
    const heroCta = document.querySelector("[data-hero-cta]");
    if (heroCta) {
      heroCta.textContent = String(data.settings?.hero_cta_text || "Explore collection ↗").trim();
      const target = String(data.settings?.hero_cta_url || "/collections/").trim();
      heroCta.href = target.startsWith("/") || /^https:\/\//i.test(target) ? target : "/collections/";
    }
    const contentFields = [
      "hero_eyebrow", "featured_eyebrow", "featured_title", "featured_copy",
      "video_eyebrow", "video_title", "video_copy", "categories_eyebrow",
      "categories_title", "categories_copy", "enquiry_eyebrow", "enquiry_title",
      "enquiry_copy"
    ];
    contentFields.forEach((key) => {
      const element = document.querySelector(`[data-${key.replaceAll("_", "-")}]`);
      if (element && data.settings?.[key]) element.textContent = data.settings[key];
    });
    if (!data.settings?.hero_eyebrow || data.settings.hero_eyebrow === "Handcrafted in India") {
      document.querySelector("[data-hero-eyebrow]").textContent = "Handcrafted in Mumbai";
    }
    if (heroImage && data.settings?.hero_image_url) heroImage.src = safeMediaUrl(data.settings.hero_image_url);
    if (heroImage && data.settings?.hero_image_alt) heroImage.alt = data.settings.hero_image_alt;
    setupHeroMedia(data.settings || {}, data.videos?.[0] || null, data.products || []);
    refreshAnimations();
  } catch (error) {
    if (heroImage) heroImage.hidden = false;
    categoryGrid.innerHTML = '<p>Explore our pieces in the <a class="text-link" href="/collections/">collection</a>.</p>';
    if (homeVideos) homeVideos.innerHTML = '<a class="text-link" href="/videos/">Discover the HUSBA Edit ↗</a>';
    productGrid.innerHTML = `<div class="error-state"><div class="error-state__inner"><h2>We could not load the collection.</h2><p>${escapeHtml(error.message)}</p><button class="button button--ghost" type="button" data-reload>Try again</button></div></div>`;
  }
};

init();
