const CACHE='travel-photo-os-mobile-ux-v16';
const APP=['./','./index.html','./workspace.html','./app-base.html','./mobile-ux.css','./mobile-ux.js','./workspace-windows.css','./workspace-windows.js','./simple-collab.css','./simple-collab.js','./cloud-config.js','./home-cloud-fix.js','./cloud-sync.js','./premium-ux.css','./premium-ux.js','./day-experience.css','./day-experience.js','./photo-experience.css','./photo-experience.js','./photo-hook.js','./voyage-experience.css','./voyage-experience.js','./voyage-time-fix.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin===location.origin){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
  }
});