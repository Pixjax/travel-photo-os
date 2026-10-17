// Travel Photo OS — Voyage Hub + Departure mode
(function(){
  let weatherToken=0;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uidOf=p=>{try{return String(spotUid(p))}catch(e){return String(p?.id??p?.name??'')}};
  const MONTHS={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,MAI:5,JUN:6,JUI:7,JUL:7,AUG:8,AOU:8,SEP:9,OCT:10,NOV:11,DEC:12,DÉC:12};

  function ensureData(){
    if(!store)return;
    if(!Array.isArray(store.reservations))store.reservations=[];
    if(!Array.isArray(store.travelDocs))store.travelDocs=[];
    if(!store.departurePrefs)store.departurePrefs={bufferMin:20};
  }
  function allDays(){try{return typeof allDates==='function'?allDates():[]}catch(e){return []}}
  function defaultDay(){try{return typeof tripTodayDate==='function'?tripTodayDate():(allDays()[0]||null)}catch(e){return allDays()[0]||null}}
  function pretty(d){try{return typeof prettyDay==='function'?prettyDay(d):d}catch(e){return d}}
  function spotsFor(d){try{return activeSpots().filter(p=>p.date===d)}catch(e){return []}}
  function validCoord(p){return Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon))}
  function parseDay(label){
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(label||'')))return new Date(String(label)+'T12:00:00');
    const m=String(label||'').trim().toUpperCase().match(/^(\d{1,2})\s+([A-ZÀ-Ü]{3,})/);if(!m)return null;
    const month=MONTHS[m[2]]||MONTHS[m[2].slice(0,3)];if(!month)return null;
    let year=new Date().getFullYear();if(activeTrip?.start&&/^\d{4}-/.test(activeTrip.start))year=Number(activeTrip.start.slice(0,4));
    return new Date(year,month-1,Number(m[1]),12,0,0);
  }
  function isoDay(label){const d=parseDay(label);if(!d||!Number.isFinite(d.getTime()))return null;return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function tripDays(){if(!activeTrip?.start||!activeTrip?.end)return allDays().length;const a=new Date(activeTrip.start+'T12:00:00'),b=new Date(activeTrip.end+'T12:00:00');if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime()))return allDays().length;return Math.max(1,Math.round((b-a)/86400000)+1)}
  function moneySafe(v){try{return typeof money==='function'?money(v):String(Math.round(v||0))}catch(e){return String(Math.round(v||0))}}
  function totalSpent(){return (store?.expenses||[]).reduce((s,e)=>s+Number(e.amount||0),0)}
  function doneCount(){try{return activeSpots().filter(p=>isDone(p)).length}catch(e){return (store?.done||[]).length}}
  function checklistProgress(){const a=store?.checklist||[];return {done:a.filter(x=>x.d).length,total:a.length}}
  function members(){return store?.collab?.members||[]}
  function isCloud(){return !!activeTrip?.cloudTripId}
  function fmtDate(v){if(!v)return '—';try{return new Date(v+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}catch(e){return v}}
  function safeSave(){try{saveData()}catch(e){try{localStorage.setItem(DATA_PREFIX+activeTripId,JSON.stringify(store))}catch(_){}}}

  function ensureVoyageUI(){
    if(!document.getElementById('uxVoyagePanel')){
      const p=document.createElement('section');p.id='uxVoyagePanel';p.className='uxVoyagePanel';
      p.innerHTML='<div class="uxVoyageHead"><div class="uxVoyageHeadTop"><div><span class="uxVoyageKicker">Centre de contrôle</span><h2 id="uxVoyageTitle">Voyage</h2></div><button class="uxVoyageClose" id="uxVoyageClose">✕</button></div></div><div class="uxVoyageScroll" id="uxVoyageScroll"></div>';
      document.body.appendChild(p);p.querySelector('#uxVoyageClose').onclick=closeVoyageHub;p.querySelector('#uxVoyageScroll').addEventListener('click',voyageClick);
    }
    if(!document.getElementById('uxDeparturePanel')){
      const p=document.createElement('section');p.id='uxDeparturePanel';p.className='uxDeparturePanel';
      p.innerHTML='<div class="uxDepartureHead"><div class="uxDepartureHeadTop"><div><span class="uxDepartureKicker">Mode terrain</span><h2 id="uxDepartureTitle">Départ</h2></div><button class="uxDepartureClose" id="uxDepartureClose">✕</button></div></div><div class="uxDepartureScroll" id="uxDepartureScroll"></div>';
      document.body.appendChild(p);p.querySelector('#uxDepartureClose').onclick=closeDeparture;p.querySelector('#uxDepartureScroll').addEventListener('click',departureClick);
    }
    if(window.innerWidth>760&&!document.getElementById('uxVoyageFab')){const b=document.createElement('button');b.id='uxVoyageFab';b.className='uxVoyageFab';b.textContent='✈ Voyage';b.onclick=openVoyageHub;document.body.appendChild(b)}
  }

  function openVoyageHub(){if(!activeTrip)return;ensureData();ensureVoyageUI();document.getElementById('uxDeparturePanel')?.classList.remove('show');document.body.classList.remove('uxDepartureOpen');document.getElementById('uxVoyagePanel').classList.add('show');document.body.classList.add('uxVoyageOpen');renderVoyageHub();setNav('trip')}
  function closeVoyageHub(){document.getElementById('uxVoyagePanel')?.classList.remove('show');document.body.classList.remove('uxVoyageOpen');setNav('map')}
  function setNav(id){document.querySelectorAll('#uxNav button').forEach(b=>b.classList.toggle('on',b.dataset.ux===id))}

  function renderVoyageHub(){
    ensureData();const w=document.getElementById('uxVoyageScroll');if(!w||!activeTrip)return;
    document.getElementById('uxVoyageTitle').textContent=activeTrip.name||'Voyage';
    const spots=activeSpots(),done=doneCount(),spent=totalSpent(),budget=Number(store?.budgetTotal||0),cp=checklistProgress(),m=members(),pct=spots.length?Math.round(done/spots.length*100):0;
    const res=(store.reservations||[]).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).map(r=>`<div class="uxVoyageRow"><div><b>${esc(r.title||'Réservation')}</b><span>${esc([r.date?r.date:'',r.type||'',r.ref||''].filter(Boolean).join(' · '))}</span></div>${r.url?`<button data-open-url="${esc(r.url)}">↗</button>`:''}<button data-del-res="${esc(r.id)}">✕</button></div>`).join('')||'<div class="uxVoyageHint">Aucune réservation enregistrée.</div>';
    const docs=(store.travelDocs||[]).slice().map(d=>`<div class="uxVoyageRow"><div><b>${esc(d.title||'Document')}</b><span>${esc(d.note||d.url||'')}</span></div>${d.url?`<button data-open-url="${esc(d.url)}">↗</button>`:''}<button data-del-doc="${esc(d.id)}">✕</button></div>`).join('')||'<div class="uxVoyageHint">Ajoute ici des liens vers billets, confirmations ou documents. Les fichiers eux-mêmes ne sont pas encore téléversés dans Supabase.</div>';
    w.innerHTML=`<div class="uxVoyageHero"><div class="uxVoyageHeroTop"><div><b>${esc(activeTrip.emoji||'✈️')} ${esc(activeTrip.name||'Voyage')}</b><span>${esc(fmtDate(activeTrip.start))} → ${esc(fmtDate(activeTrip.end))} · ${tripDays()} jours · ${esc(activeTrip.country||'')}</span></div><span class="uxVoyageCloud ${isCloud()?'ok':''}">${isCloud()?'● Cloud':'Local'}</span></div><div class="uxVoyageStats"><div class="uxVoyageStat"><small>Spots</small><b>${spots.length}</b></div><div class="uxVoyageStat"><small>Faits</small><b>${done}</b></div><div class="uxVoyageStat"><small>Budget</small><b>${moneySafe(spent)}</b></div><div class="uxVoyageStat"><small>Membres</small><b>${m.length||1}</b></div></div><button class="uxDepartureStart" data-start-departure>▶ Préparer ma journée</button></div>
    <section class="uxVoyageSection"><div class="uxVoyageSectionHead"><h3>Progression</h3><span>${pct}%</span></div><div class="uxVoyageProgress"><i style="width:${pct}%"></i></div><div class="uxVoyageProgressText"><span>${done}/${spots.length} spots terminés</span><span>${cp.done}/${cp.total} checklist${budget?` · ${moneySafe(Math.max(0,budget-spent))} restant`:''}</span></div></section>
    <section class="uxVoyageSection"><div class="uxVoyageSectionHead"><h3>Outils</h3><span>tout au même endroit</span></div><div class="uxVoyageActions"><button class="uxVoyageAction primary" data-tool="day"><b>◷ Journée</b><span>Planning, météo et timeline</span></button><button class="uxVoyageAction" data-tool="photo"><b>✦ Photo</b><span>Lumière, focale et conditions</span></button><button class="uxVoyageAction" data-tool="budget"><b>◫ Budget</b><span>Dépenses et budget global</span></button><button class="uxVoyageAction" data-tool="check"><b>✓ Checklist</b><span>${cp.total?cp.done+'/'+cp.total+' terminés':'Préparer le voyage'}</span></button><button class="uxVoyageAction" data-tool="collab"><b>👥 Membres</b><span>Partage, votes et dépenses</span></button><button class="uxVoyageAction" data-tool="ultimate"><b>◆ Outils avancés</b><span>Optimisation et modules</span></button></div></section>
    <section class="uxVoyageSection"><div class="uxVoyageSectionHead"><h3>Réservations</h3><span>${store.reservations.length}</span></div><div class="uxVoyageRows">${res}</div><div class="uxVoyageForm"><input id="uxResTitle" placeholder="Hôtel, train, activité…"><div class="uxVoyageFormGrid"><input id="uxResDate" placeholder="11 NOV ou 2026-11-11"><select id="uxResType"><option>Hôtel</option><option>Transport</option><option>Activité</option><option>Restaurant</option><option>Autre</option></select></div><input id="uxResRef" placeholder="Référence / heure / note"><input id="uxResUrl" placeholder="Lien de réservation (optionnel)"><button class="uxVoyageAdd" data-add-res>Ajouter la réservation</button></div></section>
    <section class="uxVoyageSection"><div class="uxVoyageSectionHead"><h3>Documents & billets</h3><span>${store.travelDocs.length}</span></div><div class="uxVoyageRows">${docs}</div><div class="uxVoyageForm"><input id="uxDocTitle" placeholder="Billet, assurance, confirmation…"><input id="uxDocNote" placeholder="Note / référence"><input id="uxDocUrl" placeholder="Lien vers le document"><button class="uxVoyageAdd" data-add-doc>Ajouter le lien</button></div></section>`;
  }

  function voyageClick(e){
    const t=e.target.closest('[data-tool]');if(t){const k=t.dataset.tool;closeVoyageHub();setTimeout(()=>{try{if(k==='day'&&window.openDayExperience)return window.openDayExperience();if(k==='photo'&&window.openPhotoExperience)return window.openPhotoExperience();if(k==='budget')return openPlanner();if(k==='check')return openChecklist();if(k==='collab')return openCollab();if(k==='ultimate')return openUltimate()}catch(_){}},60);return}
    if(e.target.closest('[data-start-departure]')){openDeparture();return}
    const url=e.target.closest('[data-open-url]')?.dataset.openUrl;if(url){try{window.open(url,'_blank','noopener')}catch(_){}return}
    const dr=e.target.closest('[data-del-res]');if(dr){store.reservations=store.reservations.filter(x=>String(x.id)!==String(dr.dataset.delRes));safeSave();renderVoyageHub();return}
    const dd=e.target.closest('[data-del-doc]');if(dd){store.travelDocs=store.travelDocs.filter(x=>String(x.id)!==String(dd.dataset.delDoc));safeSave();renderVoyageHub();return}
    if(e.target.closest('[data-add-res]')){const title=document.getElementById('uxResTitle')?.value.trim();if(!title)return toast?.('Nom requis');store.reservations.push({id:'res_'+Date.now().toString(36),title,date:document.getElementById('uxResDate')?.value.trim()||'',type:document.getElementById('uxResType')?.value||'Autre',ref:document.getElementById('uxResRef')?.value.trim()||'',url:document.getElementById('uxResUrl')?.value.trim()||''});safeSave();renderVoyageHub();return}
    if(e.target.closest('[data-add-doc]')){const title=document.getElementById('uxDocTitle')?.value.trim();if(!title)return toast?.('Nom requis');store.travelDocs.push({id:'doc_'+Date.now().toString(36),title,note:document.getElementById('uxDocNote')?.value.trim()||'',url:document.getElementById('uxDocUrl')?.value.trim()||''});safeSave();renderVoyageHub();return}
  }

  function plannedItems(day){
    const arr=spotsFor(day),by=new Map(arr.map(p=>[uidOf(p),p])),plan=store?.dayPlans?.[day];
    if(Array.isArray(plan)&&plan.length){const out=plan.map(x=>({p:by.get(String(x.spotId)),time:x.time||''})).filter(x=>x.p);const used=new Set(out.map(x=>uidOf(x.p)));arr.filter(p=>!used.has(uidOf(p))).forEach(p=>out.push({p,time:''}));return out}
    return arr.slice().sort((a,b)=>(Number(a.step)||999)-(Number(b.step)||999)).map((p,i)=>({p,time:String(8+Math.min(i,10)).padStart(2,'0')+':00'}));
  }
  function sunInfo(day,p){if(!window.SunCalc||!validCoord(p))return null;try{const d=parseDay(day)||new Date(),t=SunCalc.getTimes(d,Number(p.lat),Number(p.lon));const f=x=>x&&Number.isFinite(x.getTime())?x.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';return {rise:f(t.sunrise),goldAM:f(t.goldenHourEnd),goldPM:f(t.goldenHour),set:f(t.sunset)}}catch(e){return null}}
  function subtractMin(hhmm,min){const m=String(hhmm||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return hhmm||'—';let n=Number(m[1])*60+Number(m[2])-min;while(n<0)n+=1440;n%=1440;return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
  function suggestedDeparture(items,sun){const first=items[0]?.time||'08:00',buffer=Number(store?.departurePrefs?.bufferMin||20);const sched=subtractMin(first,buffer);if(sun?.rise&&sun.rise!=='—'&&items[0]?.p?.top)return subtractMin(sun.rise,20);return sched}
  function kitItems(){return Array.isArray(store?.photoKit)&&store.photoKit.length?store.photoKit:['Boîtier','Objectif principal','Batterie','Carte mémoire']}

  function openDeparture(){if(!activeTrip)return;ensureData();ensureVoyageUI();document.getElementById('uxVoyagePanel')?.classList.remove('show');document.body.classList.remove('uxVoyageOpen');document.getElementById('uxDeparturePanel').classList.add('show');document.body.classList.add('uxDepartureOpen');renderDeparture(defaultDay());setNav('trip')}
  function closeDeparture(){document.getElementById('uxDeparturePanel')?.classList.remove('show');document.body.classList.remove('uxDepartureOpen');setNav('map')}
  function renderDeparture(day){
    const w=document.getElementById('uxDepartureScroll');if(!w)return;const items=plannedItems(day);document.getElementById('uxDepartureTitle').textContent='Départ · '+pretty(day);
    if(!items.length){w.innerHTML='<div class="uxVoyageHint">Aucune étape prévue pour cette journée.</div>';return}
    const ref=items.find(x=>validCoord(x.p))?.p,sun=sunInfo(day,ref),dep=suggestedDeparture(items,sun),done=items.filter(x=>{try{return isDone(x.p)}catch(e){return false}}).length;
    const route=items.map((x,i)=>{let d=false;try{d=isDone(x.p)}catch(e){}return `<div class="uxDepartureStop ${d?'done':''}"><div class="time">${esc(x.time||'—')}</div><div><b>${esc(x.p.name||'Spot')}</b><span>${esc([x.p.city,x.p.top?'★ Photo':null].filter(Boolean).join(' · '))}</span></div><button data-dep-spot="${esc(uidOf(x.p))}">${i===0?'Démarrer':'Voir'}</button></div>`}).join('');
    w.innerHTML=`<div class="uxDepartureHero"><div class="uxDepartureHeroTop"><div><b>${esc(pretty(day))} · ${esc(items[0].p.city||activeTrip.country||'')}</b><span>${items.length} étapes · ${done}/${items.length} déjà faites</span></div><span class="uxVoyageCloud ${isCloud()?'ok':''}">${isCloud()?'● Synchro':'Local'}</span></div><div class="uxDepartureMetrics"><div class="uxDepartureMetric"><small>Départ conseillé</small><b>${esc(dep)}</b></div><div class="uxDepartureMetric"><small>Golden AM</small><b>${esc(sun?.rise||'—')}</b></div><div class="uxDepartureMetric"><small>Golden PM</small><b>${esc(sun?.goldPM||'—')}</b></div></div><button class="uxDepartureStart" data-begin-day>COMMENCER MA JOURNÉE</button></div>
    <section class="uxDepartureSection"><div class="uxDepartureSectionHead"><h3>Météo</h3><span>si disponible</span></div><div class="uxDepartureWeather" id="uxDepartureWeather">Chargement…</div></section>
    <section class="uxDepartureSection"><div class="uxDepartureSectionHead"><h3>À prendre</h3><span>kit Photo</span></div><div class="uxDepartureKit">${kitItems().map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>
    <section class="uxDepartureSection"><div class="uxDepartureSectionHead"><h3>Itinéraire du jour</h3><span>${items.length} étapes</span></div><div class="uxDepartureRoute">${route}</div></section>`;
    loadDepartureWeather(day,ref);
  }
  async function loadDepartureWeather(day,p){const box=document.getElementById('uxDepartureWeather');if(!box||!validCoord(p))return;const iso=isoDay(day),target=parseDay(day),today=new Date();today.setHours(0,0,0,0);if(!iso||!target){box.textContent='Prévision indisponible.';return}const diff=Math.floor((target-today)/86400000);if(diff<0){box.textContent='Cette journée est passée.';return}if(diff>15){box.textContent='La météo détaillée sera disponible environ 16 jours avant.';return}const token=++weatherToken;try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(p.lat)}&longitude=${encodeURIComponent(p.lon)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=16`;const r=await fetch(u);if(!r.ok)throw new Error();const j=await r.json();if(token!==weatherToken)return;const d=j.daily||{},i=(d.time||[]).indexOf(iso);if(i<0){box.textContent='Prévision indisponible pour cette date.';return}box.innerHTML=`<b>${d.temperature_2m_max?.[i]??'—'}° / ${d.temperature_2m_min?.[i]??'—'}°</b> · pluie ${d.precipitation_probability_max?.[i]??'—'}% · vent max ${d.wind_speed_10m_max?.[i]??'—'} km/h`}catch(e){if(token===weatherToken)box.textContent='Météo momentanément indisponible.'}}
  function departureClick(e){
    if(e.target.closest('[data-begin-day]')){const day=defaultDay(),item=plannedItems(day).find(x=>{try{return !isDone(x.p)}catch(e){return true}})||plannedItems(day)[0];if(!item)return;closeDeparture();setTimeout(()=>{try{selectPlace(item.p,true);setTimeout(()=>openNavigationMode?.(),120)}catch(_){}},60);return}
    const b=e.target.closest('[data-dep-spot]');if(b){const day=defaultDay(),p=spotsFor(day).find(x=>uidOf(x)===String(b.dataset.depSpot));if(!p)return;closeDeparture();setTimeout(()=>selectPlace(p,true),60)}
  }

  function installHooks(){
    ensureVoyageUI();
    document.addEventListener('click',e=>{const b=e.target.closest('#uxNav button[data-ux="trip"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openVoyageHub()},true);
    const originalShowHome=window.showHome;if(typeof originalShowHome==='function'){/* keep home behavior intact */}
    window.openVoyageHub=openVoyageHub;window.openDepartureMode=openDeparture;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installHooks,650));else setTimeout(installHooks,650);
})();
