/* Preview-only photography research preset for NØMIA's existing ChatGPT builder. */
(()=>{'use strict';if(window.__nomiaPhotoPreset)return;window.__nomiaPhotoPreset=true;
function launch(){
 if(typeof window.openAIBuilder!=='function'){alert('Créateur ChatGPT momentanément indisponible.');return}
 window.openAIBuilder();
 const field=document.getElementById('aiRequest');if(!field)return;
 const destination=prompt('Quelle destination veux-tu explorer pour trouver les meilleurs spots photo ?',field.dataset.nomiaPhotoDestination||'');
 if(destination===null)return;
 const place=destination.trim();if(!place){field.focus();return}
 field.dataset.nomiaPhotoDestination=place;
 field.value='Recherche exclusivement les meilleurs SPOTS PHOTOGRAPHIQUES réels autour de '+place+'. Je suis photographe et cherche 15 à 25 lieux exceptionnels, avec priorité aux paysages, panoramas, points de vue, belles architectures, mer, cascades, montagne, lieux insolites et quelques spots peu connus. Exclus les résultats hors sujet, personnes et animaux sans lieu photographique précis. Vérifie autant que possible les coordonnées GPS et précise pour chaque spot le meilleur horaire, la lumière, une focale conseillée et pourquoi il mérite une photo. N’invente ni coordonnées ni sources. Je veux une liste de spots vérifiables, avec catégorie Photo, exploitable dans NØMIA. Si des dates sont obligatoires pour l’import, indique qu’elles doivent être choisies avant de créer le voyage.';
 field.focus();
}
function mount(){if(document.getElementById('nomiaPhotoPreset'))return;const panel=document.getElementById('uxPhotoPanel');if(!panel)return;const b=document.createElement('button');b.type='button';b.id='nomiaPhotoPreset';b.textContent='✦ Découvrir des spots avec ChatGPT';b.addEventListener('click',launch);const bar=panel.querySelector('.nomia-winbar');if(bar)bar.after(b);else panel.prepend(b)}
function init(){mount();new MutationObserver(rs=>{if(rs.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.id==='uxPhotoPanel'||n.querySelector?.('#uxPhotoPanel')))))mount()}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();