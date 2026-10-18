/* NØMIA Photo Search — preview-only unified image search links.
   Does not scrape, proxy or embed third-party search results. */
(()=>{'use strict';if(window.__nomiaPhotoSearch)return;window.__nomiaPhotoSearch=true;
let panel=null,controller=null,searchNumber=0;
const valid=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch(_){return ''}};
const excluded=/\b(portrait|headshot|selfie|logo|flag|coat of arms|map of|diagram|politician|actor|actress|cairn terrier|dog|cat|animal)\b/i;
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
 panel.innerHTML='<div class="nps-panel"><header><div><b>Explore Photos</b><small>Google Images · Flickr · Pinterest · Unsplash</small></div><button type="button" data-close aria-label="Fermer">✕</button></header><form id="npsForm"><input id="npsQuery" type="search" placeholder="Ex. Cairns, Australie" required minlength="2" maxlength="110" aria-label="Destination"><button type="submit">Rechercher</button></form><p class="nps-status" id="npsStatus">Galerie intégrée de paysages. Certains résultats peuvent ne pas correspondre au lieu recherché.</p><div class="nps-grid" id="npsGrid"></div><details class="nps-external"><summary>Rechercher aussi sur Google Images, Flickr, Pinterest…</summary><div class="nps-source-grid" id="npsSources"></div></details><p class="nps-note">Les images de la galerie proviennent de sources ouvertes. Google, Flickr et Pinterest s’ouvrent séparément.</p></div>';
 document.body.append(panel);panel.querySelector('[data-close]').onclick=()=>{panel.hidden=true;searchNumber++;controller?.abort()};
 panel.addEventListener('click',e=>{if(e.target===panel){panel.hidden=true;searchNumber++;controller?.abort()}});
 panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();render(panel.querySelector('#npsQuery').value)});
 }
 panel.hidden=false;panel.querySelector('#npsQuery').focus();
}
async function openverse(q,signal){const url=new URL('https://api.openverse.org/v1/images/');url.searchParams.set('q',q);url.searchParams.set('page_size','30');const r=await fetch(url,{signal});if(!r.ok)throw Error('Openverse '+r.status);const body=await r.json();return(body.results||[]).map(p=>({name:p.title||'',image:valid(p.thumbnail),url:valid(p.foreign_landing_url||p.detail_url),author:p.creator||'',license:p.license||'',source:'Openverse'})).filter(p=>p.image&&p.url&&!excluded.test(p.name))}
async function commons(q,signal){const u=new URL('https://commons.wikimedia.org/w/api.php');for(const [k,v] of Object.entries({action:'query',origin:'*',format:'json',generator:'search',gsrsearch:q+' filetype:bitmap',gsrnamespace:'6',gsrlimit:'30',prop:'imageinfo',iiprop:'url|mime',iiurlwidth:'500'}))u.searchParams.set(k,v);const r=await fetch(u,{signal});if(!r.ok)throw Error('Commons '+r.status);const body=await r.json();return Object.values(body.query?.pages||{}).map(p=>{const i=p.imageinfo?.[0];return{name:p.title.replace(/^File:/,''),image:valid(i?.thumburl),url:valid(i?.descriptionurl),source:'Wikimedia Commons'}}).filter(p=>p.image&&p.url&&!excluded.test(p.name)&&/\.(jpe?g|webp|png)$/i.test(p.name))}
function addLinks(q){const wrap=panel.querySelector('#npsSources');wrap.replaceChildren();for(const [id,name,desc] of services){const a=document.createElement('a');a.className='nps-source';a.href=urlFor(id,q);a.target='_blank';a.rel='noopener noreferrer';const b=document.createElement('b');b.textContent=name;const sm=document.createElement('small');sm.textContent=desc+' ↗';a.append(b,sm);wrap.append(a)}}
async function render(q){q=q.trim();if(q.length<2)return;addLinks(q);const id=++searchNumber;controller?.abort();controller=new AbortController();const signal=controller.signal,grid=panel.querySelector('#npsGrid'),status=panel.querySelector('#npsStatus');grid.replaceChildren();status.textContent='Recherche de photos pour « '+q+' »…';
const searches=[openverse(q+' landscape photography',signal),openverse(q+' scenic beach waterfall nature',signal),commons(q+' landscape',signal)];const responses=await Promise.allSettled(searches);if(id!==searchNumber)return;
const seen=new Set(),images=[];for(const result of responses){if(result.status!=='fulfilled')continue;for(const photo of result.value){const key=photo.image.split('?')[0].replace(/\/\d+px-/,'/');if(seen.has(key))continue;seen.add(key);images.push(photo)}}
if(!images.length){status.textContent='Aucune image disponible ici pour cette destination. Essaie un spot plus précis ou utilise les autres moteurs ci-dessous.';return}
status.textContent=images.length+' images affichées directement · sources ouvertes · localisation des images non vérifiée.';
const fragment=document.createDocumentFragment();for(const p of images){const card=document.createElement('article');card.className='nps-card';const image=document.createElement('img');image.loading='lazy';image.decoding='async';image.src=p.image;image.alt=p.name;card.append(image);const info=document.createElement('div');const name=document.createElement('b');name.textContent=p.name||'Photographie';const credit=document.createElement('small');credit.textContent=p.source+(p.author?' · '+p.author:'')+(p.license?' · '+p.license:'');const link=document.createElement('a');link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Source et crédits ↗';info.append(name,credit,link);card.append(info);fragment.append(card)}grid.append(fragment);
}

function mount(){if(document.getElementById('nomiaPhotoSearchLauncher'))return;const p=document.getElementById('uxPhotoPanel');if(!p)return;const btn=document.createElement('button');btn.id='nomiaPhotoSearchLauncher';btn.type='button';btn.textContent='⌕ Explorer des photos de spots';btn.onclick=show;const bar=p.querySelector('.nomia-winbar');if(bar)bar.after(btn);else p.prepend(btn)}
function init(){mount();new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.id==='uxPhotoPanel'||n.querySelector?.('#uxPhotoPanel')))))mount()}).observe(document.body,{childList:true,subtree:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel&&!panel.hidden)panel.hidden=true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();