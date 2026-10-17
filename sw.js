const CACHE='travel-photo-os-mobile-ux-v21';
const RUNTIME='travel-photo-os-runtime-v1';
const MAP_CACHE='travel-photo-os-map-runtime-v1';
const APP=['./','./index.html','./workspace.html','./app-base.html','./mobile-ux.css','./mobile-ux.js','./workspace-windows.css','./workspace-windows.js','./simple-collab.css','./simple-collab.js','./cloud-config.js','./home-cloud-fix.js','./cloud-sync.js','./premium-ux.css','./premium-ux.js','./day-experience.css','./day-experience.js','./photo-experience.css','./photo-experience.js','./photo-hook.js','./voyage-experience.css','./voyage-experience.js','./voyage-time-fix.js','./booking-launcher.css','./booking-launcher.js','./booking-native.css','./booking-native.js','./desktop-voyage-fab.css','./desktop-voyage-fab.js','./offline-mode.css','./offline-mode.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const CORE_EXTERNAL=[
  'https://unpkg.com/maplibre-gl@5.0.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@5.0.1/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://tiles.openfreemap.org/styles/liberty'
];
const MAP_HOSTS=new Set(['tiles.openfreemap.org','s3.amazonaws.com','server.arcgisonline.com']);
const CORE_HOSTS=new Set(['unpkg.com','cdn.jsdelivr.net']);

function normalizedSameOrigin(request){
  const u=new URL(request.url);
  return new Request(u.origin+u.pathname,{method:'GET',headers:request.headers,mode:'same-origin',credentials:request.credentials,redirect:'follow'});
}
async function trim(cacheName,max){
  const c=await caches.open(cacheName),keys=await c.keys();
  if(keys.length<=max)return;
  await Promise.all(keys.slice(0,keys.length-max).map(k=>c.delete(k)));
}
async function cacheExternal(url){
  try{
    const req=new Request(url,{mode:'cors'}),res=await fetch(req);
    if(res&&res.ok){const c=await caches.open(RUNTIME);await c.put(req,res.clone())}
  }catch(e){}
}

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    await c.addAll(APP);
    await Promise.allSettled(CORE_EXTERNAL.map(cacheExternal));
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    await self.clients.claim();
    const keep=new Set([CACHE,RUNTIME,MAP_CACHE]);
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>!keep.has(k)).map(k=>caches.delete(k)));
  })());
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);

  if(url.origin===location.origin){
    if(e.request.mode==='navigate'){
      e.respondWith((async()=>{
        try{
          const net=await fetch(e.request,{cache:'no-store'});
          if(net&&net.ok){const c=await caches.open(CACHE);await c.put('./index.html',net.clone())}
          return net;
        }catch(err){return (await caches.match('./index.html'))||Response.error()}
      })());
      return;
    }
    e.respondWith((async()=>{
      const normalized=normalizedSameOrigin(e.request);
      const cached=await caches.match(normalized,{ignoreSearch:true});
      if(cached){
        e.waitUntil(fetch(e.request,{cache:'no-store'}).then(async net=>{if(net&&net.ok){const c=await caches.open(CACHE);await c.put(normalized,net.clone())}}).catch(()=>{}));
        return cached;
      }
      try{
        const net=await fetch(e.request,{cache:'no-store'});
        if(net&&net.ok){const c=await caches.open(CACHE);await c.put(normalized,net.clone())}
        return net;
      }catch(err){return Response.error()}
    })());
    return;
  }

  if(CORE_HOSTS.has(url.hostname)){
    e.respondWith((async()=>{
      const cached=await caches.match(e.request);
      if(cached)return cached;
      try{
        const net=await fetch(e.request);
        if(net&&net.ok){const c=await caches.open(RUNTIME);await c.put(e.request,net.clone());trim(RUNTIME,40)}
        return net;
      }catch(err){return Response.error()}
    })());
    return;
  }

  if(MAP_HOSTS.has(url.hostname)){
    e.respondWith((async()=>{
      const cached=await caches.match(e.request);
      if(cached)return cached;
      try{
        const net=await fetch(e.request);
        if(net){const c=await caches.open(MAP_CACHE);await c.put(e.request,net.clone());trim(MAP_CACHE,350)}
        return net;
      }catch(err){return Response.error()}
    })());
  }
});
