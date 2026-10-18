(()=>{'use strict';
const frame=document.getElementById('module-app'),stage=document.getElementById('photo-stage'),back=document.getElementById('photo-back'),toast=document.getElementById('photo-toast');
let timer=0,ready=false;
function notice(t){toast.textContent=t;toast.hidden=false;clearTimeout(timer);timer=setTimeout(()=>toast.hidden=true,4200)}
function reveal(){stage.hidden=false;back.hidden=true;stage.scrollTop=0}
function enter(){stage.hidden=true;back.hidden=false;toast.hidden=true}
function getEngine(){try{return {w:frame.contentWindow,d:frame.contentDocument}}catch(e){return {w:null,d:null}}}
function tool(name){
 const {w,d}=getEngine();
 if(!ready||!w||!d){notice('NØMIA Photo se prépare encore…');return}
 if(name==='trip'){try{w.showHome?.();enter()}catch(e){notice('Impossible d’afficher les voyages.')};return}
 if(name==='map'){try{d.getElementById('uxPhotoPanel')?.classList.remove('show');d.body.classList.remove('uxPhotoOpen');d.getElementById('home')?.classList.add('hide');enter()}catch(e){notice('Carte indisponible pour le moment.')};return}
 const methods={photo:'openPhotoExperience',suite:'openPhotoProSuite',field:'openPhotoFieldAR',celestial:'openCelestialAR',sky:'openSkyAtlas'};
 const fn=w[methods[name]];
 if(typeof fn!=='function'){notice('Cet outil se charge encore. Réessaie dans un instant.');return}
 try{
  if(name==='photo'){
   // Legacy Photo requires an active journey: offer selection, never leave users on an empty screen.
   const panel=d.getElementById('uxPhotoPanel');
   fn();
   if(!panel?.classList.contains('show')&&!d.getElementById('uxPhotoPanel')?.classList.contains('show')){
    w.showHome?.();notice('Choisis d’abord un voyage pour afficher ses spots photo.');
   }
  }else{
   d.getElementById('home')?.classList.add('hide');
   fn();
  }
  enter();
 }catch(e){notice('Cet outil ne peut pas encore être ouvert.')}
}
frame.addEventListener('nomia-module-ready',()=>{ready=true;const {d}=getEngine();if(d){const style=d.createElement('style');style.id='nomia-photo-studio-focus';style.textContent='#nomiaReturnHub{display:none!important}';d.head?.append(style)}});
frame.addEventListener('load',()=>{ready=false;reveal()});
stage.addEventListener('click',e=>{const b=e.target.closest('[data-photo-tool]');if(b)tool(b.dataset.photoTool)});
back.addEventListener('click',reveal);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stage.hidden)reveal()});
reveal();
})();