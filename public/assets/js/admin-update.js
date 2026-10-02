export async function setupUpdates(isDirty) {
  if (!('serviceWorker' in navigator)) return;
  const registration=await navigator.serviceWorker.register('/admin/sw.js',{scope:'/admin/',updateViaCache:'none'});
  let accepted=false;
  const banner=document.createElement('aside');banner.className='luxe-update';banner.hidden=true;banner.setAttribute('role','status');banner.innerHTML='<span>A new HUSBA workspace is ready.</span><button type="button">Update now</button>';document.body.append(banner);
  const show=()=>{if(registration.waiting&&navigator.serviceWorker.controller)banner.hidden=false;};
  registration.addEventListener('updatefound',()=>{const installing=registration.installing;installing?.addEventListener('statechange',()=>{if(installing.state==='installed')show();});});show();
  banner.querySelector('button').onclick=()=>{if(isDirty()){alert('Save or close your current changes before updating.');return;}accepted=true;registration.waiting?.postMessage({type:'ACTIVATE_UPDATE'});};
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(accepted)location.reload();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)registration.update().catch(()=>{});});
  const check=document.querySelector('[data-clear-cache]');check.textContent='Check for updates';check.onclick=async()=>{try{await registration.update();show();if(banner.hidden)check.textContent='App is up to date';}catch{check.textContent='Offline — try again';}};
}
