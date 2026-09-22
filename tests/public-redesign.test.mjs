import {test} from 'node:test';
import assert from 'node:assert/strict';
globalThis.window={HUSBA_CONFIG:{API_BASE:'https://worker.example',DEMO_MODE:true}};
globalThis.location={origin:'https://husba.pages.dev'};
const api=await import('../apps/web/assets/js/public/api.js');
const cards=await import('../apps/web/assets/js/public/cards.js');
const piece={id:'p1',slug:'pearl',name:'Pearl "Glow"',product_code:'HB-01',show_price:1,price_minor:12500,status:'made_to_order',category_id:'c1',category_slug:'bracelets',media:[{media_type:'video',url:'https://res.cloudinary.com/demo/video/upload/v.mp4'},{media_type:'image',url:'/assets/media/products/pearl-glow-hero.webp'}]};
test('real price visibility, status and media types survive normalization',()=>{
 const p=api.normalizeProduct(piece);assert.equal(p.price,125);assert.equal(p.available,false);assert.equal(p.statusLabel,'Made to order');assert.equal(p.images.length,1);assert.ok(p.video.endsWith('.mp4'));
 assert.equal(api.normalizeProduct({...piece,show_price:0}).priceLabel,'Price on enquiry');
 assert.equal(api.normalizeProduct({...piece,status:'sold_out'}).statusLabel,'Currently unavailable');
});
test('untrusted product text is escaped and non-Cloudinary media rejected',()=>{
 const p=api.normalizeProduct({...piece,name:'<img src=x onerror=alert(1)>',price_label:'<script>x</script>'});
 const html=cards.productCardHtml(p);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));assert.equal(api.safeMedia('javascript:alert(1)',''),'');assert.equal(api.safeMedia('//evil.example/x',''),'');
});
test('bootstrap is deduplicated, featured uses products, nested product response unwraps',async()=>{
 const calls=[];globalThis.fetch=async url=>{calls.push(url);return Response.json(url.endsWith('/bootstrap')?{settings:{},categories:[],products:[piece],videos:[]}:{product:piece});};
 const [a,b]=await Promise.all([api.getBootstrap(),api.getBootstrap()]);assert.equal(a.featured[0].slug,'pearl');assert.equal(a,b);assert.equal(calls.length,1);
 assert.equal((await api.getProductBySlug('pearl')).id,'p1');assert.ok(calls[1].startsWith('https://worker.example/api/products/'));
});
test('category slug and availability filters use real Worker fields',async()=>{
 globalThis.fetch=async()=>Response.json({products:[piece,{...piece,id:'p2',slug:'second',status:'available'}],total:2});
 assert.equal((await api.getProducts({category:'bracelets'})).length,2);assert.equal((await api.getProducts({category:'c1',availableOnly:true}))[0].id,'p2');assert.equal((await api.getProducts({search:'HB-01'})).length,2);
});
test('enquiry POST carries backend phone and selected product; API errors stay errors',async()=>{
 const payload={name:'Test Person',phone:'9000000000',product_id:'p1',product_name:'Pearl',enquiry_type:'product',quantity:1,website:'',turnstile_token:''};
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://worker.example/api/enquiries');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),payload);return Response.json({reference:'TEST'});};
 assert.equal((await api.submitEnquiry(payload)).reference,'TEST');
 globalThis.fetch=async()=>Response.json({error:{message:'Service unavailable'}},{status:503});
 await assert.rejects(api.getProductBySlug('missing'),/Service unavailable/);
});
