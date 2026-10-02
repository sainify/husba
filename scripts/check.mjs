import {access,readFile} from 'node:fs/promises';
const required=['out/index.html','out/collections/index.html','out/product/index.html','out/contact/index.html','out/admin/index.html','out/admin/classic/index.html','out/admin/sw.js','out/config.js','out/_headers'];
for (const path of required) await access(path);
const admin=await readFile('out/admin/index.html','utf8');
const product=await readFile('out/product/index.html','utf8');
if(!admin.includes('HUSBA')||!product.includes('HUSBA'))throw Error('Admin or product output missing');
await access('dist/admin/index.html');
console.log(`Verified ${required.length} Next and legacy compatibility routes`);
