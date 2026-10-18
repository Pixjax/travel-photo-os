/* NØMIA photo entry point: shared bridge + specialized controller. */
(()=>{'use strict';
const frame=document.getElementById('module-app'),status=document.getElementById('module-status');
if(!window.NomiaSharedCore){status.textContent='Noyau NØMIA indisponible. Actualise cette page.';return}
window.NomiaPhotoEngine=window.NomiaSharedCore.mount({mode:'photo',frame,status});
})();