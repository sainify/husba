/** Exact adapter for the existing HUSBA Worker. No demo fallback on failures. */
const CONFIG = window.HUSBA_CONFIG || {};
const API_BASE = String(CONFIG.API_BASE || '').replace(/\/$/, '');
export const config = { API_BASE, DEMO_MODE: false };
export const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeMedia = (value, fallback = '/assets/media/products/pearl-glow-hero.webp') => {
  const text = String(value || '').trim();
  if (text.startsWith('/') && !text.startsWith('//')) return text;
  try { const u = new URL(text); if (u.protocol === 'https:' && (u.hostname === 'res.cloudinary.com' || u.hostname.endsWith('.cloudinary.com'))) return u.href; } catch {}
  return fallback;
};
export const safeLink = (value, fallback = '/collections/') => {
  try { const u = new URL(value, location.origin); if (['https:','http:'].includes(u.protocol)) return u.href; } catch {}
  return fallback;
};
async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE}/api${path}`, { ...options, signal: controller.signal, credentials: 'omit', headers: {Accept:'application/json', ...(options.body ? {'Content-Type':'application/json'} : {}), ...options.headers} });
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
    if (!response.ok || !data) throw new Error(data?.error?.message || 'The website service is unavailable. Please try again.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The connection took too long. Please try again.');
    throw error;
  } finally { clearTimeout(timer); }
}
export function normalizeProduct(p) {
  const media = [...(p.media || [])].sort((a,b) => Number(a.sort_order || 0)-Number(b.sort_order || 0));
  const images = media.filter(m => m.media_type === 'image').map(m => safeMedia(m.url));
  if (!images.length) images.push(safeMedia(p.primary_image_url));
  const video = media.find(m => m.media_type === 'video');
  const shown = p.show_price === true || Number(p.show_price) === 1;
  const price = shown && p.price_minor != null ? Number(p.price_minor)/100 : null;
  const priceLabel = !shown ? 'Price on enquiry' : p.price_label || (price !== null ? new Intl.NumberFormat('en-IN',{style:'currency',currency:p.currency || 'INR'}).format(price) : 'Price on enquiry');
  return { id:p.id, slug:p.slug, name:p.name, code:p.product_code || '', price, priceLabel, status:p.status,
    statusLabel: {available:'Available',made_to_order:'Made to order',sold_out:'Currently unavailable'}[p.status] || 'Ask for availability',
    available:p.status === 'available', featured:!!p.is_featured, categoryId:p.category_id, categorySlug:p.category_slug,
    description:p.description || '', images, video:safeMedia(video?.url,''), poster:safeMedia(video?.poster_url,images[0]),
    facts:Object.fromEntries([['Materials',p.materials],['Colours',p.colors],['Size',p.sizes],['Product code',p.product_code]].filter(([,v])=>v)) };
}
let bootstrapPromise, productsPromise;
export function getBootstrap() {
  bootstrapPromise ||= request('/bootstrap').then(data => {
    let images = {}; try { images = JSON.parse(data.settings?.category_images || '{}') || {}; } catch {}
    return {settings:data.settings || {}, categories:(data.categories || []).map(c => ({id:c.id,slug:c.slug,name:c.name,image:safeMedia(images[c.slug])})), featured:(data.products || []).map(normalizeProduct), videos:(data.videos || []).map(normalizeVideo)};
  }).catch(e => {bootstrapPromise = null; throw e;});
  return bootstrapPromise;
}
async function allProducts() {
  const products = []; let offset = 0;
  while (true) {
    const data = await request(`/products?limit=100&offset=${offset}`);
    products.push(...(data.products || [])); offset = products.length;
    if (!data.products?.length || offset >= data.total || data.products.length < 100) break;
  }
  return products.map(normalizeProduct);
}
export async function getProducts({category, search, availableOnly} = {}) {
  productsPromise ||= allProducts().catch(e => {productsPromise = null; throw e;});
  let list = [...await productsPromise];
  if (category) list = list.filter(p => String(p.categoryId) === String(category) || p.categorySlug === category);
  if (availableOnly) list = list.filter(p => p.available);
  if (search) { const q=search.trim().toLowerCase(); list=list.filter(p => `${p.name} ${p.code} ${p.description}`.toLowerCase().includes(q)); }
  return list;
}
export async function getProductBySlug(slug) { return normalizeProduct((await request(`/products/${encodeURIComponent(slug)}`)).product); }
function normalizeVideo(v) { return {id:v.id,url:safeMedia(v.video_url,''),poster:safeMedia(v.poster_url),caption:v.caption || v.title || '',productSlug:v.product_slug || null}; }
export async function getVideos() { return (await request('/videos')).videos.map(normalizeVideo); }
export async function submitEnquiry(payload) { return request('/enquiries',{method:'POST',body:JSON.stringify(payload)}); }
export async function whatsappNumber() { const {settings}=await getBootstrap(); return String(settings.whatsapp_number || '919004931823').replace(/\D/g,''); }
