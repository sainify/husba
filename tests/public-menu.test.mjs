import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../apps/web/assets/js/public/site.js',import.meta.url),'utf8');
function element(){return{dataset:{},style:{},listeners:{},attrs:{},addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);},setAttribute(k,v){this.attrs[k]=v;},toggleAttribute(k,v){if(v)this.attrs[k]='';else delete this.attrs[k];},focus(){},getBoundingClientRect(){return{bottom:72};},querySelectorAll(){return[];}};}
test('repeated menu initialization installs one toggle and restores page interaction',()=>{
 const header=element(),menu=element(),button=element(),main=element(),footer=element();menu.dataset.open='false';menu.inert=true;
 const nodes={'.hb-header':header,'.hb-mobile-menu':menu,'.hb-menu-btn':button,main,'site-footer':footer};
 const document={querySelector:s=>nodes[s],body:{style:{}}};
 const ctx={document,window:{addEventListener(){}},scrollY:0,innerWidth:390};vm.createContext(ctx);
 const fn=source.slice(source.indexOf('function initHeader(){'),source.indexOf('async function settings(){'));
 vm.runInContext(fn+';initHeader();initHeader();',ctx);
 assert.equal(button.listeners.click.length,1);
 button.listeners.click[0]();assert.equal(menu.dataset.open,'true');assert.equal(menu.inert,false);assert.equal(button.attrs['aria-expanded'],'true');assert.ok('inert' in main.attrs);
 button.listeners.click[0]();assert.equal(menu.dataset.open,'false');assert.equal(menu.inert,true);assert.ok(!('inert' in main.attrs));assert.equal(document.body.style.overflow,'');
});
test('homepage has one shared module path and requests button-free reels',async()=>{
 const home=await readFile(new URL('../apps/web/index.html',import.meta.url),'utf8');
 assert.ok(!home.includes('src="/assets/js/public/site.js"'));
 globalThis.window={HUSBA_CONFIG:{}};
 const {reelHtml}=await import('../apps/web/assets/js/public/cards.js');
 const film={url:'/film.mp4',poster:'/poster.webp',caption:'Film'};
 assert.ok(!reelHtml(film,0,{controls:false}).includes('data-play-film'));
 assert.ok(reelHtml(film,0).includes('data-play-film'));
});
