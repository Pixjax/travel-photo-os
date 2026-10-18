/* NØMIA Photo Search — preview only. Real geolocated Wikipedia places, photo gallery. */
(()=>{'use strict';if(window.__nomiaPhotoSearch)return;window.__nomiaPhotoSearch=true;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch(_){return ''}};
const bad=/\b(map|locator|location map|coat.of.arms|flag|seal|logo|diagram|chart|portrait|signature|emblem|svg|person|politician|footballer|actor|actress|cairn terrier)\b/i;
let seq=0,abort=null;
function api(lang,params){const u=new URL('https://'+lang+'.wikipedia.org/w/api.php');Object.entries({action:'query',format:'json',origin:'*',...params}).forEach(([k,v])=>u.searchParams.set(k,String(v)));return u}
async function get(url,signal){const r=await fetch(url,{signal});if(!r.ok)throw Error('Source indisponible ('+r.status+')');return r.json()}
function spot(p,lang){const co=p.coordinates?.[0],src=safe(p.thumbnail?.source),url=safe(p.fullurl);if(!co||!src||!url||!Number.isFinite(co.lat)||!Number.isFinite(co.lon))return null;
if(bad.test(p.title)||bad.test(src))return null;
return {id:lang+':'+p.pageid,name:p.title,lat:co.lat,lon:co.lon,src,url,lang};}
async function destination(q,lang,signal){
 const data=await get(api(lang,{generator:'search',gsrsearch:q,gsrnamespace:0,gsrlimit:15,prop:'coordinates|pageimages|info',piprop:'thumbnail',pithumbsize:520,inprop:'url'}),signal);
 const pages=Object.values(data.query?.pages||{});
 const k=q.toLocaleLowerCase().split(',')[0].trim();
 const ordered=pages.filter(p=>p.coordinates?.length).sort((a,b)=>Number(b.title.toLocaleLowerCase()===k)-Number(a.title.toLocaleLowerCase()===k));
 return ordered[0]||null;
}
async function nearby(lat,lon,lang,signal){
 const coords=lat+'|'+lon;
 const data=await get(api(lang,{generator:'geosearch',ggscoord:coords,ggsradius:10000,ggslimit:50,ggsnamespace:0,prop:'coordinates|pageimages|info',piprop:'thumbnail',pithumbsize:520,inprop:'url'}),signal);
 return Object.values(data.query?.pages||{}).map(p=>spot(p,lang)).filter(Boolean);
}
function render(items,query){const grid=document.getElementById('npsGrid'),status=document.getElementById('npsStatus');grid.replaceChildren();
 if(!items.length){status.textContent='Aucun spot avec photo et coordonnées confirmé pour « '+query+' ». Essaie une destination plus précise.';return;}
 status.textContent=items.length+' spots avec photos et coordonnées · rayon approximatif de 10 km · images Wikipédia.';
 const frag=document.createDocumentFragment();
 for(const x of items){const card=document.createElement('article');card.className='nps-card';
 const img=document.createElement('img');img.src=x.src;img.alt='Photo du lieu : '+x.name;img.loading='lazy';img.decoding='async';card.appendChild(img);
 const info=document.createElement('div');const title=document.createElement('b');title.textContent=x.name;info.append(title);
 const location=document.createElement('small');location.textContent=x.lat.toFixed(5)+', '+x.lon.toFixed(5);info.append(location);
 const link=document.createElement('a');link.href=x.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Voir la photo et ses crédits ↗';info.append(link);
 const maps=document.createElement('a');maps.href='https://www.openstreetmap.org/?mlat='+encodeURIComponent(x.lat)+'&mlon='+encodeURIComponent(x.lon)+'#map=15/'+encodeURIComponent(x.lat)+'/'+encodeURIComponent(x.lon);maps.target='_blank';maps.rel='noopener noreferrer';maps.textContent='Localiser le spot ↗';info.append(maps);
 card.append(info);frag.append(card)}
 grid.append(frag);
}
async function search(q){if(q.length<2)return;const run=++seq;abort?.abort();abort=new AbortController();const signal=abort.signal;document.getElementById('npsGrid').replaceChildren();const status=document.getElementById('npsStatus');status.textContent='Recherche des lieux géolocalisés autour de « '+q+' »…';
 try{let center;for(const lang of ['fr','en']){try{center=await destination(q,lang,signal);if(center)break}catch(e){if(signal.aborted)return}}
 if(run!==seq)return;if(!center){status.textContent='Destination introuvable avec coordonnées. Essaie « Cairns, Australia » ou le nom d’une ville.';return}
 const batches=await Promise.allSettled(['en','fr'].map(lang=>nearby(center.coordinates[0].lat,center.coordinates[0].lon,lang,signal)));
 if(run!==seq)return;
 const seen=new Set(),items=[];for(const b of batches){if(b.status!=='fulfilled')continue;for(const item of b.value){const key=item.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()+'|'+item.lat.toFixed(3)+'|'+item.lon.toFixed(3);if(seen.has(key))continue;seen.add(key);items.push(item)}}
 const own=spot(center,'fr');if(own&&!items.some(x=>x.url===own.url))items.unshift(own);
 items.sort((a,b)=>{const d=x=>Math.hypot((x.lat-center.coordinates[0].lat)*111,(x.lon-center.coordinates[0].lon)*111*Math.cos(center.coordinates[0].lat*Math.PI/180));return d(a)-d(b)});
 render(items.slice(0,70),q);
 }catch(err){if(!signal.aborted&&run===seq)status.textContent='Impossible de charger les lieux pour le moment. Réessaie plus tard.';console.warn('NØMIA Photo Search',err)}}
function show(){let modal=document.getElementById('nomiaPhotoSearch');if(!modal){modal=document.createElement('section');modal.id='nomiaPhotoSearch';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Recherche de spots photo géolocalisés');modal.innerHTML='<div class="nps-panel"><header><div><b>Explore Photos</b><small>Vrais lieux · photos · coordonnées GPS</small></div><button type="button" data-close aria-label="Fermer">✕</button></header><form id="npsForm"><input id="npsQuery" type="search" placeholder="Ex. Cairns, Australia" required minlength="2" maxlength="110" aria-label="Destination"><button type="submit">Rechercher</button></form><p class="nps-status" id="npsStatus">Saisis une destination pour découvrir ses spots géolocalisés.</p><div class="nps-grid" id="npsGrid"></div></div>';document.body.append(modal);const close=()=>{modal.hidden=true;seq++;abort?.abort()};modal.querySelector('[data-close]').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});modal.querySelector('form').onsubmit=e=>{e.preventDefault();search(modal.querySelector('#npsQuery').value.trim())}}modal.hidden=false;modal.querySelector('#npsQuery').focus()}
function mount(){if(document.getElementById('nomiaPhotoSearchLauncher'))return;const p=document.getElementById('uxPhotoPanel');if(!p)return;const b=document.createElement('button');b.id='nomiaPhotoSearchLauncher';b.type='button';b.textContent='⌕ Explorer des photos de spots';b.onclick=show;const bar=p.querySelector('.nomia-winbar');if(bar)bar.after(b);else p.prepend(b)}
function init(){mount();new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.id==='uxPhotoPanel'||n.querySelector?.('#uxPhotoPanel')))))mount()}).observe(document.body,{childList:true,subtree:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=document.getElementById('nomiaPhotoSearch');if(m&&!m.hidden){m.hidden=true;seq++;abort?.abort()}}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();