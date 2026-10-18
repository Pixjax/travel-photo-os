/* NØMIA Voyage engine: independent journey workspace bootstrap. */
(()=>{'use strict';
const frame=document.getElementById('module-app'),status=document.getElementById('module-status');
let watch=0,tries=0,ready=false;
function check(){try{const w=frame.contentWindow,d=frame.contentDocument;if(!d?.getElementById('map')||typeof w.openVoyageHub!=='function')return;
w.openVoyageHub();ready=true;clearInterval(watch);status.hidden=true;frame.dispatchEvent(new CustomEvent('nomia-module-ready'))}
catch(e){if(++tries>45){clearInterval(watch);status.textContent='Le moteur voyage prend du temps à charger. Actualise la page.'}}}
frame.addEventListener('load',()=>{ready=false;tries=0;clearInterval(watch);setTimeout(check,350);watch=setInterval(check,550)});
window.NomiaVoyageEngine=Object.freeze({get ready(){return ready},get frame(){return frame}});
})();