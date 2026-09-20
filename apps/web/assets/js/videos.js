import { api } from "./api.js";
import { escapeHtml, openEnquiry, safeMediaUrl, setSiteSettings } from "./shared.js";

const container = document.querySelector("[data-video-stories]");
let productsById = new Map();
const icons = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.5h3v13h-3zm6 0h3v13h-3z" fill="currentColor"/></svg>',
  volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.5v5h3.4l4.1 3.5V6L8.4 9.5zm10.2-.8a5 5 0 0 1 0 6.6m2.4-9a8.5 8.5 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.5v5h3.4l4.1 3.5V6L8.4 9.5zm10-1 5 7m0-7-5 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const renderStory = (story) => {
  const product = productsById.get(String(story.product_id)) || (story.product_id ? {
    id: story.product_id,
    name: story.product_name,
    slug: story.product_slug,
    category_name: story.category_name,
    primary_image_url: story.primary_image_url,
  } : null);
  const poster = safeMediaUrl(story.poster_url, product?.primary_image_url);
  const videoUrl = story.video_url ? safeMediaUrl(story.video_url, "") : "";
  return `<article class="video-story" data-video-story>
    <div class="video-story__media">
      ${videoUrl ? `<video data-src="${escapeHtml(videoUrl)}" poster="${escapeHtml(poster)}" playsinline muted loop preload="auto" controls aria-label="${escapeHtml(story.title)}"></video>` : `<img src="${escapeHtml(poster)}" alt="${escapeHtml(story.poster_alt || story.title)}" width="1080" height="1350">`}
    </div>
    <div class="video-story__content">
      <div class="video-story__copy">
        <span class="eyebrow">${escapeHtml(product?.category_name || "The HUSBA Edit")}</span>
        <h2>${escapeHtml(story.title)}</h2>
        <p>${escapeHtml(story.caption || "See the details, movement and finish of this handcrafted piece.")}</p>
        <div class="hero__actions">
          ${product?.slug ? `<a class="button button--light" href="/product/?slug=${encodeURIComponent(product.slug)}">View piece</a>` : ""}
          <button class="button button--ghost" type="button" data-story-enquiry>Enquire <span aria-hidden="true">↗</span></button>
        </div>
      </div>
      ${videoUrl ? `<div class="video-controls"><button class="icon-button" type="button" data-video-toggle aria-label="Play video">${icons.play}</button><button class="icon-button" type="button" data-mute-toggle aria-label="Unmute video">${icons.muted}</button></div>` : ""}
    </div>
    ${videoUrl ? '<div class="video-progress" aria-hidden="true"><span></span></div>' : ""}
  </article>`;
};

const initVideoBehavior = () => {
  const stories = [...document.querySelectorAll("[data-video-story]")];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loadVideo = (video) => {
    if (!video?.src && video?.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector("video");
      if (!video) return;
      if (entry.isIntersecting && entry.intersectionRatio > 0.64) {
        loadVideo(video);
        const index = stories.indexOf(entry.target);
        loadVideo(stories[index + 1]?.querySelector("video"));
        if (!reducedMotion) video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: [0.25, 0.65] });

  stories.forEach((story) => {
    observer.observe(story);
    const video = story.querySelector("video");
    if (!video) return;
    const playButton = story.querySelector("[data-video-toggle]");
    const muteButton = story.querySelector("[data-mute-toggle]");
    const progress = story.querySelector(".video-progress span");
    const syncPlayButton = () => {
      playButton.innerHTML = video.paused ? icons.play : icons.pause;
      playButton.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
    };
    playButton.addEventListener("click", async () => {
      loadVideo(video);
      try {
        if (video.paused) {
          await video.play();
        } else {
          video.pause();
        }
      } catch {
        video.controls = true;
      }
    });
    video.addEventListener("click", async () => {
      if (!video.paused) return;
      loadVideo(video);
      try { await video.play(); } catch { video.controls = true; }
    });
    video.addEventListener("loadeddata", syncPlayButton);
    video.addEventListener("play", syncPlayButton);
    video.addEventListener("pause", syncPlayButton);
    muteButton.addEventListener("click", () => {
      video.muted = !video.muted;
      muteButton.innerHTML = video.muted ? icons.muted : icons.volume;
      muteButton.setAttribute("aria-label", video.muted ? "Unmute video" : "Mute video");
    });
    video.addEventListener("timeupdate", () => {
      progress.style.width = video.duration ? `${(video.currentTime / video.duration) * 100}%` : "0%";
    });
  });
};

const init = async () => {
  try {
    const [videoData, bootstrap] = await Promise.all([api.getVideos(), api.getBootstrap()]);
    setSiteSettings(bootstrap.settings);
    productsById = new Map((bootstrap.products || []).map((product) => [String(product.id), product]));
    const videos = videoData.videos || [];
    if (!videos.length) {
      container.innerHTML = '<section class="video-story"><div class="empty-state__inner"><span class="eyebrow">The HUSBA Edit</span><h1>Stories in the making.</h1><p>Our next handcrafted story will appear here soon.</p><a class="button button--light" href="/collections/">Explore collections</a></div></section>';
      return;
    }
    container.innerHTML = videos.map(renderStory).join("");
    container.querySelectorAll("[data-story-enquiry]").forEach((button, index) => {
      button.addEventListener("click", () => {
        const story = videos[index];
        const product = productsById.get(String(story.product_id)) || (story.product_id ? {
          id: story.product_id,
          name: story.product_name,
          slug: story.product_slug,
          product_code: story.product_code,
        } : null);
        openEnquiry({ product });
      });
    });
    initVideoBehavior();
  } catch (error) {
    container.innerHTML = `<section class="video-story"><div class="error-state__inner"><h1>Films are temporarily unavailable.</h1><p>${escapeHtml(error.message)}</p><a class="button button--light" href="/collections/">Explore collections</a></div></section>`;
  }
};

init();
