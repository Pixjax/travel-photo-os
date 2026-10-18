#!/usr/bin/env node
// NØMIA regression audit — zero external dependencies.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let failed=0;
function check(ok,message){console.log((ok?'PASS ':'FAIL ')+message);if(!ok)failed++}
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),sw=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
const scriptRefs=[...index.matchAll(/\.\/([\w-]+\.js)\?v='\+VERSION/g)].map(x=>x[1]).filter(x=>x!=='sw.js');
const cssRefs=[...index.matchAll(/\.\/([\w-]+\.css)\?v='\+VERSION/g)].map(x=>x[1]);
const assets=[...new Set([...scriptRefs,...cssRefs])];
check(manifest.name==='NØMIA'&&manifest.short_name==='NØMIA','PWA app branding');
check(/<title>NØMIA<\/title>/.test(index),'HTML title branding');
for(const p of assets)check(fs.existsSync(path.join(root,p)),'referenced asset '+p);
for(const p of [...new Set(scriptRefs)]){try{new vm.Script(read(p),{filename:p});check(true,'JavaScript syntax '+p)}catch(e){check(false,'JavaScript syntax '+p+' '+e.message)}}
const cached=new Set([...sw.matchAll(/'\.\/([^']+)'/g)].map(x=>x[1]));
for(const p of assets)check(cached.has(p),'offline cache includes '+p);
for(const item of manifest.icons||[])check(fs.existsSync(path.join(root,item.src)),'icon '+item.src);
check(!index.includes('photo-ra-direct.js'),'obsolete RA entry not loaded');
check(!index.includes('photo-ra-entry.js'),'obsolete RA loader not loaded');
check(index.includes('manifest.webmanifest?v=')||index.includes("manifest.webmanifest?v='+VERSION"),'manifest URL is versioned');
const base=read('app-base.html');
const inlineActions=[...base.matchAll(/\bonclick="([^"]*)"/g)].map(m=>m[1]);
let parsedHandlers=0,dynamicHandlers=0;
for(let i=0;i<inlineActions.length;i++){
 const action=inlineActions[i];
 // Interpolated template literals may contain quote characters before render.
 if(action.includes('${')||action.includes('String(')){dynamicHandlers++;continue}
 try{new vm.Script('(function(event){'+action+'})',{filename:'inline-onclick-'+(i+1)});check(true,'static inline action #'+(i+1));parsedHandlers++}
 catch(e){check(false,'static inline action #'+(i+1)+' '+e.message)}
}
console.log('Core inline actions: '+inlineActions.length+', static parsed: '+parsedHandlers+', dynamic deferred: '+dynamicHandlers);
console.log(failed?failed+' audit checks failed':'NØMIA audit passed');
process.exitCode=failed?1:0;