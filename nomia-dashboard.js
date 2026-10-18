// NØMIA premium dashboard, non-destructive layer over existing Home.
(function(){
 if(window.__nomiaDashboard)return;window.__nomiaDashboard=true;
 let chosen=null,root=null,refreshing=false,legacyTrips=false;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const arr=v=>Array.isArray(v)?v:[];
 const fmt=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(n)||0);
 const open=(part)=>{
   const t=trip();if(!t){if(typeof openTripEditor==='function')openTripEditor();return}
   if(typeof openTrip==='function')openTrip(t.id);
   setTimeout(()=>{
     try{
       if(part==='photo')window.openPhotoExperience?.();
       if(part==='day')window.openDayExperience?.();
       if(part==='voyage')window.openVoyageHub?.();
       if(part==='budget'&&typeof openPlanner==='function')openPlanner();
       if(part==='favs'&&typeof setMode==='function')setMode('favs');
       if(part==='map'&&typeof setMode==='function')setMode('explore');
     }catch(e){console.warn('NØMIA dashboard navigation',e)}
   },120);
 };
 const trip=()=>{try{return arr(trips).find(t=>t.id===chosen)||arr(trips)[0]||null}catch(e){return null}};
 const data=t=>{try{return typeof loadData==='function'?loadData(t.id):{}}catch(e){return {}}};
 const spots=(t,d)=>{let a=arr(d.customSpots);try{if(t.id==='japan-2026'&&typeof BUILTIN_JAPAN_SPOTS!=='undefined')a=[...BUILTIN_JAPAN_SPOTS,...a]}catch(e){}return a};
 const spotDay=(t,sp)=>{const dates=[...new Set(sp.map(p=>p.date).filter(Boolean))].sort();if(!dates.length)return null;const iso=new Date().toISOString().slice(0,10);return dates.find(x=>x===iso)||dates.find(x=>x>iso)||dates[dates.length-1]};
 const currency=(n,t)=>{try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:t.currency||'EUR',maximumFractionDigits:0}).format(Number(n)||0)}catch(e){return fmt(n)+' '+(t.currency||'EUR')}};
 const dateLabel=v=>{if(!v)return '';try{const d=new Date(v+'T12:00:00');if(!isNaN(d))return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}catch(e){}return String(v)};
 const header=(t)=>`<header class="nd-top"><div class="nd-brand"><div class="nd-mark" aria-hidden="true">✧</div><div><div class="nd-brandword">NØMIA</div><div class="nd-brandtag">VOYAGER · PLANIFIER · PHOTOGRAPHIER</div></div></div><button class="nd-search" data-go="trips">⌕ &nbsp; Rechercher une destination, un lieu, une expérience…</button><div class="nd-greeting"><div>Bienvenue <b>dans NØMIA</b></div><div class="nd-avatar" aria-hidden="true"></div></div></header>`;
 const sidebar=()=>`<aside class="nd-side" aria-label="Navigation NØMIA"><button class="active" data-go="home"><span class="nd-symbol">⌂</span>Accueil</button><button data-go="trips"><span class="nd-symbol">▢</span>Voyages</button><button data-go="map"><span class="nd-symbol">◇</span>Carte</button><button data-go="photo"><span class="nd-symbol">◎</span>Photos</button><button data-go="budget"><span class="nd-symbol">◴</span>Budget</button><button data-go="favs"><span class="nd-symbol">♡</span>Favoris</button><button data-go="trips"><span class="nd-symbol">⚙</span>Gérer</button></aside>`;
 const mobile=()=>`<nav class="nd-mobilebar" aria-label="Menu NØMIA"><button data-go="home"><span>⌂</span>Accueil</button><button data-go="map"><span>◇</span>Carte</button><button data-go="photo"><span>◎</span>Photo</button><button data-go="voyage"><span>▢</span>Voyage</button></nav>`;
 function view(){
   const t=trip(),d=t?data(t):{},sp=t?spots(t,d):[],day=t?spotDay(t,sp):null;
   const today=day?sp.filter(p=>p.date===day):[];
   const reservations=arr(d.reservations),expenses=arr(d.expenses),spent=expenses.reduce((s,x)=>s+(Number(x.amount)||0),0),budget=Number(d.budgetTotal)||0;
   const next=today.find(p=>!arr(d.done).includes(p.id))||today[0]||null;
   const city=next?.city||t?.startCity||t?.country||'Votre prochaine destination';
   const selections=arr(trips);
   const tripOptions=selections.map(x=>`<option value="${esc(x.id)}" ${x.id===t?.id?'selected':''}>${esc(x.name)}</option>`).join('');
   const timeline=today.slice(0,5).map((p,i)=>{const when=(d.dayPlans?.[day]||[]).find(x=>String(x.spotId)===String(p.uid||p.id));return `<button class="nd-step" data-go="day"><span class="nd-hour">${esc(when?.time||'—:—')}</span><span class="nd-steptext"><strong>${esc(p.name||'Spot')}</strong><small>${esc([p.category,p.city].filter(Boolean).join(' · ')||'Étape du voyage')}</small></span><span class="nd-chev">›</span></button>`}).join('');
   const res=reservations.slice(0,2).map(r=>`<div class="nd-resitem"><span class="nd-resicon">${r.type==='Transport'?'🚆':'▣'}</span><div style="flex:1;min-width:0"><strong>${esc(r.title||'Réservation')}</strong><small>${esc(r.date||r.ref||'Date non précisée')}</small></div><span class="nd-confirm">Enregistré</span></div>`).join('');
   const name=t?.name||'Votre prochain voyage';
   const count=selections.length;
   const html=`${sidebar()}${header(t)}<div class="nd-card nd-hero"><button class="nd-hero-more" data-go="map">Voir la carte complète →</button><div class="nd-herocopy"><div class="nd-small">VOYAGE ACTIF · ${count} voyage${count>1?'s':''} <select id="ndTripSelect" aria-label="Choisir un voyage" style="margin-left:12px;background:#071c30;color:#f2d294;border:1px solid #47627b;border-radius:8px;padding:5px;max-width:130px">${tripOptions}</select></div><h1>${esc(city)}</h1><p>${esc(name)}${day?' · Programme du '+dateLabel(day):''}<br>${today.length} étape${today.length>1?'s':''} planifiée${today.length>1?'s':''} · ${sp.length} spots au total</p><button class="nd-goldbtn" data-go="voyage">Voir le voyage　 →</button></div><div class="nd-mapdots" aria-hidden="true">${today.slice(0,3).map(p=>`<span class="nd-pin">${esc((p.name||'Spot').slice(0,22))}</span>`).join('')}</div></div>
   <div class="nd-row1" style="margin-top:12px"><section class="nd-card nd-box"><div class="nd-heading"><span class="nd-small">◷　PROCHAIN DÉPLACEMENT</span><button class="nd-link" data-go="day">Tout voir →</button></div><div class="nd-next"><span class="nd-round">↗</span><div><b>${esc(next?.name||'Aucun déplacement prévu')}</b><p>${esc(next?.city||'Ajoutez des spots à votre journée')}</p></div><button class="nd-est" data-go="map">Voir sur la carte　›</button></div></section><section class="nd-card nd-box nd-weather"><div class="nd-small">☀　CONDITIONS PHOTO</div><div class="nd-temp">Soleil & météo</div><p>Consultez les prévisions et la lumière<br>dans les outils Photo.</p><button class="nd-link" data-go="photo" style="margin-top:12px;padding:0">Ouvrir Photo Pro →</button></section></div>
   <div class="nd-row2"><section class="nd-card nd-box"><div class="nd-heading"><span class="nd-small">▤　PROGRAMME DU JOUR ${day?'· '+esc(dateLabel(day)):''}</span><button class="nd-link" data-go="day">Programme complet →</button></div><div class="nd-timeline">${timeline||'<div class="nd-empty">Pas encore d’activité prévue. Ajoutez vos premiers spots dans la carte.</div>'}</div></section><div class="nd-stack"><section class="nd-card nd-box"><div class="nd-heading"><span class="nd-small">▣　RÉSERVATIONS</span><button class="nd-link" data-go="voyage">Voir tout →</button></div><div class="nd-res">${res||'<div class="nd-empty">Aucune réservation enregistrée.</div>'}</div></section><section class="nd-card nd-box"><div class="nd-heading"><span class="nd-small">◴　BUDGET</span><button class="nd-link" data-go="budget">Voir les détails →</button></div><div class="nd-budgetmain">${t?currency(spent,t):'—'} <span>/ ${budget?currency(budget,t):'budget non défini'}</span></div><div class="nd-progress"><i style="width:${budget?Math.max(0,Math.min(100,spent/budget*100)):0}%"></i></div><div class="nd-categories"><span class="nd-cat">${expenses.length} dépenses</span><span class="nd-cat">${esc(t?.currency||'EUR')}</span></div></section></div></div>
   <div class="nd-quick"><button class="nd-tile" data-go="map"><span>◇</span><b>Explorer la carte</b><small>Lieux, itinéraires, transports →</small></button><button class="nd-tile" data-go="photo"><span>◎</span><b>Photo Pro</b><small>Lumière, repérages, planétarium →</small></button><button class="nd-tile" data-go="voyage"><span>▢</span><b>Mon voyage</b><small>Programme, notes, documents →</small></button><button class="nd-tile" data-go="favs"><span>♡</span><b>Mes favoris</b><small>Spots et lieux sauvegardés →</small></button></div>${mobile()}`;
   root.innerHTML=html;root.style.display='';
 }
 function install(){
   if(legacyTrips)return;
   const home=document.getElementById('home');if(!home||typeof trips==='undefined')return;
   home.classList.add('nomia-home');
   if(!root){root=document.createElement('main');root.className='nomia-dash';root.id='nomiaDashboard';home.appendChild(root);
     root.addEventListener('change',e=>{if(e.target.id==='ndTripSelect'){chosen=e.target.value;view()}});
     root.addEventListener('click',e=>{const btn=e.target.closest('[data-go]');if(!btn)return;const action=btn.dataset.go;
       if(action==='home'){view();return}
       if(action==='trips'){legacyTrips=true;home.classList.remove('nomia-home');root.style.display='none';const original=home.querySelector('.homeInner');if(original)original.style.display='';return}
       open(action);
     });
   }
   if(refreshing)return;refreshing=true;try{view()}finally{refreshing=false}
 }
 function boot(){install();const old=window.renderHome;if(typeof old==='function'&&!old.__nomiaWrapped){
   const wrapped=function(){const result=old.apply(this,arguments);setTimeout(install,0);return result};wrapped.__nomiaWrapped=true;window.renderHome=wrapped;try{renderHome=wrapped}catch(e){}
 }
 const prevOpenTrip=window.openTrip;
 if(typeof prevOpenTrip==='function'){
   const launch=function(id){const r=prevOpenTrip.apply(this,arguments);
     const home=document.getElementById('home');
     if(home&&typeof activeTrip!=='undefined'&&activeTrip){home.classList.add('hide');home.style.pointerEvents='none'}
     return r;
   };
   window.openTrip=launch;try{openTrip=launch}catch(e){}
 }
 const prevShowHome=window.showHome;if(typeof prevShowHome==='function'){const back=function(){legacyTrips=false;const r=prevShowHome.apply(this,arguments);const home=document.getElementById('home');if(home){home.style.pointerEvents='';home.classList.remove('hide')}setTimeout(install,0);return r};window.showHome=back;try{showHome=back}catch(e){}}
 window.nomiaDashboardRefresh=install;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,700));else setTimeout(boot,700);
})();
