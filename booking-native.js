// Travel Photo OS — persistent booking entry point
(function(){
  if(window.__travelPhotoBookingNative)return;
  window.__travelPhotoBookingNative=true;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const q=v=>encodeURIComponent(String(v||'').trim());
  const nextDate=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return'';const d=new Date(v+'T12:00:00');d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)};
  function whereDefault(){try{const d=typeof tripTodayDate==='function'?tripTodayDate():null;const p=d&&d!=='Tous'&&typeof activeSpots==='function'?activeSpots().find(x=>x.date===d):null;return p?.city||activeTrip?.startCity||activeTrip?.country||''}catch(e){return activeTrip?.startCity||activeTrip?.country||''}}
  function providers(type,where,date){
    const place=String(where||whereDefault()||activeTrip?.country||'').trim();
    const full=[place,activeTrip?.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' ');
    if(type==='Hôtel')return [
      ['Booking',`https://www.booking.com/searchresults.html?ss=${q(full)}${date?`&checkin=${q(date)}&checkout=${q(nextDate(date))}`:''}`],
      ['Agoda',`https://www.agoda.com/search?textToSearch=${q(full)}`],
      ['Google Hotels',`https://www.google.com/travel/hotels?q=${q(full+' hotels')}`]
    ];
    if(type==='Activité')return [
      ['Klook',`https://www.klook.com/en-AU/search/result/?query=${q(full)}`],
      ['GetYourGuide',`https://www.getyourguide.com/s/?q=${q(full)}`],
      ['Google',`https://www.google.com/search?q=${q(full+' activities tickets')}`]
    ];
    if(type==='Transport'){
      const a=[['Google Maps',`https://www.google.com/maps/dir/?api=1&destination=${q(place)}&travelmode=transit`],['Klook Transport',`https://www.klook.com/en-AU/search/result/?query=${q(full+' transport')}`]];
      if(/japon|japan/i.test(String(activeTrip?.country||'')))a.push(['SmartEX','https://smart-ex.jp/en/index.php'],['JR East','https://www.eki-net.com/en/jreast-train-reservation/Top/Index']);
      else a.push(['Rome2Rio',`https://www.rome2rio.com/map/${q(place).replace(/%20/g,'-')}`]);
      return a;
    }
    if(type==='Restaurant')return [
      ['Google Maps',`https://www.google.com/maps/search/?api=1&query=${q(place+' restaurant')}`],
      ['TableCheck',`https://www.tablecheck.com/en/shops?keyword=${q(place)}`],
      ['Google',`https://www.google.com/search?q=${q(place+' restaurant reservation')}`]
    ];
    return [['Google',`https://www.google.com/search?q=${q(full)}`],['Google Maps',`https://www.google.com/maps/search/?api=1&query=${q(full)}`]];
  }
  function ensureOverlay(){
    if(document.getElementById('uxBookingNativeOverlay'))return;
    const o=document.createElement('div');o.id='uxBookingNativeOverlay';o.className='uxBookingNativeOverlay';
    o.innerHTML=`<div class="uxBookingNativeCard"><div class="uxBookingNativeHead"><div><span>Réservation</span><h2>Réserver maintenant</h2></div><button id="uxBookingNativeClose">✕</button></div><div class="uxBookingNativeForm"><input id="uxBookingNativeWhere" placeholder="Ville, hôtel, activité ou destination"><div class="uxBookingNativeGrid"><select id="uxBookingNativeType"><option>Hôtel</option><option>Transport</option><option>Activité</option><option>Restaurant</option><option>Autre</option></select><input id="uxBookingNativeDate" type="date"></div></div><div class="uxBookingNativeProviders" id="uxBookingNativeProviders"></div><p>La réservation et le paiement se font directement chez le prestataire. Travel Photo OS ouvre simplement la bonne recherche.</p></div>`;
    document.body.appendChild(o);
    o.addEventListener('click',e=>{if(e.target===o||e.target.closest('#uxBookingNativeClose'))return close();const b=e.target.closest('[data-native-book]');if(!b)return;try{window.open(b.dataset.nativeBook,'_blank','noopener,noreferrer')}catch(_){location.href=b.dataset.nativeBook}});
    o.querySelector('#uxBookingNativeWhere').addEventListener('input',renderProviders);
    o.querySelector('#uxBookingNativeType').addEventListener('change',renderProviders);
    o.querySelector('#uxBookingNativeDate').addEventListener('change',renderProviders);
  }
  function renderProviders(){
    const o=document.getElementById('uxBookingNativeOverlay');if(!o)return;
    const type=o.querySelector('#uxBookingNativeType')?.value||'Hôtel',where=o.querySelector('#uxBookingNativeWhere')?.value||whereDefault(),date=o.querySelector('#uxBookingNativeDate')?.value||'';
    const w=o.querySelector('#uxBookingNativeProviders');if(!w)return;
    w.innerHTML=providers(type,where,date).map(([name,url],i)=>`<button class="${i===0?'primary':''}" data-native-book="${esc(url)}">${esc(name)}</button>`).join('');
  }
  function open(){ensureOverlay();const o=document.getElementById('uxBookingNativeOverlay');o.querySelector('#uxBookingNativeWhere').value=whereDefault();o.classList.add('show');renderProviders()}
  function close(){document.getElementById('uxBookingNativeOverlay')?.classList.remove('show')}
  function ensureButton(){
    const panel=document.getElementById('uxVoyagePanel');if(!panel)return;
    const head=panel.querySelector('.uxVoyageHeadTop');if(!head||document.getElementById('uxBookingNativeBtn'))return;
    const wrap=document.createElement('div');wrap.className='uxVoyageHeadActions';
    const b=document.createElement('button');b.id='uxBookingNativeBtn';b.className='uxBookingNativeBtn';b.textContent='Réserver';b.type='button';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open()});
    const closeBtn=head.querySelector('.uxVoyageClose');
    if(closeBtn){head.insertBefore(wrap,closeBtn);wrap.appendChild(b)}else{head.appendChild(wrap);wrap.appendChild(b)}
  }
  function tick(){if(document.body.classList.contains('uxVoyageOpen')||document.getElementById('uxVoyagePanel')?.classList.contains('show'))ensureButton()}
  function install(){ensureOverlay();tick();const obs=new MutationObserver(tick);obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});document.addEventListener('click',e=>{if(e.target.closest('#uxNav button[data-ux="trip"],#uxVoyageFab'))setTimeout(tick,80)},true);window.openBookingNative=open}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));else setTimeout(install,900);
})();