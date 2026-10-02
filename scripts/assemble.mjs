import {cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('out/policies',{recursive:true});
await cp('public/admin','out/admin',{recursive:true,force:true});
await cp('public/assets','out/assets',{recursive:true,force:true});
await cp('public/policies/privacy.html','out/policies/privacy.html');
await cp('public/policies/terms.html','out/policies/terms.html');
await writeFile('out/robots.txt','User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://husba.pages.dev/sitemap.xml\n');
await writeFile('out/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['','collections/','videos/','story/','contact/','privacy/','terms/'].map(path=>`<url><loc>https://husba.pages.dev/${path}</loc></url>`).join('')+'</urlset>');
const admin=await readFile('out/admin/index.html','utf8');
const classic=await readFile('out/admin/classic/index.html','utf8');
if(!admin.includes('HUSBA')||!classic.includes('/assets/js/admin.js'))throw Error('Admin route check failed');
// Next's static RSC payload uses inline scripts. Hash exactly the generated
// bytes so hydration works without enabling unsafe-inline for all scripts.
const hashes=new Set();
async function visit(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${item.name}`;if(item.isDirectory())await visit(path);else if(path.endsWith('.html')){const html=await readFile(path,'utf8');for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(match[1])hashes.add(`'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);}}}}
await visit('out');
const headers=await readFile('out/_headers','utf8');
await writeFile('out/_headers',headers.replace("script-src 'self' https://challenges.cloudflare.com",`script-src 'self' ${[...hashes].join(' ')} https://challenges.cloudflare.com`));
await rm('out/_headers.template',{force:true});
await rm('out/config.template.js',{force:true});
await rm('dist',{recursive:true,force:true});
await cp('out','dist',{recursive:true});
console.log('Next.js static export assembled in dist/ for the existing Cloudflare Pages build configuration.');
