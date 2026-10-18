/* NØMIA — simple navigation, existing modules remain intact */
(()=>{'use strict';if(window.__nomiaSimpleNav)return;window.__nomiaSimpleNav=true;
const items=[['home','Accueil','⌂'],['map','Carte','◇'],['trip','Voyage','▤'],['photo','Photo Pro','◎'],['more','Plus','☷']];
const safe=(name)=>{try{if(name==='home'){window.showHome?.();return}if(name==='map'){document.getElementById('uxPhotoPanel')?.classList.remove('show');document.getElementById('uxVoyagePanel')?.classList.remove('show');document.body.classList.remove('uxPhotoOpen','uxVoyageOpen');return}if(name==='trip'){window.openVoyageHub?.();return}if(name==='photo'){window.openPhotoExperience?.();return}}catch(e){console.warn('Navigation NØMIA',e)}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function install(){if(document.querySelector('#nomiaSimpleNav')||!document.querySelector('#map'))return;
const wrap=document.createElement('nav');wrap.id='nomiaSimpleNav';wrap.setAttribute('aria-label','Navigation principale');
wrap.innerHTML=items.map(([id,label,icon])=>'<button type="button" data-ns="'+id+'" aria-label="'+esc(label)+'"><span aria-hidden="true">'+icon+'</span><small>'+esc(label)+'</small></button>').join('');
document.body.appendChild(wrap);
const menu=document.createElement('section');menu.id='nomiaSimpleMore';menu.hidden=true;menu.setAttribute('aria-label','Outils supplémentaires');menu.innerHTML='<header><b>Outils NØMIA</b><button type="button" data-ns-close aria-label="Fermer">✕</button></header><button data-ns-extra="favs">♡ Favoris</button><button data-ns-extra="gps">◎ Live GPS</button><button data-ns-extra="nav">➤ Navigation live</button><button data-ns-extra="collab">♧ Collaboratif</button><button data-ns-extra="ultimate">✧ Outils avancés</button><button data-ns-extra="builder">✦ Créateur de voyage IA</button><button data-ns-extra="windows">↺ Réinitialiser fenêtres</button>';
document.body.appendChild(menu);
const close=()=>{menu.hidden=true;wrap.querySelector('[data-ns="more"]')?.setAttribute('aria-expanded','false')};
wrap.addEventListener('click',e=>{const b=e.target.closest('[data-ns]');if(!b)return;const id=b.dataset.ns;if(id==='more'){menu.hidden=!menu.hidden;b.setAttribute('aria-expanded',String(!menu.hidden));return}close();safe(id)});
menu.addEventListener('click',e=>{if(e.target.closest('[data-ns-close]')){close();return}const b=e.target.closest('[data-ns-extra]');if(!b)return;close();const a=b.dataset.nsExtra;try{if(a==='favs')window.setMode?.('favs');if(a==='gps')window.openGeo?.();if(a==='nav')window.openNavigationMode?.();if(a==='collab')window.openCollab?.();if(a==='ultimate')window.openUltimate?.();if(a==='builder')window.openAIBuilder?.();if(a==='windows')window.resetWindowLayout?.()}catch(err){console.warn(err)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();