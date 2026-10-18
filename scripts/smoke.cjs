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
   await page.locator('button[onclick="closeOverlay(\\'tripOverlay\\')"]').first().click({timeout:12000});
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
 await run('Absence d’erreurs JavaScript fatales',async()=>{
   const fatal=exceptions.filter(x=>/SyntaxError|ReferenceError|is not a function|Unexpected token/i.test(x));
   assert(fatal.length===0,fatal.slice(0,6).join('; '));
 });
 await browser.close();server.close();
 if(failures.length){console.error('FAILED',failures.length,failures);process.exitCode=1}
 else console.log('PASS browser smoke suite');
})().catch(err=>{console.error(err);server.close();process.exitCode=1});
