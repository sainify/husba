import {readFile,writeFile} from 'node:fs/promises';
const template=await readFile('public/config.template.js','utf8');
const base=process.env.NEXT_PUBLIC_API_BASE_URL||process.env.API_BASE_URL||'https://husba-beads-api.husainsathi13.workers.dev';
const site=process.env.NEXT_PUBLIC_SITE_URL||'https://husba.pages.dev';
await writeFile('public/config.js',template.replace('__API_BASE_URL__',JSON.stringify(base)).replace('__TURNSTILE_SITE_KEY__',JSON.stringify(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY||process.env.TURNSTILE_SITE_KEY||'')).replace('__SITE_URL__',JSON.stringify(site)).replace('__DEMO_MODE__','false'));
await writeFile('public/_headers',(await readFile('public/_headers.template','utf8')).replace('__API_CONNECT_SRC__',base));
