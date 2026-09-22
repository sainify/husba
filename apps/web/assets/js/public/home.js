import {getBootstrap, getVideos, escapeHtml as e, safeMedia, safeLink} from './api.js';
import {productCardHtml, reelHtml} from './cards.js';
import {refreshMedia,initHero} from './site.js';
const grid=document.querySelector('#featured-grid'),cats=document.querySelector('#home-cats'),reels=document.querySelector('#home-reels');
function applySettings(s){
 const hero=document.querySelector('.hb-hero');
 for(const [key,selector] of Object.entries({hero_title:'.hb-hero__copy h1',hero_copy:'.hb-hero__copy p:not(.hb-eyebrow)',hero_eyebrow:'.hb-hero__copy .hb-eyebrow',featured_title:'[data-section="products"] h2',featured_copy:'[data-section="products"] .hb-lede',featured_eyebrow:'[data-section="products"] .hb-eyebrow',video_title:'[data-section="videos"] h2',video_copy:'[data-section="videos"] .hb-lede',video_eyebrow:'[data-section="videos"] .hb-eyebrow',categories_title:'[data-section="categories"] h2',categories_copy:'[data-section="categories"] .hb-lede',categories_eyebrow:'[data-section="categories"] .hb-eyebrow',enquiry_title:'[data-section="enquiry"] h2',enquiry_copy:'[data-section="enquiry"] p:not(.hb-eyebrow)',enquiry_eyebrow:'[data-section="enquiry"] .hb-eyebrow'})){
  const el=document.querySelector(selector);if(el&&s[key])el.textContent=s[key];
 }
 ['products','videos','categories','enquiry'].forEach(name=>{document.querySelector(`[data-section="${name}"]`).hidden=['false','0'].includes(String(s[`show_${name}_section`]));});
 const cta=hero.querySelector('.hb-btn');if(s.hero_cta_text)cta.textContent=s.hero_cta_text;if(s.hero_cta_url)cta.href=safeLink(s.hero_cta_url);
 let slides=Array.from({length:5},(_,i)=>safeMedia(s[`banner_image_${i+1}`],'')).filter(Boolean);
 if(!slides.length)slides=[safeMedia(s.hero_image_url)];
 const media=hero.querySelector('.hb-hero__media');
 // Respect existing admin video/banner choice within the same supplied layout.
 if(s.hero_media_type==='video' && safeMedia(s.hero_video_url,'')){
  media.innerHTML=`<video data-lazy data-src="${e(safeMedia(s.hero_video_url,''))}" poster="${e(safeMedia(s.hero_video_poster_url))}" playsinline muted loop preload="none" aria-label="HUSBA collection film"></video>`;
 }else{
  media.innerHTML=slides.map((url,i)=>`<img data-banner-image class="${i===0?'is-active':''}" src="${e(url)}" alt="${e(s.hero_image_alt || 'HUSBA handmade jewellery')}" ${i===0?'fetchpriority="high"':'loading="lazy"'}>`).join('');initHero();
 }
 if(s.seo_title)document.title=s.seo_title;
 for(const [selector,value] of [['meta[name="description"]',s.seo_description],['meta[property="og:title"]',s.seo_title],['meta[property="og:description"]',s.seo_description]])if(value)document.querySelector(selector)?.setAttribute('content',value);
}
async function init(){
 try{
  const data=await getBootstrap();applySettings(data.settings);
  grid.innerHTML=data.featured.length?data.featured.slice(0,8).map(productCardHtml).join(''):'<p class="hb-empty">New pieces are on their way. <a href="/contact/">Ask about a custom design ↗</a></p>';
  cats.innerHTML=data.categories.length?data.categories.map((c,i)=>`<a class="hb-cat" data-reveal href="/collections/?category=${encodeURIComponent(c.slug)}" style="--i:${i}"><div class="hb-cat__img"><img src="${e(c.image)}" alt="${e(c.name)}" loading="lazy"></div><div class="hb-cat__label">${e(c.name)}</div></a>`).join(''):'<p class="hb-empty">Collections are being curated.</p>';
 }catch{grid.innerHTML='<p class="hb-error">Products are temporarily unavailable. Please refresh or <a href="/contact/">contact us</a>.</p>';cats.innerHTML='<p class="hb-empty">Please try the collections again shortly.</p>';}
 refreshMedia();
}
async function videos(){try{const data=await getVideos();reels.innerHTML=data.length?data.slice(0,4).map((v,i)=>reelHtml(v,i,{controls:false})).join(''):'<p class="hb-empty">New films are coming soon.</p>';}catch{reels.innerHTML='<p class="hb-error">Films are temporarily unavailable.</p>';}refreshMedia();}
init();videos();
