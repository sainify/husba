import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const root=new URL('../apps/web/',import.meta.url);
test('public PWA excludes admin/API/mutations and returns offline page on network failure',async()=>{
 const handlers={};const deleted=[];const fallback={offline:true};
 const context={URL,Promise,fetch:async()=>{throw Error('offline')},caches:{match:async()=>fallback,keys:async()=>['husba-admin-v18','husba-public-old','other'],delete:async key=>deleted.push(key)},self:{location:{origin:'https://husba.pages.dev'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.runInNewContext(await readFile(new URL('sw.js',root),'utf8'),context);
 for(const [path,method] of [['/admin/','GET'],['/api/products','GET'],['/contact/','POST'],['https://external.example/a','GET']]){
 let intercepted=false;handlers.fetch({request:{url:new URL(path,'https://husba.pages.dev').href,method,mode:'navigate'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 }
 let result;handlers.fetch({request:{url:'https://husba.pages.dev/product/?slug=test',method:'GET',mode:'navigate'},respondWith:p=>result=p});assert.equal(await result,fallback);
 let activation;handlers.activate({waitUntil:p=>activation=p});await activation;assert.deepEqual(deleted,['husba-public-old']);
});
test('public manifest and page install metadata use independent app identity',async()=>{
 const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));
 assert.equal(manifest.id,'/');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons)assert.ok((await readFile(new URL(icon.src.slice(1),root))).length>0);
 const publicHtml=await readFile(new URL('index.html',root),'utf8');assert.match(publicHtml,/manifest.webmanifest/);assert.match(publicHtml,/public\/pwa.js/);
 const admin=await readFile(new URL('admin/index.html',root),'utf8');assert.ok(!admin.includes('public/pwa.js'));
});
