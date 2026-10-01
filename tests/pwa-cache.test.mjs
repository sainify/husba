import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('PWA caches only static shell; activation waits for explicit update acceptance',async()=>{
 const events={},cached=new Map(),deleted=[];let skipped=0,claimed=0,waiting;
 const cache={async addAll(paths){for(const path of paths)cached.set(path,new Response('asset'));},async match(path){return cached.get(path)?.clone();},async put(path,value){cached.set(path,value);}};
 const context={URL,Response,location:{origin:'https://husba.pages.dev'},fetch:async()=>new Response('fresh'),caches:{async open(){return cache;},async keys(){return ['husba-admin-old','another-app-cache'];},async delete(key){deleted.push(key);}},self:{addEventListener(name,fn){events[name]=fn;},skipWaiting(){skipped++;},clients:{claim(){claimed++;}}}};
 vm.runInNewContext(await readFile(new URL('../apps/web/admin/sw.js',import.meta.url),'utf8'),context);
 events.install({waitUntil(p){waiting=p;}});await waiting;assert.equal(skipped,0);assert.ok(cached.has('/admin/'));assert.ok(!cached.has('/config.js'));
 for(const path of ['https://husba.pages.dev/api/admin/session','https://other.example/assets/js/admin.js']){let intercepted=false;events.fetch({request:{method:'GET',url:path},respondWith(){intercepted=true;}});assert.equal(intercepted,false);}
 let response;events.fetch({request:{method:'GET',url:'https://husba.pages.dev/assets/js/admin.js?v=new'},respondWith(p){response=p;}});assert.equal(await(await response).text(),'asset');
 events.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(skipped,1);events.activate({waitUntil(p){waiting=p;}});await waiting;assert.equal(claimed,1);assert.deepEqual(deleted,['husba-admin-old']);
});
