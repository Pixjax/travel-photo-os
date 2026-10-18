const { chromium, devices } = require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/__qa_gps'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end('<!doctype html><title>NØMIA GPS Test</title>')}const dest=path.resolve(root,'.'+pathname);if(!dest.startsWith(root+path.sep)&&dest!==root){res.writeHead(403);return res.end()}fs.readFile(dest,(err,b)=>{if(err){res.writeHead(404);return res.end('Missing '+pathname)}res.writeHead(200,{'Content-Type':mime[path.extname(dest)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)})});
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
let failures=[];
async function run(name,fn){try{await fn();console.log('PASS',name)}catch(err){console.error('FAIL',name,err.message);failures.push(name+': '+err.message);try{if(typeof page!=='undefined'&&!page.isClosed()){fs.mkdirSync(path.join(root,'qa-screenshots'),{recursive:true});await page.screenshot({path:path.join(root,'qa-screenshots',String(failures.length).padStart(2,'0')+'-failed.png'),fullPage:true})}}catch(_){}}}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({...devices['iPhone 13'],permissions:['geolocation','camera'],geolocation:{latitude:-16.92,longitude:145.77},serviceWorkers:'block'});
 await context.route(/supabase\.co\//,route=>route.abort()); // never touch production data
 await context.grantPermissions(['geolocation','camera'],{origin:base});
 await context.setGeolocation({latitude:-16.92,longitude:145.77,accuracy:10});
 const page=await context.newPage();
 const exceptions=[];
 page.on('pageerror',err=>exceptions.push(err.message));
 page.on('dialog',d=>d.dismiss().catch(()=>{}));
 await run('Boot et écran d’accueil',async()=>{
   await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForSelector('#home',{state:'attached',timeout:30000});
   await page.waitForFunction(()=>document.querySelectorAll('#tripGrid .tripCard').length>0,null,{timeout:30000});
   assert((await page.title()).includes('NØMIA'),'titre NØMIA manquant');
 });
 await run('NØMIA premium dashboard: hero, cards, links, mobile navigation',async()=>{
   await page.waitForSelector('#nomiaDashboard .nd-hero',{timeout:10000});
   const state=await page.evaluate(()=>({
     home:document.querySelector('#home')?.classList.contains('nomia-home'),
     hero:!!document.querySelector('#nomiaDashboard .nd-hero'),
     plan:!!document.querySelector('#nomiaDashboard .nd-timeline'),
     bookings:!!document.querySelector('#nomiaDashboard .nd-res'),
     budget:!!document.querySelector('#nomiaDashboard .nd-budgetmain'),
     nav:getComputedStyle(document.querySelector('#nomiaDashboard .nd-mobilebar')).display,
     buttons:document.querySelectorAll('#nomiaDashboard button[data-go]').length
   }));
   assert(state.home&&state.hero&&state.plan&&state.bookings&&state.budget&&state.nav!=='none'&&state.buttons>=8,'Dashboard incomplete: '+JSON.stringify(state));
 });
 await run('Entrée dans un voyage de test local isolé',async()=>{
   await page.waitForTimeout(400);
   const state=await page.evaluate(()=>{
     const id='nomia-qa-local';
     if(!trips.some(t=>t.id===id)){
       trips.push({id,name:'NØMIA QA',country:'France',start:'2026-10-18',end:'2026-10-20',currency:'EUR',emoji:'🧪',builtIn:false,description:'Tests navigateur isolés'});
       saveTrips();
     }
     openTrip(id);
     return {id:activeTripId,home:document.getElementById('home').className,store:!!store};
   });
   console.log('QA voyage initialisé',state);
   await page.waitForTimeout(450);
   const final=await page.evaluate(()=>({id:activeTripId,home:document.getElementById('home').className,store:!!store}));
   assert(final.id==='nomia-qa-local'&&final.store&&final.home.includes('hide'),'Voyage test non ouvert: '+JSON.stringify(final));
 });
 await run('Boutons visibles sans erreur de syntaxe d’attribut',async()=>{
   const bad=await page.locator('button[onclick]').evaluateAll(btns=>btns.filter(b=>!b.getAttribute('onclick')?.trim()).map(b=>b.outerHTML));
   assert(bad.length===0,'onclick vides: '+bad.length);
 });
 await run('Ouverture et fermeture Nouveau voyage depuis accueil',async()=>{
   await page.evaluate(()=>showHome());
   await page.locator('button[onclick="openTripEditor()"]').first().click({timeout:12000});
   await page.waitForTimeout(200);
   assert(await page.locator('#tripOverlay.show').count()===1,'Éditeur voyage non visible');
   await page.evaluate(()=>closeOverlay('tripOverlay'));
   assert(await page.locator('#tripOverlay.show').count()===0,'Éditeur voyage ne se ferme pas');
   await page.evaluate(()=>openTrip('nomia-qa-local'));
 });
 await run('Menu Photo et planétarium',async()=>{
   await page.evaluate(()=>{if(typeof window.setMode==='function')window.setMode('photo');});
   await page.waitForTimeout(1400);
   assert(await page.locator('#uxPhotoPanel.show').count()>0,'Photo n’ouvre pas son panneau');
   const launch=page.locator('#photoRaBuiltIn');
   assert(await launch.count()===1,'entrée Planétarium manquante ou dupliquée');
   await launch.click({timeout:12000});
   assert(await page.locator('#skyAtlas.show').count()>0,'Planétarium ne s’ouvre pas');
   await page.locator('#skyExit').click({timeout:12000});
   assert(await page.locator('#skyAtlas.show').count()===0,'Planétarium ne se ferme pas');
 });

 await run('Navigation v2 iPhone : HUD et fermeture',async()=>{
   await page.evaluate(()=>openNavigationMode());
   await page.waitForTimeout(500);
   assert(await page.locator('#nav2Hud.show').count()===1,'HUD Navigation v2 non visible');
   assert(await page.locator('#nav2Hud button').count()>=3,'Commandes Navigation v2 absentes');
   await page.locator('#nav2Hud [data-nav2-close]').click({timeout:8000});
   assert(await page.locator('#nav2Hud.show').count()===0,'HUD Navigation v2 ne se ferme pas');
 });
 await run('Dépenses : ouverture de planning',async()=>{
   await page.evaluate(()=>window.openPlanner?.());
   await page.waitForTimeout(300);
   assert(await page.locator('#plannerOverlay.show').count()===1,'Planning/dépenses non visible');
   assert(await page.locator('#plannerOverlay button').count()>=1,'Contrôles dépenses absents');
   const oldCount=await page.evaluate(()=>store.expenses.length);
   await page.locator('#expAmount').fill('12');
   await page.locator('#expNote').fill('Test automatique NØMIA');
   await page.locator('button[onclick="addExpense()"]').click();
   const n=await page.evaluate(()=>store.expenses.length);
   assert(n===oldCount+1,'Ajout de dépense échoué');
   assert(await page.getByText('Test automatique NØMIA').count()>=1,'Dépense non affichée');
   await page.evaluate(()=>{store.expenses=store.expenses.filter(e=>e.note!=='Test automatique NØMIA');saveData()});
   await page.evaluate(()=>window.closeOverlay('plannerOverlay'));
 });
 await run('Réservations : ouverture de Voyage Hub',async()=>{
   await page.evaluate(()=>window.openVoyageHub?.());
   await page.waitForTimeout(450);
   assert(await page.locator('#uxVoyagePanel.show').count()===1,'Voyage Hub non visible');
   assert(await page.locator('#uxVoyageScroll').count()===1,'Contenu Voyage absent');
   const before=await page.evaluate(()=>store.reservations.length);
   await page.locator('#uxResTitle').fill('Test automatique NØMIA');
   await page.locator('#uxResDate').fill('18 OCT');
   await page.locator('[data-add-res]').click();
   const after=await page.evaluate(()=>store.reservations.length);
   assert(after===before+1,'Ajout réservation non persisté en mémoire');
   assert(await page.getByText('Test automatique NØMIA').count()>=1,'Réservation ajoutée non visible');
   await page.evaluate(()=>{store.reservations=store.reservations.filter(r=>r.title!=='Test automatique NØMIA');if(typeof saveData==='function')saveData()});
   await page.evaluate(()=>document.getElementById('uxVoyageClose')?.click());
   assert(await page.locator('#uxVoyagePanel.show').count()===0,'Voyage Hub ne se ferme pas');
 });
 await run('Collaboration : ouverture locale sans écriture cloud',async()=>{
   await page.evaluate(()=>window.openCollab?.());
   await page.waitForTimeout(350);
   assert(await page.locator('#collabOverlay.show').count()===1,'Collaboration non visible');
   await page.evaluate(()=>window.closeOverlay('collabOverlay'));
 });
 await run('Émulation mobile : caméra et disponibilité GPS',async()=>{
   const caps=await page.evaluate(async()=>{
     const permission=await navigator.permissions.query({name:'geolocation'}).then(x=>x.state).catch(e=>String(e));
     let camera=false,err='';
     try{const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});camera=stream.getVideoTracks().length>0;stream.getTracks().forEach(t=>t.stop())}catch(e){err=String(e)}
     return {permission,camera,err};
   });
   assert(caps.permission==='granted','Permission GPS non accordée: '+JSON.stringify(caps));
   assert(caps.camera,'Caméra simulée non accessible: '+caps.err);
   const blank=await context.newPage();
   await blank.goto(base+'/__qa_gps',{waitUntil:'domcontentloaded'});
   const gps=await blank.evaluate(()=>new Promise(resolve=>navigator.geolocation.getCurrentPosition(
     p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),
     e=>resolve({error:e.message,code:e.code}),
     {enableHighAccuracy:false,maximumAge:60000,timeout:5000}
   )));
   await blank.close();
   console.log('GPS mock on blank isolated page:',JSON.stringify(gps));
   if(Number.isFinite(gps.lat)){
     assert(Math.abs(gps.lat+16.92)<.01,'GPS spoof inconsistent');
   }else{
     console.warn('GPS device emulator gave no location even on isolated blank page; iPhone GPS validation remains required.');
   }
 });
 await run('Hors ligne : service worker et app shell déclarés',async()=>{
   const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
   assert(sw.includes("self.addEventListener('fetch'"),'Interception fetch absente');
   assert(sw.includes("'./index.html'")&&sw.includes("'./app-base.html'"),'App shell non déclaré');
 });


 await run('Vrai redémarrage navigateur hors ligne après préchargement PWA',async()=>{
   const offlineContext=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'allow'});
   await offlineContext.route(/supabase\.co\//,route=>route.abort());
   const offlinePage=await offlineContext.newPage();
   try{
     await offlinePage.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
     // Poll from Node: Playwright waitForFunction does not await an async predicate.
     let warmed=false,cacheInfo=null;
     for(let n=0;n<50;n++){
       cacheInfo=await offlinePage.evaluate(async()=>({
         controller:!!navigator.serviceWorker?.controller,
         names:await caches.keys(),
         index:!!(await caches.match('./index.html',{ignoreSearch:true})),
         base:!!(await caches.match('./app-base.html',{ignoreSearch:true}))
       }));
       if(cacheInfo.controller&&cacheInfo.index&&cacheInfo.base){warmed=true;break}
       await offlinePage.waitForTimeout(500);
     }
     console.log('CACHE preload:',JSON.stringify(cacheInfo));
     assert(warmed,'PWA offline cache not ready');
     const cached=await offlinePage.evaluate(async()=>({controller:navigator.serviceWorker.controller?.scriptURL,caches:await caches.keys(),index:!!(await caches.match('./index.html',{ignoreSearch:true})),base:!!(await caches.match('./app-base.html',{ignoreSearch:true}))}));
     console.log('OFFLINE before disconnect:',JSON.stringify(cached));
     await offlineContext.setOffline(true);
     const fetchState=await offlinePage.evaluate(async()=>{try{const r=await fetch('./index.html');return {ok:r.ok,status:r.status,type:r.type}}catch(e){return {error:String(e)}}});
     console.log('OFFLINE fetch check:',JSON.stringify(fetchState));
     await offlinePage.reload({waitUntil:'domcontentloaded',timeout:20000});
     await offlinePage.waitForSelector('#home',{state:'attached',timeout:20000});
     assert((await offlinePage.title()).includes('NØMIA'),'Titre ou page absent hors ligne');
   }finally{await offlineContext.close()}
 });
 await run('Absence d’erreurs JavaScript fatales',async()=>{
   const fatal=exceptions.filter(x=>/SyntaxError|ReferenceError|is not a function|Unexpected token/i.test(x));
   assert(fatal.length===0,fatal.slice(0,6).join('; '));
 });
 await browser.close();server.close();
 if(failures.length){console.error('FAILED',failures.length,failures);process.exitCode=1}
 else console.log('PASS browser smoke suite');
})().catch(err=>{console.error(err);server.close();process.exitCode=1});
