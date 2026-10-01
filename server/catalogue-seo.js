// Public catalogue only. No admin credentials or D1 binding are used here.
export const SITE='https://husba.pages.dev';
export const API='https://husba-beads-api.husainsathi13.workers.dev';
export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicMedia(value){try{const url=new URL(value,SITE);return url.protocol==='https:'&&(url.origin===SITE||url.hostname==='res.cloudinary.com'||url.hostname.endsWith('.cloudinary.com'))?url.href:'';}catch{return '';}}
export async function readPublic(path,fetcher=fetch){const response=await fetcher(API+'/api'+path,{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok){const error=new Error('Catalogue unavailable');error.status=response.status;throw error;}return response.json();}
export function productMetadata(product){
 if(!product||![true,1,'1'].includes(product.is_active))throw Object.assign(new Error('Piece not found'),{status:404});
 const url=SITE+'/product/?slug='+encodeURIComponent(product.slug),title=product.name+' · HUSBA Beads';
 const description=product.description||'A handmade piece from HUSBA Beads. Made with care in Mumbai.';
 const images=(product.media||[]).filter(m=>m.media_type==='image').map(m=>publicMedia(m.url)).filter(Boolean);
 const image=images[0]||SITE+'/assets/media/brand/image-unavailable.svg';
 const schema={'@context':'https://schema.org','@type':'Product',name:product.name,description,image:images,sku:product.product_code||undefined,brand:{'@type':'Brand',name:'HUSBA Beads'}};
 if([true,1,'1'].includes(product.show_price)&&product.price_minor!=null&&Number.isFinite(Number(product.price_minor)))schema.offers={'@type':'Offer',price:Number(product.price_minor)/100,priceCurrency:product.currency||'INR',availability:'https://schema.org/'+(product.status==='sold_out'?'OutOfStock':product.status==='made_to_order'?'PreOrder':'InStock'),url};
 const tags='<link rel="canonical" href="'+escape(url)+'">'+Object.entries({'og:title':title,'og:description':description,'og:image':image,'og:url':url,'og:type':'product','twitter:card':'summary_large_image'}).map(([key,value])=>`<meta property="${key}" content="${escape(value)}">`).join('')+'<script type="application/ld+json" data-product-schema>'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>';
 return {title,description,tags};
}
export async function sitemapXml(fetcher=fetch){
 const urls=['/','/collections/','/videos/','/story/','/about/','/contact/','/privacy/','/terms/'];const ids=new Set();let offset=0;
 for(;;){const data=await readPublic('/products?limit=100&offset='+offset,fetcher);const rows=data.products||[];if(!rows.length&&offset<Number(data.total))throw new Error('Incomplete catalogue');for(const p of rows){if(ids.has(p.id))throw new Error('Repeated catalogue page');ids.add(p.id);if([true,1,'1'].includes(p.is_active))urls.push('/product/?slug='+encodeURIComponent(p.slug));}offset+=rows.length;if(!rows.length||offset>=Number(data.total))break;if(offset>100000)throw new Error('Catalogue requires a sitemap index');}
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(path=>'<url><loc>'+escape(SITE+path)+'</loc></url>').join('')+'</urlset>';
}
