/* NØMIA voyage entry point: shared bridge + specialized controller. */
(()=>{'use strict';
const frame=document.getElementById('module-app'),status=document.getElementById('module-status');
if(!window.NomiaSharedCore){status.textContent='Noyau NØMIA indisponible. Actualise cette page.';return}
window.NomiaVoyageEngine=window.NomiaSharedCore.mount({mode:'voyage',frame,status});
})();