import {updateWhatsApp,refreshMedia} from './site.js';
import { getProductBySlug, getProducts, escapeHtml as e, whatsappNumber } from './api.js';

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
      : `<img src="${e(item.src)}" alt="${e(document.getElementById('product-name').textContent)}" />`;
  refreshMedia();
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
    const canonical=document.querySelector('link[rel=canonical]')||document.createElement('link');canonical.rel='canonical';canonical.href=`${location.origin}/product/?slug=${encodeURIComponent(p.slug)}`;document.head.append(canonical);
    document.title = `${p.name} · HUSBA Beads`;
    document.getElementById('product-name').textContent = p.name;
    document.getElementById('product-price').textContent = p.priceLabel;
    document.getElementById('product-desc').textContent = p.description;

    const availability = document.getElementById('product-availability');
    availability.textContent = p.statusLabel;

    for(const [key,value] of Object.entries({'og:title':document.title,'og:description':p.description,'og:image':p.images[0],'og:url':canonical.href,'og:type':'product'})) {const meta=document.querySelector(`meta[property="${key}"]`)||document.createElement('meta');meta.setAttribute('property',key);meta.content=value;document.head.append(meta);}
    const schema=document.querySelector('script[data-product-schema]')||document.createElement('script');schema.dataset.productSchema='';schema.type='application/ld+json';schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:p.name,description:p.description,image:p.images,sku:p.code||undefined,brand:{'@type':'Brand',name:'HUSBA Beads'},...(p.price!==null?{offers:{'@type':'Offer',price:p.price,priceCurrency:'INR',availability:'https://schema.org/'+(p.status==='sold_out'?'OutOfStock':p.status==='made_to_order'?'PreOrder':'InStock'),url:canonical.href}}:{})});document.head.append(schema);
    renderGallery(p);
    const share=document.createElement('button');share.type='button';share.className='hb-btn hb-btn--ghost';share.textContent='Share this piece';share.onclick=async()=>{try{if(navigator.share)await navigator.share({title:p.name,url:canonical.href});else {await navigator.clipboard.writeText(canonical.href);share.textContent='Link copied';}}catch{share.textContent='Share this page from your browser';}};document.querySelector('.hb-product__info').append(share);
    const stage=document.getElementById('gallery-stage');let startX=0;stage.addEventListener('touchstart',ev=>{if(ev.touches.length===1)startX=ev.touches[0].clientX;else startX=0;},{passive:true});stage.addEventListener('touchend',ev=>{if(!startX||stage.querySelector('video'))return;const delta=ev.changedTouches[0].clientX-startX;startX=0;if(Math.abs(delta)<65)return;const buttons=[...document.querySelectorAll('#gallery-thumbs button')];const i=buttons.findIndex(b=>b.getAttribute('aria-current')==='true');buttons[(i+(delta<0?1:buttons.length-1))%buttons.length]?.click();},{passive:true});
    getProducts({category:p.categorySlug}).then(items=>{const related=items.filter(x=>x.id!==p.id).slice(0,4);if(!related.length)return;const section=document.createElement('section');section.className='hb-section hb-wrap';section.innerHTML='<h2>You may also like</h2><div class="hb-related">'+related.map(x=>`<a href="/product/?slug=${encodeURIComponent(x.slug)}"><img src="${e(x.images[0])}" alt="${e(x.name)}" loading="lazy"><h3>${e(x.name)}</h3><p>${e(x.priceLabel)}</p></a>`).join('')+'</div>';document.querySelector('main').append(section);refreshMedia();}).catch(()=>{});
    renderFacts(p);
    const facts=document.getElementById('product-facts');
    if(!facts.hidden){const details=document.createElement('details');details.className='hb-product-details';details.open=true;const summary=document.createElement('summary');summary.textContent='The little details';facts.before(details);details.append(summary,facts);}
    const care=document.createElement('details');care.className='hb-product-details';care.innerHTML='<summary>Care & keeping</summary><p>Keep your piece dry and away from perfume and harsh chemicals. Store it gently when you are not wearing it. Ask us about care for your chosen materials.</p>';document.querySelector('.hb-product__info').append(care);
    const zoom=document.createElement('dialog');zoom.className='hb-zoom-dialog';zoom.setAttribute('aria-label','Product image zoom');zoom.innerHTML='<button type="button" class="hb-dialog-close" aria-label="Close image">×</button><div><img alt=""></div>';document.body.append(zoom);zoom.querySelector('button').onclick=()=>zoom.close();
    stage.tabIndex=0;stage.setAttribute('aria-label','Product gallery. Press Enter to enlarge the current photo.');
    const openZoom=()=>{const image=stage.querySelector('img');if(!image)return;zoom.querySelector('img').src=image.src;zoom.querySelector('img').alt=p.name;zoom.showModal();};stage.addEventListener('click',openZoom);stage.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target===stage)openZoom();});
    if(matchMedia('(hover:hover) and (pointer:fine)').matches){stage.addEventListener('pointermove',event=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const image=stage.querySelector('img');if(!image)return;const rect=stage.getBoundingClientRect();image.style.transformOrigin=`${(event.clientX-rect.left)/rect.width*100}% ${(event.clientY-rect.top)/rect.height*100}%`;image.style.transform='scale(1.3)';});stage.addEventListener('pointerleave',()=>{const image=stage.querySelector('img');if(image)image.style.transform='';});}


    const wa = document.getElementById('cta-whatsapp');
    wa.dataset.productName = p.name;
    wa.dataset.productCode=p.code;
    const enquire = document.getElementById('cta-enquire');
    enquire.href = `/contact/?product=${encodeURIComponent(p.name)}&slug=${encodeURIComponent(p.slug)}`;

    loadingEl.hidden = true;
    contentEl.hidden = false;
    const mobile=document.createElement('nav');mobile.className='hb-mobile-product-actions';mobile.setAttribute('aria-label','Enquire about this piece');mobile.innerHTML=`<a class="hb-btn hb-btn--whatsapp" data-whatsapp="" data-product-name="${e(p.name)}" data-product-code="${e(p.code)}" data-product-url="${e(canonical.href)}">WhatsApp ↗</a><a class="hb-btn hb-btn--primary" href="${e(enquire.href)}">Send enquiry</a>`;document.body.append(mobile);document.body.classList.add('has-product-actions');
    refreshMedia();

    wa.dataset.productUrl = `${location.origin}/product/?slug=${encodeURIComponent(p.slug)}`;
    updateWhatsApp();
    whatsappNumber().then(updateWhatsApp).catch(()=>{});
  } catch (err) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
  }
}

render();
