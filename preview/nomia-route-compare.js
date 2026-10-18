/* NØMIA preview: route comparison for existing day optimizer. No writes. */
(()=>{'use strict';if(window.__nomiaRouteCompare)return;window.__nomiaRouteCompare=true;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount(){const status=document.getElementById('optStatus');if(!status||document.getElementById('nomiaRouteCompareBtn'))return;
const btn=document.createElement('button');btn.type='button';btn.id='nomiaRouteCompareBtn';btn.className='btn';btn.textContent='Comparer avant / après';btn.title='Prévisualiser sans modifier la journée';status.parentElement.insertBefore(btn,status);
const output=document.createElement('div');output.id='nomiaRouteCompareResult';output.setAttribute('aria-live','polite');status.after(output);
const get=name=>{try{return window[name]}catch(_){return null}};
btn.onclick=()=>{try{
 const day=get('currentOptDay')?.(),spots=get('activeSpots')?.().filter(p=>p.date===day)||[];
 const valid=p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon));
 if(spots.length<2){output.textContent='Ajoute au moins deux spots pour cette journée.';return}
 const prior=get('plannedItemsForDay')?.(day)?.map(x=>x.p)||spots;
 const proposed=get('optimizeDayOrder')?.(spots)||spots;
 const distance=arr=>arr.reduce((sum,p,i)=>{if(!i||!valid(arr[i-1])||!valid(p))return sum;return sum+get('haversine')(arr[i-1],p)},0);
 const oldKm=distance(prior),newKm=distance(proposed),diff=oldKm-newKm;
 output.innerHTML='<strong>Comparaison pour '+esc(day)+'</strong><p>Ordre actuel : '+oldKm.toFixed(1)+' km · Ordre proposé : '+newKm.toFixed(1)+' km (distances à vol d’oiseau).</p><p>'+ (diff>0?'Réduction indicative : '+diff.toFixed(1)+' km.':diff<0?'Le nouvel ordre ajoute '+(-diff).toFixed(1)+' km mais peut privilégier les créneaux photo.':'Distance indicative inchangée.')+'</p><ol>'+proposed.map(p=>'<li>'+esc(p.name)+'</li>').join('')+'</ol><small>Pas de calcul routier ni de temps réel. Aucun changement enregistré : utilise « Optimiser cette journée » pour appliquer.</small>';
 }catch(err){console.warn('Comparaison itinéraire',err);output.textContent='Comparaison indisponible pour cette journée.'}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
