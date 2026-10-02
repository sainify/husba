const base=(process.env.NEXT_PUBLIC_API_BASE_URL||'https://husba-beads-api.husainsathi13.workers.dev').replace(/\/$/,'');
const key='husba_admin_session';
let token='';
export function getToken(){if(token)return token;try{token=localStorage.getItem(key)||sessionStorage.getItem(key)||'';return token}catch{return ''}}
export function setToken(value){token=String(value||'');try{if(token){localStorage.setItem(key,token);sessionStorage.removeItem(key)}else{localStorage.removeItem(key);sessionStorage.removeItem(key)}}catch{};try{const req=indexedDB.open('husba_admin',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('session'))req.result.createObjectStore('session')};req.onsuccess=()=>{const db=req.result;db.transaction('session','readwrite').objectStore('session')[token?'put':'delete'](token||key,...(token?[key]:[]));}}catch{}}
export async function restoreToken(){if(getToken())return token;return new Promise(resolve=>{try{const req=indexedDB.open('husba_admin',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('session'))req.result.createObjectStore('session')};req.onsuccess=()=>{const result=req.result.transaction('session','readonly').objectStore('session').get(key);result.onsuccess=()=>{if(result.result)setToken(result.result);resolve(getToken())};result.onerror=()=>resolve('')};req.onerror=()=>resolve('')}catch{resolve('')}})}
export async function adminRequest(path,options={}){
 const {timeoutMs=20000,...requestOptions}=options;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 const headers={'Accept':'application/json',...(requestOptions.body?{'Content-Type':'application/json'}:{}),...(getToken()?{'Authorization':`Bearer ${getToken()}`}:{})};
 try{
  const response=await fetch(`${base}/api/admin${path}`,{...requestOptions,headers,credentials:'include',cache:'no-store',signal:controller.signal});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(body?.error?.message||'The service could not complete this request.');error.status=response.status;throw error}
  if(body.token)setToken(body.token);
  return body;
 }catch(error){
  if(controller.signal.aborted){const timedOut=new Error(requestOptions.method&&requestOptions.method!=='GET'?'The request took too long. It may have saved. Refresh and check before trying again.':'The workspace took too long to load. Please refresh and try again.');timedOut.code='TIMEOUT';throw timedOut}
  if(error instanceof TypeError)throw Error('The website service is temporarily unreachable. Please try again.');
  throw error;
 }finally{clearTimeout(timer)}
}
export const jsonBody=(value)=>JSON.stringify(value);
export async function fullWorkspace(){await restoreToken();const w=await adminRequest('/workspace');const products=[...(w.products||[])];while(products.length<Number(w.total||0)){const d=await adminRequest(`/products?include_inactive=1&limit=100&offset=${products.length}`);if(!d.products?.length||d.products.some(p=>products.some(old=>old.id===p.id)))throw Error('Incomplete product list. Please refresh.');products.push(...d.products)}return {...w,products}}
