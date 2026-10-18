const CACHE='travel-photo-os-mobile-ux-v59';
const RUNTIME='travel-photo-os-runtime-v2';
const MAP_CACHE='travel-photo-os-map-runtime-v2';
const APP=['./','./index.html','./workspace.html','./app-base.html','./mobile-ux.css','./mobile-ux.js','./workspace-windows.css','./workspace-windows.js','./simple-collab.css','./simple-collab.js','./cloud-config.js','./home-cloud-fix.js','./cloud-sync.js','./premium-ux.css','./premium-ux.js','./day-experience.css','./day-experience.js','./photo-experience.css','./photo-experience.js','./photo-hook.js','./voyage-experience.css','./voyage-experience.js','./voyage-time-fix.js','./booking-launcher.css','./booking-launcher.js','./booking-native.css','./booking-native.js','./desktop-voyage-fab.css','./desktop-voyage-fab.js','./offline-mode.css','./offline-mode.js','./navigation-v2.css','./navigation-v2.js','./iphone-nav-fix.js','./celestial-ar.css','./celestial-ar.js','./photo-pro-suite.css','./photo-pro-suite.js','./photo-ar-field.css','./photo-ar-field.js','./sky-atlas.css','./sky-atlas.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./nomia-dashboard.css','./nomia-dashboard.js','./nomia-map-premium.css','./nomia-map-mockup.css','./nomia-map-style.css','./nomia-map-style.js','./nomia-fidelity.css','./nomia-fidelity.js','./nomia-photo-fidelity.css','./nomia-dual-mockups.css','./preview/nomia-simple-nav.css','./preview/nomia-simple-nav.js','./preview/nomia-windows-plus.css','./preview/nomia-windows-plus.js','./preview/nomia-window-dock.css','./preview/nomia-window-dock.js','./preview/nomia-ui-cleanup.css'];
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
  return new Request(u.origin+u.pathname,{method:'GET',mode:'same-origin',credentials:'same-origin',redirect:'follow'});
}
async function trim(cacheName,max){
  const c=await caches.open(cacheName),keys=await c.keys();
  if(keys.length<=max)return;
  await Promise.all(keys.slice(0,keys.length-max).map(k=>c.delete(k)));
}
async function cacheOneApp(path){
  try{
    const req=new Request(path,{cache:'reload'});
    const res=await fetch(req);
    if(!res||!res.ok)return false;
    const c=await caches.open(CACHE);
    await c.put(path,res.clone());
    return true;
  }catch(e){return false}
}
async function cacheExternal(url){
  try{
    const req=new Request(url,{mode:'cors',cache:'reload'}),res=await fetch(req);
    if(res&&res.ok){const c=await caches.open(RUNTIME);await c.put(req,res.clone());return true}
  }catch(e){}
  return false;
}

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil((async()=>{
    await Promise.allSettled(APP.map(cacheOneApp));
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

self.addEventListener('message',e=>{
  if(e.data?.type==='WARM_OFFLINE'){
    e.waitUntil((async()=>{
      await Promise.allSettled(APP.map(cacheOneApp));
      await Promise.allSettled(CORE_EXTERNAL.map(cacheExternal));
      try{e.source?.postMessage({type:'OFFLINE_WARMED'})}catch(_){}
    })());
  }
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);

  if(url.origin===location.origin){
    if(e.request.mode==='navigate'){
      e.respondWith((async()=>{
        const path=url.pathname;
        const isHome=path.endsWith('/travel-photo-os/')||path.endsWith('/travel-photo-os/index.html');
        const key=isHome?'./index.html':normalizedSameOrigin(e.request);
        const cached=(await caches.match(key,{ignoreSearch:true}))||(isHome?await caches.match('./',{ignoreSearch:true}):null);
        try{
          const net=await fetch(e.request,{cache:'no-store'});
          if(net&&net.ok){const c=await caches.open(CACHE);await c.put(key,net.clone())}
          return net;
        }catch(err){return cached||new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="background:#080a0e;color:white;font-family:system-ui;padding:30px"><h2>NØMIA</h2><p>Le cache hors ligne n’est pas encore prêt. Reconnecte Internet une fois, ouvre l’app et laisse-la chargée quelques secondes.</p></body>',{headers:{'Content-Type':'text/html; charset=utf-8'}})}
      })());
      return;
    }
    e.respondWith((async()=>{
      // Versioned application assets must be refreshed before reusing an older cache.
      if(url.searchParams.has('v')){
        try{
          const net=await fetch(e.request,{cache:'no-store'});
          if(net&&net.ok){const c=await caches.open(CACHE);await c.put(normalizedSameOrigin(e.request),net.clone());return net}
        }catch(e){}
      }
      const normalized=normalizedSameOrigin(e.request);
      const cached=await caches.match(normalized,{ignoreSearch:true})||await caches.match(url.pathname.replace(/^\/travel-photo-os\//,'./'),{ignoreSearch:true});
      if(cached){
        e.waitUntil(fetch(e.request,{cache:'no-store'}).then(async net=>{if(net&&net.ok){const c=await caches.open(CACHE);await c.put(normalized,net.clone())}}).catch(()=>{}));
        return cached;
      }
      try{
        const net=await fetch(e.request,{cache:'no-store'});
        if(net&&net.ok){const c=await caches.open(CACHE);await c.put(normalized,net.clone())}
        return net;
      }catch(err){return new Response('',{status:503,statusText:'Offline'})}
    })());
    return;
  }

  if(CORE_HOSTS.has(url.hostname)){
    e.respondWith((async()=>{
      const cached=await caches.match(e.request,{ignoreSearch:false});
      if(cached)return cached;
      try{
        const net=await fetch(e.request);
        if(net&&net.ok){const c=await caches.open(RUNTIME);await c.put(e.request,net.clone());trim(RUNTIME,50)}
        return net;
      }catch(err){return new Response('',{status:503,statusText:'Offline'})}
    })());
    return;
  }

  if(MAP_HOSTS.has(url.hostname)){
    e.respondWith((async()=>{
      const cached=await caches.match(e.request);
      if(cached)return cached;
      try{
        const net=await fetch(e.request);
        if(net&&net.ok){const c=await caches.open(MAP_CACHE);await c.put(e.request,net.clone());trim(MAP_CACHE,600)}
        return net;
      }catch(err){return new Response('',{status:503,statusText:'Offline'})}
    })());
  }
});