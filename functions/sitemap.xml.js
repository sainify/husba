import {sitemapXml} from '../server/catalogue-seo.js';
export async function onRequestGet(){try{return new Response(await sitemapXml(),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});}catch{return new Response('Sitemap temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}});}}
