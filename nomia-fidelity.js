/* NØMIA folding panels – additive to workspace-windows.js */
(()=>{'use strict';if(window.__nomiaFidelityInstalled)return;window.__nomiaFidelityInstalled=true;
const KEY='nomia-map-fold-v1';const desktop=()=>innerWidth>760;const panels={left:'nf-left-fold',right:'nf-right-fold'};let state={left:false,right:false};
try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');state={left:!!s.left,right:!!s.right}}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
function paint(){for(const key of ['left','right']){document.body.classList.toggle(panels[key],desktop()&&state[key]);const b=document.querySelector('[data-nf-fold="'+key+'"]');if(b){b.textContent=state[key]?(key==='left'?'›':'‹'):(key==='left'?'‹':'›');b.title=(state[key]?'Afficher ':'Masquer ')+(key==='left'?'Explorer':'Vue d’ensemble');b.setAttribute('aria-expanded',String(!state[key]));}}}
function fold(key,force){if(!(key in panels))return;state[key]=force===undefined?!state[key]:!!force;save();paint()}
window.nomiaFoldPanel=fold;
function install(){if(!document.querySelector('.left')||!document.querySelector('.right'))return false;if(!document.querySelector('.nf-panel-buttons')){const bar=document.createElement('div');bar.className='nf-panel-buttons';bar.setAttribute('aria-label','Afficher ou masquer les panneaux');for(const key of ['left','right']){const b=document.createElement('button');b.type='button';b.className='nf-fold-btn '+(key==='right'?'right-side':'');b.dataset.nfFold=key;b.addEventListener('click',()=>fold(key));bar.appendChild(b)}document.body.appendChild(bar)}paint();return true}
let ticks=0;const timer=setInterval(()=>{if(install()||++ticks>50)clearInterval(timer)},200);
// Fold only on an intentional click on empty map, never on marker selection or drag.
let start=null;
document.addEventListener('pointerdown',e=>{if(!desktop()||!e.target.closest?.('#map canvas')||e.button!==0)return;start={x:e.clientX,y:e.clientY,t:e.timeStamp}},true);
document.addEventListener('pointerup',e=>{if(!start)return;const p=start;start=null;if(!desktop()||Math.hypot(e.clientX-p.x,e.clientY-p.y)>7)return;
// MapLibre handles the same click; a deferred check avoids folding while spot details open.
setTimeout(()=>{if(document.querySelector('.detail.show,.uxPhotoPanel.show,.uxVoyagePanel.show,.overlay.show'))return;if(!state.left||!state.right){state.left=true;state.right=true;save();paint()}},80);
},true);
document.addEventListener('pointercancel',()=>{start=null},true);
document.addEventListener('click',e=>{if(!desktop()||e.target.closest?.('.nf-fold-btn'))return;const target=e.target.closest?.('.left .workspace,.right .brief');if(target?.matches('.left .workspace'))fold('left',false);if(target?.matches('.right .brief'))fold('right',false)});
addEventListener('resize',paint);
})();