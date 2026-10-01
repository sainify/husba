import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../worker/src/index.js';
import {productMetadata,sitemapXml} from '../server/catalogue-seo.js';
let DatabaseSync;try{({DatabaseSync}=await import('node:sqlite'));}catch{}
test('Worker SQL pagination, total and hidden-product protection use real SQLite', {skip:!DatabaseSync&&'Requires Node 22+ node:sqlite'}, async()=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(await readFile(new URL('../worker/migrations/0001_initial.sql',import.meta.url),'utf8'));
 sqlite.prepare('INSERT INTO categories(id,name,slug) VALUES(?,?,?)').run('c1','Bracelets','bracelets');
 const insert=sqlite.prepare('INSERT INTO products(id,name,slug,category_id,is_active,is_featured) VALUES(?,?,?,?,?,?)');
 for(let i=0;i<106;i++)insert.run('p'+String(i).padStart(3,'0'),'Pearl '+i,'pearl-'+i,'c1',i===105?0:1,1);
 sqlite.prepare('INSERT INTO product_videos(id,product_id,title,video_url) VALUES(?,?,?,?)').run('v1','p105','Hidden film','https://res.cloudinary.com/demo/video/upload/hidden.mp4');
 const DB={prepare(sql){const stmt=sqlite.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async all(){return {results:stmt.all(...args)};},async first(){return stmt.get(...args)||null;},async run(){return stmt.run(...args);}};}};
 const fetchPath=path=>worker.fetch(new Request('https://worker.example/api'+path),{DB,ALLOWED_ORIGINS:'https://husba.pages.dev'},{});
 const first=await fetchPath('/products');assert.equal(first.status,200);assert.equal(first.headers.get('cache-control'),'no-store');const a=await first.json();assert.equal(a.products.length,48);assert.equal(a.total,105);
 const b=await (await fetchPath('/products?limit=100&offset=0')).json(),c=await(await fetchPath('/products?limit=100&offset=100')).json();assert.equal(b.products.length,100);assert.equal(c.products.length,5);assert.equal(new Set([...b.products,...c.products].map(p=>p.id)).size,105);
 assert.equal((await fetchPath('/products/pearl-105')).status,404);assert.equal((await(await fetchPath('/products?search=Pearl%20105')).json()).total,0);assert.equal((await(await fetchPath('/videos')).json()).videos.length,0);
 assert.equal((await(await fetchPath('/bootstrap')).json()).products.length,6);sqlite.close();
});
test('server metadata safely escapes content and never advertises hidden prices or pieces',()=>{
 const p={is_active:1,slug:'pearl',name:'Pearl <script>',description:'</script><script>alert(1)</script>',show_price:0,price_minor:20000,media:[]};
 const meta=productMetadata(p);assert.ok(meta.tags.includes('&lt;script&gt;'));assert.ok(!meta.tags.includes('</script><script>alert'));assert.ok(!meta.tags.includes('"offers"'));assert.throws(()=>productMetadata({...p,is_active:0}),/not found/);
});
test('dynamic sitemap paginates, excludes hidden items, and rejects incomplete/repeated pages',async()=>{
 const calls=[];const fake=async url=>{calls.push(url);return Response.json(calls.length===1?{products:[{id:'a',slug:'one',is_active:1},{id:'b',slug:'hidden',is_active:0}],total:3}:{products:[{id:'c',slug:'last',is_active:1}],total:3});};
 const xml=await sitemapXml(fake);assert.equal(calls.length,2);assert.ok(calls[1].endsWith('offset=2'));assert.ok(xml.includes('slug=last'));assert.ok(!xml.includes('slug=hidden'));
 await assert.rejects(sitemapXml(async()=>Response.json({products:[{id:'a',slug:'same',is_active:1}],total:2})),/Repeated/);
});
