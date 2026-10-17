// Travel Photo OS — intelligent mobile day screen
(function(){
  let selectedDay=null;
  let weatherToken=0;
  const mobile=()=>window.matchMedia('(max-width:760px)').matches;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uidOf=p=>{try{return String(spotUid(p))}catch(e){return String(p?.id||p?.name||'')}};
  const validCoord=p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon));
  const toRad=x=>x*Math.PI/180;
  function kmBetween(a,b){if(!validCoord(a)||!validCoord(b))return null;const R=6371,dLat=toRad(Number(b.lat)-Number(a.lat)),dLon=toRad(Number(b.lon)-Number(a.lon)),la1=toRad(Number(a.lat)),la2=toRad(Number(b.lat));const q=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))}
  function fmtKm(km){if(km==null)return '—';return km<1?Math.round(km*1000)+' m':km.toFixed(km<10?1:0)+' km'}
  function estimateLeg(a,b){const km=kmBetween(a,b);if(km==null)return null;if(km>20)return{km,long:true,walk:false,min:null};const walk=km<=2.5,speed=walk?4.8:24,min=Math.max(3,Math.round(km/speed*60));return {km,min,walk,long:false}}
  function allDays(){try{return typeof allDates==='function'?allDates():[]}catch(e){return []}}
  function defaultDay(){try{return typeof tripTodayDate==='function'?tripTodayDate():(allDays()[0]||null)}catch(e){return allDays()[0]||null}}
  function pretty(d){try{return typeof prettyDay==='function'?prettyDay(d):d}catch(e){return d}}
  function spotsFor(d){try{return activeSpots().filter(p=>p.date===d)}catch(e){return []}}
  function isoForDay(day){
    const raw=String(day||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
    const months={JAN:1,JANV:1,FEB:2,FEV:2,'FÉV':2,MAR:3,MARS:3,APR:4,AVR:4,MAY:5,MAI:5,JUN:6,JUIN:6,JUL:7,JUIL:7,AUG:8,AOU:8,'AOÛ':8,SEP:9,SEPT:9,OCT:10,NOV:11,DEC:12,'DÉC':12};
    const m=raw.toUpperCase().match(/^(\d{1,2})\s+([A-ZÀ-Ü]+)/);let year=Number(String(activeTrip?.start||'').slice(0,4))||new Date().getFullYear();
    if(m){const mon=months[m[2]]||months[m[2].slice(0,3)];if(mon){const startMon=Number(String(activeTrip?.start||'').slice(5,7))||mon;if(mon<startMon&&allDays().some(x=>String(x).toUpperCase().includes('DEC')))year+=1;return `${year}-${String(mon).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`}}
    try{if(typeof parseDateForSun==='function'){const d=parseDateForSun(raw);if(d&&Number.isFinite(d.getTime()))return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}}catch(e){}
    return null;
  }
  function storedPlan(d){
    const arr=spotsFor(d),by=new Map(arr.map(p=>[uidOf(p),p]));
    const plan=store?.dayPlans?.[d];
    if(Array.isArray(plan)&&plan.length){
      const out=plan.map(x=>({p:by.get(String(x.spotId)),time:x.time||'08:00'})).filter(x=>x.p);
      const used=new Set(out.map(x=>uidOf(x.p)));
      arr.filter(p=>!used.has(uidOf(p))).forEach(p=>out.push({p,time:''}));
      return out;
    }
    const ordered=arr.slice().sort((a,b)=>(Number(a.step)||999)-(Number(b.step)||999));
    let times=[];try{times=typeof defaultTimesForCount==='function'?defaultTimesForCount(ordered.length):[]}catch(e){}
    return ordered.map((p,i)=>({p,time:times[i]||String(8+Math.min(i,10)).padStart(2,'0')+':00'}));
  }
  function savePlan(d,items){
    if(!store)return;
    if(!store.dayPlans)store.dayPlans={};
    store.dayPlans[d]=items.map(x=>({spotId:uidOf(x.p),time:x.time||'08:00'}));
    try{saveData()}catch(e){try{localStorage.setItem(DATA_PREFIX+activeTripId,JSON.stringify(store))}catch(_){}}
  }
  function sunTimes(d,p){
    if(!window.SunCalc||!validCoord(p))return null;
    try{
      const iso=isoForDay(d),date=iso?new Date(iso+'T12:00:00'):(typeof parseDateForSun==='function'?parseDateForSun(d):new Date());
      const t=SunCalc.getTimes(date,Number(p.lat),Number(p.lon));
      const f=x=>x&&Number.isFinite(x.getTime())?x.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';
      return {sunrise:f(t.sunrise),goldenAM:f(t.goldenHourEnd),goldenPM:f(t.goldenHour),sunset:f(t.sunset)};
    }catch(e){return null}
  }
  function weatherCode(code){const c=Number(code);if(c===0)return['☀️','Dégagé'];if([1,2].includes(c))return['🌤️','Peu nuageux'];if(c===3)return['☁️','Couvert'];if([45,48].includes(c))return['🌫️','Brouillard'];if([51,53,55,56,57].includes(c))return['🌦️','Bruine'];if([61,63,65,66,67,80,81,82].includes(c))return['🌧️','Pluie'];if([71,73,75,77,85,86].includes(c))return['🌨️','Neige'];if([95,96,99].includes(c))return['⛈️','Orage'];return['◌','Météo']}
  function ensurePanel(){
    if(document.getElementById('uxDayPanel'))return;
    const el=document.createElement('section');el.id='uxDayPanel';el.className='uxDayPanel';el.setAttribute('aria-label','Journée');
    el.innerHTML='<div class="uxDayHead"><div class="uxDayHeadTop"><div><span class="uxDayKicker">Travel Photo OS</span><h2 id="uxDayTitle">Journée</h2></div><button class="uxDayClose" id="uxDayClose" aria-label="Fermer">✕</button></div><div class="uxDayDates" id="uxDayDates"></div></div><div class="uxDayScroll" id="uxDayScroll"></div>';
    document.body.appendChild(el);
    el.querySelector('#uxDayClose').addEventListener('click',closeDay);
    el.querySelector('#uxDayDates').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;selectedDay=b.dataset.day;renderDay();});
    el.querySelector('#uxDayScroll').addEventListener('click',onDayClick);
    el.querySelector('#uxDayScroll').addEventListener('change',onDayChange);
  }
  function openDay(){
    if(!mobile()||!activeTrip)return;
    ensurePanel();selectedDay=selectedDay&&allDays().includes(selectedDay)?selectedDay:defaultDay();
    document.getElementById('uxDayPanel').classList.add('show');document.body.classList.add('uxDayOpen');
    document.querySelectorAll('#uxNav button').forEach(b=>b.classList.toggle('on',b.dataset.ux==='day'));
    renderDay();
  }
  function closeDay(){const p=document.getElementById('uxDayPanel');if(p)p.classList.remove('show');document.body.classList.remove('uxDayOpen');document.querySelectorAll('#uxNav button').forEach(b=>b.classList.toggle('on',b.dataset.ux==='map'))}
  function renderDates(){const w=document.getElementById('uxDayDates');if(!w)return;w.innerHTML=allDays().map(d=>`<button class="uxDayDate ${d===selectedDay?'on':''}" data-day="${esc(d)}">${esc(pretty(d))}</button>`).join('')}
  function dayDistance(items){let sum=0,count=0;for(let i=1;i<items.length;i++){const k=kmBetween(items[i-1].p,items[i].p);if(k!=null){sum+=k;count++}}return count?sum:null}
  function renderDay(){
    ensurePanel();if(!selectedDay)selectedDay=defaultDay();renderDates();
    const items=storedPlan(selectedDay),w=document.getElementById('uxDayScroll'),title=document.getElementById('uxDayTitle');if(title)title.textContent=pretty(selectedDay)||'Journée';
    if(!w)return;
    if(!items.length){w.innerHTML='<div class="uxDayEmpty">Aucun spot prévu pour cette journée.<br>Ajoute des spots ou change de date.</div>';return}
    const done=items.filter(x=>{try{return isDone(x.p)}catch(e){return false}}).length,dist=dayDistance(items),sun=sunTimes(selectedDay,items.find(x=>validCoord(x.p))?.p),top=items.filter(x=>x.p?.top).length;
    const timeline=items.map((x,i)=>{
      const isD=(()=>{try{return isDone(x.p)}catch(e){return false}})(),leg=i<items.length-1?estimateLeg(x.p,items[i+1].p):null;
      const legText=leg?(leg.long?`Long trajet · ${fmtKm(leg.km)} direct`:`${leg.walk?'À pied':'Trajet'} ≈ ${leg.min} min · ${fmtKm(leg.km)} direct`):'';
      return `<div class="uxTimelineItem" data-id="${esc(uidOf(x.p))}"><div class="uxTimelineDot ${isD?'done':''}"></div><div class="uxTimelineCard"><div class="uxTimelineTop"><input class="uxTimelineTime" type="time" value="${esc(x.time||'08:00')}" data-time-index="${i}"><div class="uxTimelineInfo"><b>${esc(x.p.name||'Spot')}</b><span>${esc([x.p.city,x.p.category,x.p.top?'★ Photo':null].filter(Boolean).join(' · '))}</span></div></div><div class="uxTimelineActions"><button data-open="${esc(uidOf(x.p))}">Voir le spot</button><button data-nav="${esc(uidOf(x.p))}">Y aller</button>${i>0?`<button data-up="${i}">↑</button>`:''}${i<items.length-1?`<button data-down="${i}">↓</button>`:''}</div></div></div>${leg?`<div class="uxTravelLeg">${esc(legText)}</div>`:''}`;
    }).join('');
    w.innerHTML=`<div class="uxDayHero"><div class="uxDayHeroTop"><div><b>${items.length} étape${items.length>1?'s':''} prévues</b><span>${top?top+' spot'+(top>1?'s':'')+' photo prioritaire'+(top>1?'s':''): 'Journée de voyage'} · ordre sauvegardé</span></div><span class="uxDayProgress">${done}/${items.length} faits</span></div><div class="uxDayStats"><div class="uxDayStat"><small>Distance</small><b>${dist==null?'—':fmtKm(dist)}</b></div><div class="uxDayStat"><small>Lever</small><b>${esc(sun?.sunrise||'—')}</b></div><div class="uxDayStat"><small>Coucher</small><b>${esc(sun?.sunset||'—')}</b></div></div></div><div class="uxDaySection"><div class="uxDaySectionHead"><h3>Lumière photo</h3><span>SunCalc</span></div><div class="uxSunCards"><div class="uxSunCard"><small>Golden hour matin</small><b>${esc(sun?.sunrise||'—')} → ${esc(sun?.goldenAM||'—')}</b><span>Idéal pour une lumière douce</span></div><div class="uxSunCard"><small>Golden hour soir</small><b>${esc(sun?.goldenPM||'—')} → ${esc(sun?.sunset||'—')}</b><span>Priorise un spot photo à ce créneau</span></div></div></div><div class="uxDaySection"><div class="uxDaySectionHead"><h3>Météo</h3><button class="uxDayMiniBtn" data-refresh-weather>Actualiser</button></div><div class="uxWeatherBox" id="uxDayWeather"><div class="uxWeatherHint">Chargement de la prévision…</div></div></div><div class="uxDaySection"><div class="uxDaySectionHead"><h3>Timeline</h3><button class="uxDayMiniBtn" data-optimize>Optimiser l’ordre</button></div><div class="uxTimeline">${timeline}</div><div class="uxDayFooterNote">Les temps entre étapes sont des estimations basées sur la distance directe, pas un calcul d’itinéraire routier.</div></div>`;
    loadWeather(selectedDay,items[0]?.p);
  }
  async function loadWeather(day,p){
    const box=document.getElementById('uxDayWeather');if(!box||!validCoord(p))return;
    const iso=isoForDay(day);if(!iso){box.innerHTML='<div class="uxWeatherHint uxWeatherWarn">Date non reconnue pour la météo.</div>';return}
    const token=++weatherToken,target=new Date(iso+'T12:00:00'),today=new Date();today.setHours(0,0,0,0);const diff=Math.floor((target-today)/86400000);
    if(diff<0){box.innerHTML='<div class="uxWeatherHint uxWeatherWarn">Cette date est passée : pas de prévision disponible.</div>';return}
    if(diff>15){box.innerHTML='<div class="uxWeatherHint">Prévision météo disponible environ 16 jours avant cette journée.</div>';return}
    box.innerHTML='<div class="uxWeatherHint">Chargement de la prévision…</div>';
    try{
      const u=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(p.lat)}&longitude=${encodeURIComponent(p.lon)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=16`;
      const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(token!==weatherToken)return;
      const d=j.daily||{},i=(d.time||[]).indexOf(iso);if(i<0){box.innerHTML='<div class="uxWeatherHint">Prévision indisponible pour cette date.</div>';return}
      const [icon,label]=weatherCode(d.weather_code?.[i]),max=d.temperature_2m_max?.[i],min=d.temperature_2m_min?.[i],rain=d.precipitation_probability_max?.[i],wind=d.wind_speed_10m_max?.[i];
      box.innerHTML=`<div class="uxWeatherMain"><div class="uxWeatherIcon">${icon}</div><div class="uxWeatherText"><b>${esc(label)} · ${max??'—'}° / ${min??'—'}°</b><span>Pluie ${rain??'—'}% · vent max ${wind??'—'} km/h · zone du premier spot</span></div></div>`;
    }catch(e){if(token!==weatherToken)return;box.innerHTML='<div class="uxWeatherHint uxWeatherWarn">Météo momentanément indisponible. Réessaie plus tard.</div>'}
  }
  function optimizeOrder(){
    const items=storedPlan(selectedDay);if(items.length<3){try{toast('Pas assez d’étapes à optimiser')}catch(e){}return}
    const times=items.map(x=>x.time).sort(),pseudo=(typeof myGeo!=='undefined'&&myGeo)?{lat:myGeo.lat,lon:myGeo.lon}:null;
    let start=items[0].p;
    if(pseudo){const nearest=items.map(x=>({p:x.p,km:kmBetween(pseudo,x.p)})).filter(x=>x.km!=null).sort((a,b)=>a.km-b.km)[0];if(nearest&&nearest.km<=50)start=nearest.p}
    const remaining=items.map(x=>x.p).filter(p=>uidOf(p)!==uidOf(start)),order=[start];
    while(remaining.length){const cur=order[order.length-1];remaining.sort((a,b)=>(kmBetween(cur,a)??99999)-(kmBetween(cur,b)??99999));order.push(remaining.shift())}
    savePlan(selectedDay,order.map((p,i)=>({p,time:times[i]||items[i]?.time||'08:00'})));try{toast('Ordre optimisé pour limiter les déplacements')}catch(e){}renderDay();
  }
  function findSpot(id){return spotsFor(selectedDay).find(p=>uidOf(p)===String(id))}
  function onDayClick(e){
    if(e.target.closest('[data-refresh-weather]')){const p=storedPlan(selectedDay)[0]?.p;loadWeather(selectedDay,p);return}
    if(e.target.closest('[data-optimize]')){optimizeOrder();return}
    const open=e.target.closest('[data-open]');if(open){const p=findSpot(open.dataset.open);if(p){closeDay();setTimeout(()=>{try{selectPlace(p,true)}catch(e){}},30)}return}
    const nav=e.target.closest('[data-nav]');if(nav){const p=findSpot(nav.dataset.nav);if(p){closeDay();setTimeout(()=>{try{selectPlace(p,true)}catch(e){}setTimeout(()=>{try{openNavigationMode()}catch(e){}},100)},30)}return}
    const up=e.target.closest('[data-up]'),down=e.target.closest('[data-down]');
    if(up||down){const el=up||down,idx=Number(up?el.dataset.up:el.dataset.down),dir=up?-1:1,items=storedPlan(selectedDay),j=idx+dir;if(Number.isInteger(idx)&&idx>=0&&j>=0&&j<items.length){[items[idx],items[j]]=[items[j],items[idx]];savePlan(selectedDay,items);renderDay()}return}
  }
  function onDayChange(e){const i=e.target.closest('[data-time-index]');if(!i)return;const idx=Number(i.dataset.timeIndex),items=storedPlan(selectedDay);if(!Number.isInteger(idx)||!items[idx])return;items[idx].time=i.value||items[idx].time;savePlan(selectedDay,items)}
  function install(){
    ensurePanel();
    document.addEventListener('click',e=>{
      const dayBtn=e.target.closest?.('#uxNav button[data-ux="day"]');if(dayBtn&&mobile()&&activeTrip){e.preventDefault();e.stopImmediatePropagation();openDay();return}
      const other=e.target.closest?.('#uxNav button[data-ux]');if(other&&other.dataset.ux!=='day'&&document.getElementById('uxDayPanel')?.classList.contains('show'))closeDay();
    },true);
    window.addEventListener('resize',()=>{if(!mobile())closeDay()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,650));else setTimeout(install,650);
})();
