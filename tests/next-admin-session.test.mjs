import test from 'node:test';
import assert from 'node:assert/strict';
import {adminRequest,fullWorkspace,setToken} from '../lib/admin-api.js';
test('admin reuses session token and loads every catalogue page',async()=>{
 const previousFetch=global.fetch, previousStorage=global.localStorage;
 const data=new Map();global.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 setToken('existing-session');
 const calls=[];
 global.fetch=async(url,options)=>{
  calls.push({url,auth:options.headers.Authorization});
  const path=new URL(url).pathname;
  const body=path.endsWith('/workspace')?{products:Array.from({length:100},(_,i)=>({id:i})),total:101,token:'refreshed-session'}:{products:[{id:100}],total:101};
  return {ok:true,json:async()=>body};
 };
 try{const workspace=await fullWorkspace();assert.equal(workspace.products.length,101);assert.equal(calls[0].auth,'Bearer existing-session');assert.equal(calls[1].auth,'Bearer refreshed-session');assert.match(calls[1].url,/offset=100/);await adminRequest('/session');assert.equal(calls[2].auth,'Bearer refreshed-session')}finally{setToken('');global.fetch=previousFetch;global.localStorage=previousStorage}
});
