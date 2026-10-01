// Progressive enhancements for the existing authenticated admin.
export function setupLuxuryAdmin(ctx) {
  const {state,api,renderAll,openForm,showView,toast,productPayloadFromItem}=ctx;
  const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button=(text,action)=>`<button type="button" class="button button--ghost button--small" data-luxe="${action}">${text}</button>`;
  const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='res.cloudinary.com'||u.hostname.endsWith('.cloudinary.com'))?u.href:'';}catch{return '';}};
  let busy=false, selected=new Set(), boardMode=false;
  const resourceDialog=document.querySelector('[data-resource-dialog]');
  const sidebar=document.querySelector('[data-admin-sidebar]');let menuFocus=null;
  new MutationObserver(()=>{const open=sidebar.classList.contains('is-open');document.body.classList.toggle('luxe-menu-open',open);document.querySelectorAll('[data-admin-menu]').forEach(b=>b.setAttribute('aria-expanded',String(open)));document.querySelector('.admin-main').inert=open;document.querySelector('.admin-bottom-nav').inert=open;if(open){menuFocus=document.activeElement;sidebar.querySelector('[data-view-button]').focus();}else if(menuFocus?.isConnected){menuFocus.focus();menuFocus=null;}}).observe(sidebar,{attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',ev=>{if(!sidebar.classList.contains('is-open'))return;if(ev.key==='Escape'){sidebar.classList.remove('is-open');document.querySelector('[data-admin-sidebar-scrim]').hidden=true;}if(ev.key==='Tab'){const items=[...sidebar.querySelectorAll('button,a')].filter(el=>el.getClientRects().length);if(!items.length)return;const first=items[0],last=items.at(-1);if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}});

  const toolbar=document.createElement('div');toolbar.className='luxe-toolbar';
  toolbar.innerHTML=button('Select visible','select')+button('Publish selected','publish')+button('Hide selected','hide')+button('Delete selected','bulk-delete')+button('Table / cards','layout')+'<span data-selection-count role="status">0 selected</span>';
  document.querySelector('[data-products-table]').before(toolbar);
  const enquiryTools=document.createElement('div');enquiryTools.className='luxe-toolbar';enquiryTools.innerHTML=button('Board / table','board')+button('Export CSV','csv');document.querySelector('[data-enquiries-table]').before(enquiryTools);enquiryTools.insertAdjacentHTML('beforeend','<label>From <input type="date" data-enquiry-from></label><label>To <input type="date" data-enquiry-to></label>');enquiryTools.querySelectorAll('input').forEach(input=>input.onchange=()=>renderAll());
  const board=document.createElement('div');board.className='luxe-board';board.hidden=true;document.querySelector('[data-enquiries-table]').after(board);
  const top=document.querySelector('.admin-topbar__actions:last-child');top.insertAdjacentHTML('afterbegin',button('Search ⌘K','search')+button('Enquiries','notifications'));
  document.querySelector('.admin-sidebar').insertAdjacentHTML('afterbegin',button('← Collapse','collapse'));
  document.querySelector('[data-luxe=collapse]').setAttribute('aria-expanded','true');
  document.querySelectorAll('.admin-sidebar [data-view-button]').forEach(b=>{const label=b.textContent.trim();b.title=label;b.setAttribute('aria-label',label);for(const node of [...b.childNodes])if(node.nodeType===3&&node.textContent.trim()){const span=document.createElement('span');span.className='luxe-nav-label';span.textContent=node.textContent;node.replaceWith(span);}});
  const account=document.createElement('details');account.className='luxe-account';account.innerHTML='<summary aria-label="Workspace account">HB</summary><div><strong>HUSBA workspace</strong><a href="/" target="_blank" rel="noopener">View website ↗</a><button type="button" data-luxe-signout>Sign out</button></div>';top.append(account);account.querySelector('button').onclick=()=>document.querySelector('[data-logout]').click();
  const palette=document.createElement('dialog');palette.className='luxe-command';palette.setAttribute('aria-label','Search workspace');palette.innerHTML='<div class="dialog-head"><h2>Find something</h2><button type="button" data-command-close aria-label="Close search">×</button></div><input type="search" aria-label="Search pages and products" placeholder="Pages, products, customers…"><div data-command-results></div>';document.body.append(palette);
  palette.querySelector('[data-command-close]').onclick=()=>palette.close();
  const commands=()=>{
    const q=palette.querySelector('input').value.toLowerCase();
    const routes=['dashboard','products','categories','videos','enquiries','content'].map(name=>({label:name,route:name}));
    const items=[...routes,...state.products.map(p=>({label:p.name,type:'product',id:p.id})),...state.enquiries.map(p=>({label:p.name+' · '+p.reference,type:'enquiry',id:p.id}))].filter(p=>p.label.toLowerCase().includes(q)).slice(0,30);
    const target=palette.querySelector('[data-command-results]');target.replaceChildren();
    items.forEach(item=>{const b=document.createElement('button');b.type='button';b.textContent=item.label;b.onclick=()=>{palette.close();if(item.route)showView(item.route);else openForm(item.type,state[item.type==='product'?'products':'enquiries'].find(p=>p.id===item.id));};target.append(b);});
  };
  palette.querySelector('input').oninput=commands;
  const openSearch=()=>{commands();palette.showModal();palette.querySelector('input').focus();};
  window.addEventListener('keydown',ev=>{if((ev.metaKey||ev.ctrlKey)&&ev.key.toLowerCase()==='k'&&!resourceDialog.open&&!document.querySelector('[data-access-screen]:not([hidden])')){ev.preventDefault();openSearch();}});
  async function action(work){if(busy)return;busy=true;toolbar.querySelectorAll('button').forEach(b=>b.disabled=true);try{await work();await ctx.reload();toast('Changes saved.');}catch(err){toast(err.message,'error');await ctx.reload();}finally{busy=false;toolbar.querySelectorAll('button').forEach(b=>b.disabled=false);}}
  const saveProduct=(p,changes)=>api.admin('/products/'+encodeURIComponent(p.id),{method:'PUT',body:JSON.stringify(productPayloadFromItem(p,changes))});
  const countSelection=()=>toolbar.querySelector('[data-selection-count]').textContent=`${selected.size} selected`;
  async function moveProduct(id,direction){const items=[...state.products].sort((a,b)=>Number(b.is_featured)-Number(a.is_featured)||a.sort_order-b.sort_order);const index=items.findIndex(p=>p.id===id),to=index+direction;if(to<0||to>=items.length||items[index].is_featured!==items[to].is_featured){toast('Reorder within the same featured group.','error');return;}[items[index],items[to]]=[items[to],items[index]];await action(async()=>{for(let i=0;i<items.length;i++)await saveProduct(items[i],{sort_order:i});});}
  const boardRender=()=>{
    if(!boardMode)return;
    const q=(document.querySelector('[data-admin-search="enquiries"]')?.value||'').toLowerCase();
    const status=document.querySelector('[data-enquiry-filter]')?.value||'';
    board.innerHTML=['new','contacted','closed'].map(col=>{const items=state.enquiries.filter(p=>p.status===col&&(!status||status===col)&&(!document.querySelector('[data-enquiry-from]').value||p.created_at.slice(0,10)>=document.querySelector('[data-enquiry-from]').value)&&(!document.querySelector('[data-enquiry-to]').value||p.created_at.slice(0,10)<=document.querySelector('[data-enquiry-to]').value)&&`${p.name} ${p.phone} ${p.reference} ${p.product_name}`.toLowerCase().includes(q));return `<section><h3>${e(col)} <small>${items.length}</small></h3>${items.map(p=>`<article><small>${e(p.reference)}</small><h4>${e(p.name)}</h4><p>${e(p.product_name||p.enquiry_type)}</p><a href="tel:${e(String(p.phone).replace(/[^+\d]/g,''))}">${e(p.phone)}</a><p>${e(p.admin_notes||'No notes yet')}</p><select aria-label="Status for ${e(p.reference)}" data-board-status="${e(p.id)}">${['new','contacted','closed'].map(s=>`<option ${s===col?'selected':''}>${s}</option>`).join('')}</select><button type="button" data-edit="enquiry" data-id="${e(p.id)}">Open details ↗</button></article>`).join('')||'<p>No enquiries here yet.</p>'}</section>`;}).join('');
  };
  board.onchange=ev=>{const id=ev.target.dataset.boardStatus;if(!id)return;const p=state.enquiries.find(p=>p.id===id);action(()=>api.admin('/enquiries/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({status:ev.target.value,admin_notes:p.admin_notes})}));};
  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-luxe]');if(!b)return;
    const a=b.dataset.luxe;
    if(a==='search')openSearch();
    if(a==='notifications')showView('enquiries');
    if(a==='collapse'){const collapsed=document.body.classList.toggle('luxe-collapsed');b.setAttribute('aria-expanded',String(!collapsed));b.textContent=collapsed?'→':'← Collapse';b.title=collapsed?'Expand sidebar':'Collapse sidebar';}
    if(a==='layout')document.querySelector('[data-products-table]').classList.toggle('luxe-cards');
    if(a==='select'){const boxes=[...document.querySelectorAll('[data-product-select]')];const checked=boxes.some(x=>!x.checked);boxes.forEach(x=>{x.checked=checked;checked?selected.add(x.value):selected.delete(x.value);});countSelection();}
    if(a==='publish'||a==='hide'){if(!selected.size){toast('Select products first.','error');return;}action(async()=>{for(const p of state.products.filter(p=>selected.has(p.id)))await saveProduct(p,{is_active:a==='publish'});selected.clear();countSelection();});}
    if(a==='bulk-delete'){if(!selected.size)return;if(!confirm('Delete '+selected.size+' selected products? You will have 8 seconds to undo.'))return;const ids=[...selected];action(async()=>{if(!await offerUndo(ids.length+' products'))return;for(const id of ids)await api.admin('/products/'+encodeURIComponent(id),{method:'DELETE'});selected.clear();countSelection();});}
    if(a==='board'){boardMode=!boardMode;board.hidden=!boardMode;document.querySelector('[data-enquiries-table]').hidden=boardMode;boardRender();}
    if(a==='csv'){
      const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
      const keys=['reference','name','phone','product_name','status','admin_notes','created_at'];
      const csv='\ufeff'+[keys,...state.enquiries.map(p=>keys.map(k=>p[k]))].map(row=>row.map(cell).join(',')).join('\r\n');
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='husba-enquiries.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  });
  function augmentProducts(){
    document.querySelectorAll('[data-products-table] tbody tr').forEach(row=>{
      const id=row.querySelector('[data-edit="product"]')?.dataset.id;if(!id||row.dataset.luxeReady)return;row.dataset.luxeReady='true';row.dataset.productId=id;
      const label=document.createElement('label');label.className='luxe-select';label.innerHTML=`<input type="checkbox" data-product-select value="${e(id)}" ${selected.has(id)?'checked':''}> Select`;
      label.querySelector('input').onchange=ev=>{ev.target.checked?selected.add(id):selected.delete(id);countSelection();};row.cells[0].prepend(label);
      const actions=document.createElement('div');actions.className='luxe-row-actions';
      for(const [text,delta] of [['↑',-1],['↓',1]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',delta<0?'Move product earlier':'Move product later');b.onclick=()=>moveProduct(id,delta);actions.append(b);}
      const duplicate=document.createElement('button');duplicate.type='button';duplicate.textContent='Duplicate';duplicate.onclick=()=>{const p=state.products.find(p=>p.id===id);openForm('product',{...p,id:null,name:p.name+' copy',slug:'',product_code:'',is_active:false});};actions.append(duplicate);row.cells[row.cells.length-1].append(actions);
      row.draggable=true;row.ondragstart=ev=>ev.dataTransfer.setData('text/husba-product',id);row.ondragover=ev=>ev.preventDefault();row.ondrop=ev=>{ev.preventDefault();const from=ev.dataTransfer.getData('text/husba-product');const items=[...state.products];const a=items.findIndex(p=>p.id===from),b=items.findIndex(p=>p.id===id);if(a<0||a===b)return;if(items[a].is_featured!==items[b].is_featured){toast('Keep featured and regular ordering separate.','error');return;}const [p]=items.splice(a,1);items.splice(b,0,p);action(async()=>{for(let i=0;i<items.length;i++)await saveProduct(items[i],{sort_order:i});});};
    });
  }
  new MutationObserver(augmentProducts).observe(document.querySelector('[data-products-table]'),{childList:true});
  new MutationObserver(boardRender).observe(document.querySelector('[data-enquiries-table]'),{childList:true});
  function enhanceEditor(){
    const fields=document.querySelector('[data-dialog-fields]');const form=document.querySelector('[data-resource-form]');
    if(fields._seoInput)fields.removeEventListener('input',fields._seoInput);
    if(form._tabInvalid){form.removeEventListener('invalid',form._tabInvalid,true);form._tabInvalid=null;}
    resourceDialog.classList.toggle('luxe-drawer',form.dataset.resource==='product');
    fields.querySelectorAll('input,textarea,select').forEach((input,i)=>{input.id='resource-'+i;const label=input.closest('.field')?.querySelector('label');if(label)label.htmlFor=input.id;});
    document.querySelector('.luxe-editor-tabs')?.remove();
    if(form.dataset.resource==='enquiry'){
      const item=state.enquiries.find(p=>p.id===form.dataset.id);if(!item)return;
      const replies=document.createElement('div');replies.className='luxe-replies field--full';
      for(const text of [`Hello ${item.name}, thank you for your HUSBA Beads enquiry (${item.reference}). How can we help?`,`Hello ${item.name}, following up on your enquiry for ${item.product_name||'a custom piece'} (${item.reference}). Would you like to discuss the details?`]){const a=document.createElement('a');a.className='button button--ghost';a.textContent=replies.children.length?'Follow-up reply':'Welcome reply';a.href='https://wa.me/'+String(item.phone).replace(/\D/g,'')+'?text='+encodeURIComponent(text);a.target='_blank';a.rel='noopener';replies.append(a);}fields.append(replies);return;
    }
    if(form.dataset.resource!=='product')return;
    resourceDialog.classList.add('luxe-drawer');
    const tabs=document.createElement('div');tabs.className='luxe-editor-tabs';tabs.setAttribute('role','tablist');
    const groups=['Details','Media','Pricing','SEO'];
    const groupFor=input=>input.name==='slug'?'SEO':/image_url|product_video/.test(input.name)?'Media':/^(price|price_label|show_price)$/.test(input.name)?'Pricing':'Details';
    const nodes=[...fields.children];nodes.forEach(n=>{const input=n.querySelector('input,textarea,select');n.dataset.tab=input?groupFor(input):'Details';});
    const seo=document.createElement('div');seo.className='field--full luxe-seo';seo.dataset.tab='SEO';seo.innerHTML='<h3>Search preview</h3><p data-seo-title></p><small data-seo-url></small><p data-seo-copy></p><small>Uses your product name, description and existing URL. Changing a saved slug changes its link.</small>';fields.append(seo);
    const setTab=name=>{[...fields.children].forEach(n=>n.hidden=n.dataset.tab!==name);tabs.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-selected',String(b.textContent===name));b.tabIndex=b.textContent===name?0:-1;});};
    groups.forEach(name=>{const b=document.createElement('button');b.type='button';b.role='tab';b.textContent=name;b.onclick=()=>setTab(name);b.onkeydown=ev=>{if(!['ArrowLeft','ArrowRight'].includes(ev.key))return;ev.preventDefault();const next=(groups.indexOf(name)+(ev.key==='ArrowRight'?1:3))%4;setTab(groups[next]);tabs.children[next].focus();};tabs.append(b);});fields.before(tabs);setTab('Details');
    if(form._tabInvalid)form.removeEventListener('invalid',form._tabInvalid,true);form._tabInvalid=ev=>setTab(groupFor(ev.target));form.addEventListener('invalid',form._tabInvalid,true);
    const syncSeo=()=>{seo.querySelector('[data-seo-title]').textContent=form.elements.name.value+' · HUSBA Beads';seo.querySelector('[data-seo-url]').textContent='/product/?slug='+form.elements.slug.value;seo.querySelector('[data-seo-copy]').textContent=form.elements.description.value.slice(0,160);};fields._seoInput=syncSeo;fields.addEventListener('input',syncSeo);syncSeo();
    fields.querySelectorAll('input[name=name],textarea[name=description]').forEach(input=>{const counter=document.createElement('small');counter.className='luxe-character-count';const update=()=>counter.textContent=input.value.length+' characters';input.addEventListener('input',update);input.after(counter);update();});
    const slug=form.elements.slug,name=form.elements.name;let manualSlug=!!slug.value;slug.addEventListener('input',()=>manualSlug=true);name.addEventListener('input',()=>{if(form.dataset.id||manualSlug)return;slug.value=name.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,140);syncSeo();});
    const images=[...fields.querySelectorAll('input[name^="image_url_"]')];
    const reorder=(from,to)=>{const values=images.map(i=>i.value);const [v]=values.splice(from,1);values.splice(to,0,v);images.forEach((input,i)=>{input.value=values[i];input.dispatchEvent(new Event('input',{bubbles:true}));});};
    images.forEach((input,i)=>{const row=input.closest('.field');row.draggable=true;row.ondragstart=ev=>ev.dataTransfer.setData('text/husba-media',String(i));row.ondragover=ev=>ev.preventDefault();row.ondrop=ev=>{ev.preventDefault();const n=ev.dataTransfer.getData('text/husba-media');if(n!=='')reorder(Number(n),i);};const controls=document.createElement('div');controls.className='luxe-row-actions';for(const [label,to] of [['Move earlier',i-1],['Move later',i+1]]){if(to<0||to>=images.length)continue;const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>reorder(i,to);controls.append(b);}row.append(controls);});
    fields.querySelectorAll('input[name*="url"]').forEach(input=>input.addEventListener('input',()=>input.setCustomValidity(input.value&&!safe(input.value)?'Use an HTTPS Cloudinary delivery URL.':'')));
  }
  // openForm supplies fresh fields on every opening; enhance only after showModal.
  new MutationObserver(()=>{if(resourceDialog.open)enhanceEditor();}).observe(resourceDialog,{attributes:true,attributeFilter:['open']});
  const contentForm=document.querySelector('[data-settings-form]');
  contentForm.addEventListener('input',()=>contentForm.dataset.dirty='true');
  contentForm.addEventListener('change',()=>contentForm.dataset.dirty='true');
  contentForm.querySelectorAll('input,textarea,select').forEach((input,i)=>{if(!input.id)input.id='content-'+i;const label=input.closest('.field')?.querySelector('label');if(label)label.htmlFor=input.id;});
  // Move the existing Save control outside collapsed groups; fields and names stay intact.
  const save=contentForm.querySelector('[type=submit]').closest('.field');save.classList.add('luxe-save-bar');contentForm.append(save);
  contentForm.querySelectorAll('fieldset.content-settings-card').forEach((fieldset,i)=>{const legend=fieldset.querySelector('legend');const detail=document.createElement('details');detail.className='luxe-content-group';detail.open=i===0;const summary=document.createElement('summary');summary.textContent=legend.textContent;detail.append(summary);legend.hidden=true;fieldset.before(detail);detail.append(fieldset);});
  contentForm.addEventListener('invalid',ev=>{const group=ev.target.closest('details');if(group)group.open=true;},true);
  // Paste and drag Cloudinary delivery URLs; direct file uploads require your upload configuration.
  document.addEventListener('dragover',ev=>{if(ev.target.matches('input[name*=url]'))ev.preventDefault();});
  document.addEventListener('drop',ev=>{const input=ev.target;if(!input.matches('input[name*=url]'))return;ev.preventDefault();const value=ev.dataTransfer.getData('text/uri-list').split('\n').find(s=>!s.startsWith('#'))||ev.dataTransfer.getData('text/plain');if(!safe(value)){toast('Paste an HTTPS Cloudinary delivery URL. File uploads need an upload preset.','error');return;}input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));});
  contentForm.querySelectorAll('input[name*=image_url],input[name*=video_url]').forEach(input=>{const image=document.createElement(input.name.includes('video')?'video':'img');image.className='luxe-content-media';if(image.tagName==='IMG')image.alt='Unsaved media preview';else{image.controls=true;image.preload='none';image.playsInline=true;}image.hidden=true;input.after(image);const update=()=>{const url=safe(input.value);input.setCustomValidity(input.value&&!url?'Use an HTTPS Cloudinary delivery URL.':'');image.hidden=!url;if(url)image.src=url;else image.removeAttribute('src');};input.addEventListener('input',update);});
  document.addEventListener('error',ev=>{const img=ev.target;if(img.tagName!=='IMG'||!img.closest('[data-products-table]'))return;img.alt='Image unavailable';img.classList.add('luxe-image-error');img.title='Image unavailable — check the Cloudinary URL in Media.';},true);

  const preview=document.createElement('section');preview.className='luxe-content-preview';preview.innerHTML='<small>Live content preview · unsaved changes</small><div data-preview-announcement></div><h2></h2><p></p><span class="button"></span><div class="luxe-preview-sections"></div>';contentForm.before(preview);
  const syncPreview=()=>{const data=new FormData(contentForm);preview.querySelector('h2').textContent=data.get('hero_title')||'Not just a piece. A little part of you.';preview.querySelector('p').textContent=data.get('hero_copy')||'';preview.querySelector('.button').textContent=data.get('hero_cta_text')||'Explore the collection';const url=safe(data.get('hero_image_url'));preview.style.backgroundImage=url?`linear-gradient(#fff9,#fff9),url("${url}")`:'';};contentForm.addEventListener('input',syncPreview);
  const syncContentPreview=()=>{syncPreview();const d=new FormData(contentForm);preview.querySelector('[data-preview-announcement]').textContent=['announcement_1','announcement_2','announcement_3'].map(k=>d.get(k)).filter(Boolean).join(' · ');preview.querySelector('.luxe-preview-sections').innerHTML=['featured','video','categories','enquiry'].map(k=>`<section><small>${e(d.get(k+'_eyebrow'))}</small><h3>${e(d.get(k+'_title'))}</h3><p>${e(d.get(k+'_copy'))}</p></section>`).join('')+`<footer>${e(d.get('footer_description'))}<br>${e(d.get('email'))} · ${e(d.get('location'))}</footer>`;};contentForm.addEventListener('input',syncContentPreview);
  const pw=document.querySelector('[data-login-form] input[type="password"]');if(pw){const b=document.createElement('button');b.type='button';b.className='luxe-password';b.textContent='Show password';b.onclick=()=>{pw.type=pw.type==='password'?'text':'password';b.textContent=pw.type==='password'?'Show password':'Hide password';};pw.after(b);}
  const stats=document.querySelector('[data-stats]');new MutationObserver(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;stats.querySelectorAll('strong').forEach(el=>{const goal=Number(el.textContent);if(!Number.isFinite(goal))return;const start=performance.now();function frame(t){const progress=Math.min(1,(t-start)/400);el.textContent=String(Math.round(goal*progress));if(progress<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);});}).observe(stats,{childList:true});
  const original=ctx.onRender;ctx.onRender=()=>{original?.();augmentProducts();boardRender();syncPreview();};
  const insights=document.createElement('section');insights.className='admin-panel luxe-insights';document.querySelector('[data-stats]').after(insights);
  function renderInsights(){
    const hour=new Date().getHours();const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
    const days=Array.from({length:7},(_,i)=>{const date=new Date();date.setDate(date.getDate()-6+i);const key=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');return {label:date.toLocaleDateString('en-IN',{weekday:'short'}),count:state.enquiries.filter(p=>p.created_at.slice(0,10)===key).length};});
    const max=Math.max(1,...days.map(d=>d.count));const popular=new Map();state.enquiries.forEach(p=>{if(p.product_name)popular.set(p.product_name,(popular.get(p.product_name)||0)+1);});
    insights.innerHTML=`<h2>${greeting}, HUSBA.</h2><p>Your last seven days of enquiries</p><div class="luxe-chart">${days.map(d=>`<div><span>${d.count}</span><i style="height:${Math.max(3,d.count/max*90)}px"></i><small>${d.label}</small></div>`).join('')}</div><h3>Most enquired pieces</h3>${[...popular].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([name,count])=>`<p>${e(name)} <strong>${count}</strong></p>`).join('')||'<p>Product enquiries will appear here.</p>'}<small>Based on loaded enquiry records; no visitor tracking is enabled.</small>`;
  }
  for(const [type,plural,selector] of [['category','categories','[data-categories-table]'],['video','videos','[data-videos-table]']]){
    const target=document.querySelector(selector);if(!target)continue;
    const enhance=()=>target.querySelectorAll('tbody tr').forEach(row=>{const id=row.querySelector(`[data-edit="${type}"]`)?.dataset.id;if(!id||row.dataset.luxeReady)return;row.dataset.luxeReady='true';
      const item=state[plural].find(p=>p.id===id);if(!item)return;
      row.draggable=true;row.ondragstart=ev=>ev.dataTransfer.setData('text/husba-'+type,id);row.ondragover=ev=>ev.preventDefault();row.ondrop=ev=>{ev.preventDefault();const from=ev.dataTransfer.getData('text/husba-'+type);const list=[...state[plural]].sort((a,b)=>a.sort_order-b.sort_order),a=list.findIndex(p=>p.id===from),b=list.findIndex(p=>p.id===id);if(a<0||a===b)return;const [item]=list.splice(a,1);list.splice(b,0,item);action(async()=>{for(let i=0;i<list.length;i++)await api.admin('/'+plural+'/'+encodeURIComponent(list[i].id),{method:'PUT',body:JSON.stringify({...list[i],sort_order:i})});});};

      if(type==='category'){const count=document.createElement('small');count.textContent=state.products.filter(p=>p.category_id===id).length+' products';row.cells[0].append(count);}
      const controls=document.createElement('div');controls.className='luxe-row-actions';
      for(const [label,delta] of [['↑',-1],['↓',1]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label','Move '+type+(delta<0?' earlier':' later'));b.onclick=()=>{const list=[...state[plural]].sort((a,b)=>a.sort_order-b.sort_order);const i=list.findIndex(p=>p.id===id),j=i+delta;if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];action(async()=>{for(let n=0;n<list.length;n++)await api.admin('/'+plural+'/'+encodeURIComponent(list[n].id),{method:'PUT',body:JSON.stringify({...list[n],sort_order:n})});});};controls.append(b);}row.cells[row.cells.length-1].append(controls);
      if(type==='video'&&safe(item.video_url)){const video=document.createElement('video');video.src=safe(item.video_url);video.poster=safe(item.poster_url);video.controls=true;video.preload='none';video.playsInline=true;video.className='luxe-film-preview';row.cells[0].append(video);}
    });new MutationObserver(enhance).observe(target,{childList:true});
  }
  return {refresh:()=>{selected=new Set([...selected].filter(id=>state.products.some(p=>p.id===id)));countSelection();augmentProducts();boardRender();syncContentPreview();renderInsights();const count=state.enquiries.filter(p=>p.status==='new').length;document.querySelector('[data-luxe=notifications]').textContent='Enquiries'+(count?' · '+count:'');}};
}

export function offerUndo(label) {
  return new Promise(resolve=>{
    const bar=document.createElement('div');bar.className='luxe-undo';bar.setAttribute('role','status');bar.append(document.createTextNode(label+' will be deleted in 8 seconds. '));
    const button=document.createElement('button');button.type='button';button.textContent='Undo';bar.append(button);document.body.append(bar);
    const timer=setTimeout(()=>{bar.remove();resolve(true);},8000);
    button.onclick=()=>{clearTimeout(timer);bar.remove();resolve(false);};
  });
}
