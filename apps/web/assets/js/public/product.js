import {updateWhatsApp} from './site.js';
import { getProductBySlug, escapeHtml as e, whatsappNumber } from './api.js';

const slug = new URLSearchParams(location.search).get('slug') || location.pathname.split('/').filter(Boolean)[1];
const loadingEl = document.getElementById('product-loading');
const contentEl = document.getElementById('product-content');
const errorEl = document.getElementById('product-error');

function galleryItems(p) {
  // Product video first (if present), then the photo gallery — per spec.
  const items = [];
  if (p.video) items.push({ type: 'video', src: p.video, poster: p.poster });
  p.images.forEach((src) => items.push({ type: 'image', src }));
  return items;
}

function renderStage(item) {
  const stage = document.getElementById('gallery-stage');
  stage.dataset.fading = 'true';
  stage.querySelector('video')?.pause();
  stage.innerHTML =
    item.type === 'video'
      ? `<video src="${e(item.src)}" poster="${e(item.poster || '')}" controls playsinline preload="metadata"></video>`
      : `<img src="${e(item.src)}" alt="" />`;
  requestAnimationFrame(() => (stage.dataset.fading = 'false'));
}

function renderGallery(p) {
  const items = galleryItems(p);
  const thumbs = document.getElementById('gallery-thumbs');
  renderStage(items[0]);
  thumbs.innerHTML = items
    .map((item, i) => {
      const thumbSrc = item.type === 'video' ? item.poster : item.src;
      const playBadge = item.type === 'video' ? '▶' : '';
      return `<button data-index="${i}" aria-current="${i === 0}" aria-label="${item.type === 'video' ? 'Play video' : `Photo ${i}`}"><img loading="lazy" src="${e(thumbSrc)}" alt="" />${playBadge}</button>`;
    })
    .join('');
  thumbs.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderStage(items[Number(btn.dataset.index)]);
      thumbs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b === btn)));
    });
  });
}

function renderFacts(p) {
  const dl = document.getElementById('product-facts');
  if (!p.facts || !Object.keys(p.facts).length) return;
  dl.hidden = false;
  dl.innerHTML = Object.entries(p.facts)
    .map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`)
    .join('');
}

async function render() {
  if (!slug) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    return;
  }
  try {
    const p = await getProductBySlug(slug);
    if (!p) throw new Error('not found');

    document.querySelector('meta[name=description]').content=p.description || `Discover ${p.name} from HUSBA Beads.`;
    const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=`${location.origin}/product/?slug=${encodeURIComponent(p.slug)}`;document.head.append(canonical);
    document.title = `${p.name} · HUSBA Beads`;
    document.getElementById('product-name').textContent = p.name;
    document.getElementById('product-price').textContent = p.priceLabel;
    document.getElementById('product-desc').textContent = p.description;

    const availability = document.getElementById('product-availability');
    availability.textContent = p.statusLabel;

    renderGallery(p);
    renderFacts(p);

    const wa = document.getElementById('cta-whatsapp');
    wa.dataset.productName = p.name;
    const enquire = document.getElementById('cta-enquire');
    enquire.href = `/contact/?product=${encodeURIComponent(p.name)}&slug=${encodeURIComponent(p.slug)}`;

    loadingEl.hidden = true;
    contentEl.hidden = false;

    wa.dataset.productUrl = `${location.origin}/product/?slug=${encodeURIComponent(p.slug)}`;
    updateWhatsApp();
    whatsappNumber().then(updateWhatsApp).catch(()=>{});
  } catch (err) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
  }
}

render();
