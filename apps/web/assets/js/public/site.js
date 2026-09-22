import {getBootstrap, safeMedia, safeLink} from './api.js';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function whatsappLink(phone,text) {return `https://wa.me/${String(phone).replace(/\D/g,'')}?text=${encodeURIComponent(text)}`;}
export function updateWhatsApp(phone='919004931823') {
  document.querySelectorAll('[data-whatsapp]').forEach(btn => {
    btn.dataset.whatsapp=phone;
    const name=btn.dataset.productName;
    const url=btn.dataset.productUrl || location.href;
    btn.href=whatsappLink(phone,name ? `Hi HUSBA Beads! I'm interested in "${name}" (${url}). Please share price, availability and ordering details.` : "Hi HUSBA Beads! I'd like to know more about your handmade pieces.");
    btn.target='_blank';btn.rel='noopener';
  });
}
const observed = new WeakSet();
const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}}),{threshold:.08}) : null;
const videoObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>entries.forEach(({target:v,isIntersecting})=>{
  if(isIntersecting){if(!v.getAttribute('src')) v.src=v.dataset.src;if(!reduced() && !navigator.connection?.saveData && !v.dataset.userPaused && !document.hidden)v.play().catch(()=>{});}else v.pause();
}),{threshold:.5}) : null;
export function refreshMedia() {
  document.querySelectorAll('[data-reveal]').forEach(el=>{
    if(observed.has(el))return; observed.add(el);
    if(!revealObserver || reduced())el.classList.add('is-visible');else revealObserver.observe(el);
  });
  document.querySelectorAll('video[data-lazy]').forEach(v=>{
    if(observed.has(v))return;observed.add(v);
    videoObserver?.observe(v);
    const button=v.closest('.hb-reel')?.querySelector('[data-play-film]');
    const sync=()=>{if(button){button.textContent=v.paused?'Play':'Pause';button.setAttribute('aria-label',v.paused?'Play film':'Pause film');}};
    v.addEventListener('play',sync);v.addEventListener('pause',sync);
    button?.addEventListener('click',()=>{if(!v.getAttribute('src'))v.src=v.dataset.src;if(v.paused){delete v.dataset.userPaused;v.play().catch(()=>{v.controls=true;});}else{v.dataset.userPaused='true';v.pause();}});
  });
}
let stopHero = ()=>{};
export function initHero() {
  stopHero();const hero=document.querySelector('.hb-hero');if(!hero)return;
  const images=[...hero.querySelectorAll('[data-banner-image]')];const dots=hero.querySelector('.hb-hero__dots');
  if(images.length<2){if(dots)dots.hidden=true;return;}
  dots.hidden=false;dots.innerHTML=images.map((_,i)=>`<button type="button" data-banner-index="${i}" aria-label="Show banner ${i+1}" aria-current="${i===0}"></button>`).join('')+'<button class="hb-banner-pause" type="button">Pause</button>';
  let index=0, paused=reduced(), visible=true;const pause=dots.querySelector('.hb-banner-pause');pause.textContent=paused?'Play':'Pause';
  function show(i){index=i;images.forEach((im,j)=>im.classList.toggle('is-active',i===j));dots.querySelectorAll('[data-banner-index]').forEach((d,j)=>d.setAttribute('aria-current',String(i===j)));}
  dots.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-banner-index')){show(Number(b.dataset.bannerIndex));paused=true;}else paused=!paused;pause.textContent=paused?'Play':'Pause';});
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});io.observe(hero);
  const timer=setInterval(()=>{if(visible && !paused && !document.hidden && !hero.contains(document.activeElement))show((index+1)%images.length);},6000);
  stopHero=()=>{clearInterval(timer);io.disconnect();};show(0);
}
function initHeader(){
  const header=document.querySelector('.hb-header'), menu=document.querySelector('.hb-mobile-menu'),btn=document.querySelector('.hb-menu-btn');if(!header||!menu||!btn||btn.dataset.menuBound==='true')return;
  btn.dataset.menuBound='true';
  const setOpen=open=>{
    header.dataset.menuOpen=String(open);menu.dataset.open=String(open);menu.inert=!open;
    const top=header.getBoundingClientRect().bottom;menu.style.top=`${top}px`;menu.style.height=`calc(100dvh - ${top}px)`;
    btn.setAttribute('aria-expanded',String(open));btn.setAttribute('aria-label',open?'Close menu':'Open menu');
    document.body.style.overflow=open?'hidden':'';
    document.querySelector('main')?.toggleAttribute('inert',open);document.querySelector('site-footer')?.toggleAttribute('inert',open);
    if(!open)btn.focus();
  };
  btn.addEventListener('click',()=>setOpen(menu.dataset.open!=='true'));
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));
  window.addEventListener('keydown',e=>{
    if(menu.dataset.open!=='true')return;
    if(e.key==='Escape')setOpen(false);
    if(e.key==='Tab'){const last=[...menu.querySelectorAll('a')].at(-1);if(e.shiftKey&&document.activeElement===btn){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();btn.focus();}}
  });
  window.addEventListener('resize',()=>{if(innerWidth>=900&&menu.dataset.open==='true')setOpen(false);});
  window.addEventListener('pageshow',()=>{if(menu.dataset.open==='true')setOpen(false);});
  const onScroll=()=>header.dataset.scrolled=String(scrollY>8);onScroll();window.addEventListener('scroll',onScroll,{passive:true});
}
async function settings(){
 try{
  const {settings:s}=await getBootstrap();updateWhatsApp(String(s.whatsapp_number||'919004931823').replace(/\D/g,''));
  const messages=[s.announcement_1,s.announcement_2,s.announcement_3].filter(v=>String(v||'').trim());
  const bar=document.querySelector('#hb-announce');if(bar){bar.hidden=!messages.length;bar.textContent=messages.join(' · ');}
  if(s.logo_url){const mark=document.querySelector('.hb-header__mark');const img=document.createElement('img');img.src=safeMedia(s.logo_url,'/assets/media/brand/original-logo.webp');img.alt='HUSBA Beads';img.className='hb-brand-logo';mark.prepend(img);}
  const social=document.querySelector('.hb-footer__social');
  for(const [key,label] of [['facebook_url','Facebook'],['youtube_url','YouTube'],['pinterest_url','Pinterest'],['tiktok_url','TikTok']]){
    if(s[key] && /^https:\/\//i.test(s[key])){const a=document.createElement('a');a.href=safeLink(s[key]);a.textContent=label;a.target='_blank';a.rel='noopener';social?.append(a);}
  }
  if(s.footer_description)document.querySelector('.hb-footer__tag').textContent=s.footer_description;
  document.querySelectorAll('a[href*="instagram.com"]').forEach(a=>{a.hidden=!s.instagram_url;if(s.instagram_url)a.href=safeLink(s.instagram_url,'https://www.instagram.com/husba.beads/');});
 }catch{ /* Keep real static content and honest product error states. */ }
}
function init(){if(document.body.dataset.husbaInitialized==='true')return;document.body.dataset.husbaInitialized='true';initHeader();refreshMedia();updateWhatsApp();settings();document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(v=>v.pause());});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
