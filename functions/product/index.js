import {readPublic,productMetadata} from '../../server/catalogue-seo.js';
export async function onRequestGet(context){
 const slug=new URL(context.request.url).searchParams.get('slug');
 if(!slug)return context.next();
 try{
  const data=await readPublic('/products/'+encodeURIComponent(slug));const meta=productMetadata(data.product);
  const response=await context.next();
  const transformed=new HTMLRewriter().on('title',{element(el){el.setInnerContent(meta.title);}})
   .on('meta[name="description"]',{element(el){el.setAttribute('content',meta.description);}})
   .on('meta[property^="og:"],link[rel="canonical"],script[data-product-schema]',{element(el){el.remove();}})
   .on('head',{element(el){el.append(meta.tags,{html:true});}}).transform(response);
  const result=new Response(transformed.body,transformed);result.headers.set('Cache-Control','no-store');return result;
 }catch(error){const status=error.status===404?404:503;return new Response(status===404?'This piece is unavailable. Explore the collection at /collections/.':'The collection is temporarily unavailable. Please try again.',{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});}
}
