import {escapeHtml as e} from './api.js';
export const productCardHtml = (p,i=0) => `<a class="hb-card" data-reveal href="/product/?slug=${encodeURIComponent(p.slug)}" style="--i:${i}">
<div class="hb-card__frame"><img src="${e(p.images[0])}" alt="${e(p.name)}" width="800" height="1000" loading="lazy" decoding="async"><span class="hb-card__badge${p.status === 'sold_out' ? ' hb-card__badge--unavailable' : ''}">${e(p.statusLabel)}</span></div>
<div class="hb-card__meta"><div class="hb-card__name">${e(p.name)}</div><div class="hb-card__price">${e(p.priceLabel)}</div><div class="hb-card__enquire">Tap to view &amp; enquire →</div></div></a>`;
export const reelHtml = (v,i=0,{controls=true}={}) => `<article class="hb-reel" data-reveal style="--i:${i}">
${v.url ? `<video data-src="${e(v.url)}" poster="${e(v.poster)}" muted loop playsinline preload="none" data-lazy aria-label="${e(v.caption || 'Product film')}"></video>${controls ? `<button class="hb-reel__play" type="button" aria-label="Play film" data-play-film>Play</button>` : ''}` : `<img src="${e(v.poster)}" alt="${e(v.caption)}" loading="lazy">`}
<div class="hb-reel__scrim"></div><a class="hb-reel__caption" href="${v.productSlug ? '/product/?slug='+encodeURIComponent(v.productSlug) : '/contact/'}">${e(v.caption || 'Discover this piece')} <span aria-hidden="true">↗</span></a></article>`;
