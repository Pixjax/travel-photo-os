/* NØMIA map quick actions — preview only; reuses existing map functions. */
(()=>{'use strict';if(window.__nomiaMapQuickActions)return;window.__nomiaMapQuickActions=true;
function start(){if(document.getElementById('nomiaMapQuickActions'))return;if(!document.getElementById('map'))return;
const bar=document.createElement('div');bar.id='nomiaMapQuickActions';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Actions rapides de la carte');
bar.innerHTML='<button type="button" data-action="overview" title="Afficher tous les spots du voyage" aria-label="Vue du voyage">⌖<span>Vue voyage</span></button><button type="button" data-action="position" title="Centrer sur ma position" aria-label="Ma position">◎<span>Ma position</span></button><button type="button" data-action="style" title="Changer le fond de carte" aria-label="Changer le fond de carte">◐<span>Fond carte</span></button>';
bar.addEventListener('click',e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;const action=btn.dataset.action;try{
if(action==='overview'){if(typeof window.flyOverview==='function')window.flyOverview();else if(typeof flyOverview==='function')flyOverview()}
if(action==='position'){if(typeof window.locateMe==='function')window.locateMe();else if(typeof locateMe==='function')locateMe()}
if(action==='style'){const toggle=document.getElementById('nomiaMapStyleToggle');if(toggle)toggle.click();else if(typeof window.toggleSatellite==='function')window.toggleSatellite();else if(typeof toggleSatellite==='function')toggleSatellite()}
}catch(err){console.warn('NØMIA carte',err)}});
document.body.appendChild(bar);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();