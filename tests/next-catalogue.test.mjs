import test from 'node:test';
import assert from 'node:assert/strict';
import {allProducts,money,safeMedia} from '../lib/api.js';
test('complete collection pagination handles more than 100 products',async()=>{
  const original=global.fetch;
  const offsets=[];
  global.fetch=async url=>{const offset=Number(new URL(url).searchParams.get('offset'));offsets.push(offset);return {ok:true,json:async()=>({products:Array.from({length:Math.min(100,205-offset)},(_,i)=>({id:offset+i,slug:`piece-${offset+i}`})),total:205,categories:[]})}};
  try {const result=await allProducts();assert.equal(result.products.length,205);assert.deepEqual(offsets,[0,100,200]);}finally{global.fetch=original}
});
test('hidden price and unsafe media are not displayed',()=>{
  assert.equal(money({show_price:false,price_minor:9900,price_label:'₹99'}),'Enquire for price');
  assert.equal(safeMedia('javascript:alert(1)'),'');
  assert.equal(safeMedia('https://evil.example/image.jpg'),'');
});
