const { chromium, devices } = require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const dest=path.resolve(root,'.'+pathname);if(!dest.startsWith(root+path.sep)&&dest!==root){res.writeHead(403);return res.end()}fs.readFile(dest,(err,b)=>{if(err){res.writeHead(404);return res.end('Missing '+pathname)}res.writeHead(200,{'Content-Type':mime[path.extname(dest)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)})});
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
let failures=[];
async function run(name,fn){try{await fn();console.log('PASS',name)}catch(err){console.error('FAIL',name,err.message);failures.push(name+': '+err.message)}}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({...devices['iPhone 13'],permissions:['geolocation','camera'],geolocation:{latitude:-16.92,longitude:145.77},serviceWorkers:'block'});
 await context.route(/supabase\.co\//,route=>route.abort()); // never touch production data
 const page=await context.newPage();
 const exceptions=[];
 page.on('pageerror',err=>exceptions.push(err.message));
 page.on('dialog',d=>d.dismiss().catch(()=>{}));
 await run('Boot et écran d’accueil',async()=>{
   await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForSelector('#home',{state:'attached',timeout:30000});
   assert((await page.title()).includes('NØMIA'),'titre NØMIA manquant');
 });
 await run('Boutons visibles sans erreur de syntaxe d’attribut',async()=>{
   const bad=await page.locator('button[onclick]').evaluateAll(btns=>btns.filter(b=>!b.getAttribute('onclick')?.trim()).map(b=>b.outerHTML));
   assert(bad.length===0,'onclick vides: '+bad.length);
 });
 await run('Ouverture et fermeture Nouveau voyage',async()=>{
   await page.locator('button[onclick="openTripEditor()"]').first().click({timeout:12000});
   await page.waitForTimeout(250);
   assert(await page.locator('#tripOverlay.show').count()>0,'éditeur voyage non visible');
   await page.evaluate(()=>window.closeOverlay('tripOverlay'));
   assert(await page.locator('#tripOverlay.show').count()===0,'éditeur voyage ne se ferme pas');
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

 await run('Navigation : ouverture et fermeture',async()=>{
   await page.evaluate(()=>window.openNavigationMode?.());
   await page.waitForTimeout(350);
   assert(await page.locator('#navOverlay.show').count()===1,'Navigation non visible');
   assert(await page.locator('#navOverlay button').count()>=2,'Contrôles navigation absents');
   await page.evaluate(()=>window.closeOverlay('navOverlay'));
   assert(await page.locator('#navOverlay.show').count()===0,'Navigation ne se ferme pas');
 });
 await run('Dépenses : ouverture de planning',async()=>{
   await page.evaluate(()=>window.openPlanner?.());
   await page.waitForTimeout(300);
   assert(await page.locator('#plannerOverlay.show').count()===1,'Planning/dépenses non visible');
   assert(await page.locator('#plannerOverlay button').count()>=1,'Contrôles dépenses absents');
   await page.evaluate(()=>window.closeOverlay('plannerOverlay'));
 });
 await run('Réservations : ouverture de Voyage Hub',async()=>{
   await page.evaluate(()=>window.openVoyageHub?.());
   await page.waitForTimeout(450);
   assert(await page.locator('#uxVoyagePanel.show').count()===1,'Voyage Hub non visible');
   assert(await page.locator('#uxVoyageScroll').count()===1,'Contenu Voyage absent');
   await page.evaluate(()=>document.getElementById('uxVoyageClose')?.click());
   assert(await page.locator('#uxVoyagePanel.show').count()===0,'Voyage Hub ne se ferme pas');
 });
 await run('Collaboration : ouverture locale sans écriture cloud',async()=>{
   await page.evaluate(()=>window.openCollab?.());
   await page.waitForTimeout(350);
   assert(await page.locator('#collabOverlay.show').count()===1,'Collaboration non visible');
   await page.evaluate(()=>window.closeOverlay('collabOverlay'));
 });
 await run('Emulation mobile : permissions GPS et caméra',async()=>{
   const caps=await page.evaluate(()=>({gps:!!navigator.geolocation,camera:!!navigator.mediaDevices?.getUserMedia,motion:typeof DeviceOrientationEvent!=='undefined'}));
   assert(caps.gps&&caps.camera,'API manquante sur le navigateur');
   console.log('INFO: appareils iPhone physiques non testés:',JSON.stringify(caps));
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
     await offlinePage.waitForFunction(async()=>{
       if(!navigator.serviceWorker?.controller)return false;
       const r=await caches.match('./app-base.html',{ignoreSearch:true});
       const i=await caches.match('./index.html',{ignoreSearch:true});
       return !!(r&&i);
     },null,{timeout:25000});
     await offlineContext.setOffline(true);
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
