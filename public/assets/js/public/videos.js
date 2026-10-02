import {getVideos} from './api.js';
import {reelHtml} from './cards.js';
import {refreshMedia} from './site.js';
const grid=document.querySelector('#videos-grid');
getVideos().then(videos=>{grid.innerHTML=videos.length?videos.map(reelHtml).join(''):'<p class="hb-empty">New films are on their way.</p>';refreshMedia();}).catch(()=>{grid.innerHTML='<p class="hb-error">Films are temporarily unavailable. Please try again.</p>';});
