import test from 'node:test';
import assert from 'node:assert/strict';
import {adminRequest} from '../lib/admin-api.js';

test('a stalled save stops showing progress and warns that commit status is unknown',async()=>{
 const original=global.fetch;
 global.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true}));
 try{
  await assert.rejects(adminRequest('/products/123',{method:'PUT',body:'{}',timeoutMs:15}),error=>error.code==='TIMEOUT'&&/may have saved/i.test(error.message));
 }finally{global.fetch=original}
});
