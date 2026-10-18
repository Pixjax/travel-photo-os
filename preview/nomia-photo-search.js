/* NØMIA Photo Search — preview-only unified image search links.
   Does not scrape, proxy or embed third-party search results. */
(()=>{'use strict';if(window.__nomiaPhotoSearch)return;window.__nomiaPhotoSearch=true;
let panel=null;
function urlFor(service,q){
 const value=encodeURIComponent(q.trim()+' photography spots');
 if(service==='google')return 'https://www.google.com/search?tbm=isch&q='+value;
 if(service==='flickr')return 'https://www.flickr.com/search/?text='+value;
 if(service==='pinterest')return 'https://www.pinterest.com/search/pins/?q='+value;
 if(service==='unsplash')return 'https://unsplash.com/s/photos/'+encodeURIComponent(q.trim());
 return '';
}
const services=[['google','Google Images','Recherche très large'],['flickr','Flickr','Photos de photographes'],['pinterest','Pinterest','Inspiration de lieux'],['unsplash','Unsplash','Paysages et voyage']];
function show(){
 if(!panel){panel=document.createElement('section');panel.id='nomiaPhotoSearch';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Recherche photo multi-sources');
 panel.innerHTML='<div class="nps-panel"><header><div><b>Explore Photos</b><small>Google Images · Flickr · Pinterest · Unsplash</small></div><button type="button" data-close aria-label="Fermer">✕</button></header><form id="npsForm"><input id="npsQuery" type="search" placeholder="Ex. Cairns, Australie" required minlength="2" maxlength="110" aria-label="Destination"><button type="submit">Rechercher</button></form><p class="nps-status" id="npsStatus">Recherche des plus beaux spots photo, sans abonnement. Choisis ensuite ta source.</p><div class="nps-source-grid" id="npsSources"></div><p class="nps-note">Les résultats s’ouvrent sur le site de chaque plateforme. Leurs images ne sont pas copiées dans NØMIA et leur emplacement GPS n’est pas garanti.</p></div>';
 document.body.append(panel);panel.querySelector('[data-close]').onclick=()=>panel.hidden=true;
 panel.addEventListener('click',e=>{if(e.target===panel)panel.hidden=true});
 panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();render(panel.querySelector('#npsQuery').value)});
 }
 panel.hidden=false;panel.querySelector('#npsQuery').focus();
}
function render(q){q=q.trim();if(q.length<2)return;const wrap=panel.querySelector('#npsSources');wrap.replaceChildren();panel.querySelector('#npsStatus').textContent='Recherche : '+q+' · Ouvre une source pour voir ses photographies.';
 for(const [id,name,desc] of services){const a=document.createElement('a');a.className='nps-source';a.href=urlFor(id,q);a.target='_blank';a.rel='noopener noreferrer';const b=document.createElement('b');b.textContent=name;const sm=document.createElement('small');sm.textContent=desc+' ↗';a.append(b,sm);wrap.append(a)}
}
function mount(){if(document.getElementById('nomiaPhotoSearchLauncher'))return;const p=document.getElementById('uxPhotoPanel');if(!p)return;const btn=document.createElement('button');btn.id='nomiaPhotoSearchLauncher';btn.type='button';btn.textContent='⌕ Explorer des photos de spots';btn.onclick=show;const bar=p.querySelector('.nomia-winbar');if(bar)bar.after(btn);else p.prepend(btn)}
function init(){mount();new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.id==='uxPhotoPanel'||n.querySelector?.('#uxPhotoPanel')))))mount()}).observe(document.body,{childList:true,subtree:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel&&!panel.hidden)panel.hidden=true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();