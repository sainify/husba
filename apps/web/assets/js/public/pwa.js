if ('serviceWorker' in navigator && !location.pathname.startsWith('/admin')) {
  const box = document.createElement('section');
  box.className = 'hb-app-tools';
  box.setAttribute('aria-label', 'HUSBA app');
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = 'Install HUSBA app'; button.hidden = true;
  const message = document.createElement('p'); message.setAttribute('role', 'status');
  box.append(button, message); document.body.append(box);
  let installPrompt;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    if (!standalone()) button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    button.disabled = true;
    try { await installPrompt.prompt(); await installPrompt.userChoice; }
    finally { installPrompt = null; button.hidden = true; button.disabled = false; }
  });
  window.addEventListener('appinstalled', () => { button.hidden = true; message.textContent = ''; });
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !standalone()) {
    message.textContent = 'Install HUSBA: open in Safari, tap Share, then Add to Home Screen.';
  }
  let activated = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (activated) location.reload(); });
  navigator.serviceWorker.register('/sw.js', {scope: '/', updateViaCache: 'none'}).then(registration => {
    const offer = () => {
      if (!registration.waiting || box.querySelector('[data-app-update]')) return;
      const update = document.createElement('button'); update.type = 'button'; update.dataset.appUpdate = '';
      update.textContent = 'Update app';
      update.addEventListener('click', () => {
        if (document.querySelector('form') && !confirm('Updating reloads this page. Finish or copy any unsent enquiry before continuing. Update now?')) return;
        activated = true; registration.waiting?.postMessage({type: 'ACTIVATE_UPDATE'});
      });
      box.append(update);
    };
    offer(); registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offer(); });
    });
  }).catch(() => { message.textContent = 'App installation is currently unavailable. You can continue using the website.'; });
}
