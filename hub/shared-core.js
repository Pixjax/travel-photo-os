/* NØMIA shared bridge v1 — same-origin access to legacy map/trip engine.
   No storage migration and no mutation of existing trips. */
(()=>{'use strict';
function mount({mode,frame,status,onReady}){
 let generation=0,interval=0,attempts=0,ready=false,disposed=false;
 const required=mode==='photo'?'openPhotoExperience':'openVoyageHub';
 function clear(){if(interval){clearInterval(interval);interval=0}}
 function probe(token){
  if(disposed||token!==generation)return;
  try{
   const w=frame.contentWindow,d=frame.contentDocument;
   if(!w||!d?.getElementById('map')||typeof w[required]!=='function')throw Error('not ready');
   clear();ready=true;status.hidden=true;
   if(mode==='voyage')w.openVoyageHub();
   if(typeof onReady==='function')onReady({window:w,document:d});
   frame.dispatchEvent(new CustomEvent('nomia-module-ready'));
  }catch(e){
   if(++attempts>=65){clear();status.hidden=false;status.textContent='Le moteur NØMIA tarde à démarrer. Recharge cette page.'}
  }
 }
 function boot(){
  clear();const token=++generation;attempts=0;ready=false;status.hidden=false;
  setTimeout(()=>probe(token),350);
  interval=setInterval(()=>probe(token),600);
 }
 frame.addEventListener('load',boot);
 // Handles a fast iframe load that precedes registration.
 if(frame.contentDocument?.readyState==='complete')boot();
 return Object.freeze({
  get ready(){return ready},
  get frame(){return frame},
  get mode(){return mode},
  get tripSnapshot(){
   if(!ready)return null;
   try{
    const w=frame.contentWindow;
    return {activeTripId:w.activeTripId??null,spotCount:typeof w.activeSpots==='function'?w.activeSpots().length:null};
   }catch(e){return null}
  },
  dispose(){disposed=true;clear();frame.removeEventListener('load',boot)}
 });
}
window.NomiaSharedCore=Object.freeze({mount,version:'1.0'});
})();