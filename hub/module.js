(()=>{'use strict';
const frame=document.getElementById('module-app');
const status=document.getElementById('module-status');
const mode=document.body.dataset.module;
let attempts=0,timer=0;
function activate(){
 try{
  const w=frame.contentWindow,d=frame.contentDocument;
  if(!d||!d.getElementById('map'))throw Error('Carte en chargement');
  const fn=mode==='photo'?'openPhotoExperience':'openVoyageHub';
  if(typeof w[fn]!=='function')throw Error('Module en chargement');
  // Photo now has its own studio home: do not automatically overlay the old Photo panel.
  if(mode!=='photo')w[fn]();
  status.hidden=true;clearInterval(timer);
  frame.dispatchEvent(new CustomEvent('nomia-module-ready'));
 }catch(e){
  if(++attempts>45){clearInterval(timer);status.textContent='Chargement plus long que prévu. Actualise la page si nécessaire.'}
 }
}
frame.addEventListener('load',()=>{attempts=0;clearInterval(timer);setTimeout(activate,350);timer=setInterval(activate,550)});
})();