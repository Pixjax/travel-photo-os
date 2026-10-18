/* NØMIA Photo engine: isolated entry points over the shared trip/map core. */
(()=>{'use strict';
const frame=document.getElementById('module-app'),status=document.getElementById('module-status');
let ready=false,watch=0,tries=0;
function check(){try{const w=frame.contentWindow,d=frame.contentDocument;if(!d?.getElementById('map')||typeof w.openPhotoExperience!=='function')return;
ready=true;clearInterval(watch);status.hidden=true;frame.dispatchEvent(new CustomEvent('nomia-module-ready'))}
catch(e){if(++tries>45){clearInterval(watch);status.textContent='Le moteur photo prend du temps à charger. Actualise la page.'}}}
frame.addEventListener('load',()=>{ready=false;tries=0;clearInterval(watch);setTimeout(check,350);watch=setInterval(check,550)});
window.NomiaPhotoEngine=Object.freeze({get ready(){return ready},get frame(){return frame}});
})();