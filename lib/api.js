const base = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://husba-beads-api.husainsathi13.workers.dev').replace(/\/$/, '');
export const instagram = 'https://www.instagram.com/husba.beads/';
export const fallback = '/assets/media/products/pearl-glow-hero.webp';
export const money = p => !p?.show_price ? 'Enquire for price' : p?.price_label || (p?.price_minor != null ? new Intl.NumberFormat('en-IN', {style:'currency', currency:p.currency || 'INR', maximumFractionDigits:0}).format(Number(p.price_minor)/100) : 'Enquire for price');
export const media = p => {
  const url = p?.primary_image_url || p?.media?.find(m => m.media_type === 'image')?.url || '';
  return safeMedia(url) || fallback;
};
export function safeMedia(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && (u.hostname === 'res.cloudinary.com' || u.hostname.endsWith('.cloudinary.com')) ? u.href : ''; } catch { return value?.startsWith('/assets/media/') ? value : ''; }
}
export function optimizedImage(value,width=800){const url=safeMedia(value);if(!url)return fallback;if(!url.includes('/image/upload/'))return url;return url.replace('/image/upload/',`/image/upload/f_auto,q_auto,w_${Math.min(1800,Math.max(120,Number(width)||800))}/`)}
export function safeLink(value,fallback='/collections/') {
  if(!value)return fallback;
  if(value.startsWith('/')&&!value.startsWith('//'))return value;
  try { const u=new URL(value); return u.protocol==='https:'?u.href:fallback } catch { return fallback }
}
export const whatsApp = (number, text) => `https://wa.me/${String(number || '919326840719').replace(/\D/g,'')}?text=${encodeURIComponent(text)}`;
export async function request(path, {signal, ...options}={}) {
  const response = await fetch(base + path, {credentials:'include', cache:'no-store', signal, ...options});
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Service unavailable (${response.status})`);
  return body;
}
export async function allProducts(signal) {
  const products=[]; let offset=0; let categories=[];
  for (let page=0; page<100; page++) {
    const result=await request(`/api/products?limit=100&offset=${offset}`, {signal});
    const rows=result.products || []; categories=result.categories || categories;
    if (rows.some(p=>products.some(old=>old.id===p.id))) throw new Error('Catalogue page repeated. Please retry.');
    products.push(...rows); offset+=rows.length;
    if (!rows.length || offset>=Number(result.total ?? products.length)) return {products,categories};
  }
  throw new Error('Catalogue is larger than the safe page limit.');
}
