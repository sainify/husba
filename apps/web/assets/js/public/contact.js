import {submitEnquiry,getProductBySlug,whatsappNumber} from './api.js';
import {updateWhatsApp} from './site.js';
const params=new URLSearchParams(location.search), slug=params.get('slug');
const form=document.querySelector('#enquiry-form'),status=document.querySelector('#form-status'),button=form.querySelector('[type=submit]');
const field=name=>form.elements.namedItem(name);
let product=null, busy=false, widget=null;
let productReady=Promise.resolve();
if(params.get('product')){field('product').value=params.get('product').slice(0,120);document.querySelector('#page-heading').textContent=`Enquire about “${field('product').value}”`;}
if(['custom','bulk'].includes(params.get('type')))field('enquiry_type').value=params.get('type');
if(slug)productReady=getProductBySlug(slug).then(p=>{
 product=p;field('product').value=p.name;field('product').readOnly=true;
 const wa=document.querySelector('#contact-whatsapp');wa.dataset.productName=p.name;wa.dataset.productUrl=`${location.origin}/product/?slug=${encodeURIComponent(p.slug)}`;
 updateWhatsApp();whatsappNumber().then(updateWhatsApp).catch(()=>{});
}).catch(()=>{status.dataset.state='error';status.textContent='We could not verify the selected piece. Please return to the product and try again.';});
const key=window.HUSBA_CONFIG?.TURNSTILE_SITE_KEY;
if(key){
 const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
 script.onload=()=>window.turnstile.ready(()=>{widget=window.turnstile.render('#turnstile',{sitekey:key,theme:'light'});});
 script.onerror=()=>{status.dataset.state='error';status.textContent='The security check could not load. Please refresh or use WhatsApp.';};document.head.append(script);
}
function error(input,message){const wrap=input.closest('.hb-field');wrap.dataset.invalid=String(!!message);input.setAttribute('aria-invalid',String(!!message));wrap.querySelector('.hb-field__error').textContent=message;}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 const name=field('name').value.trim(), phone=field('mobile').value.trim(),digits=phone.replace(/\D/g,'');
 error(field('name'),name.length<2?'Please enter at least 2 characters.':'');
 error(field('mobile'),digits.length<7||digits.length>15?'Please enter a valid mobile number.':'');
 if(name.length<2||digits.length<7||digits.length>15){form.querySelector('[aria-invalid=true]').focus();return;}
 busy=true;button.disabled=true;button.dataset.loading='true';button.textContent='Sending…';status.textContent='';
 try{
  await productReady;if(slug&&!product)throw new Error('Please reopen the selected product before sending this enquiry.');
  const token=key&&widget!==null?window.turnstile.getResponse(widget):'';
  if(key&&!token)throw new Error('Please complete the security check.');
  const result=await submitEnquiry({name,phone,product_id:product?.id||null,product_name:product?.name||field('product').value,enquiry_type:field('enquiry_type').value,quantity:1,city:'',message:[field('occasion').value.trim(),field('message').value.trim()].filter(Boolean).join('\n'),website:field('website').value,turnstile_token:token});
  status.dataset.state='success';status.textContent=result.message||'Thank you! Your enquiry has been received.';
  form.reset();if(product)field('product').value=product.name;
 }catch(err){status.dataset.state='error';status.textContent=err.message||'Please try again or contact us on WhatsApp.';}
 finally{busy=false;button.disabled=false;button.dataset.loading='false';button.textContent='Send enquiry';if(widget!==null)window.turnstile.reset(widget);}
});
