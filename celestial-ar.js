// Travel Photo OS — Sun & Moon AR
(function(){
  if(window.__travelPhotoCelestialARLoaded)return;window.__travelPhotoCelestialARLoaded=true;

  let root=null,video=null,stream=null,track=null,svg=null;
  let heading=null,pitch=null,rawHeading=null,rawPitch=null,headingAccuracy=null;
  let headingOffset=Number(localStorage.getItem('travelPhotoArHeadingOffset')||0);
  let pitchOffset=Number(localStorage.getItem('travelPhotoArPitchOffset')||0);
  let hFov=Number(localStorage.getItem('travelPhotoArHFov')||62);
  let loc=null,locAccuracy=null,orientationReady=false,cameraReady=false;
  let selectedDate=new Date(),selectedMinutes=selectedDate.getHours()*60+selectedDate.getMinutes(),liveMode=true;
  let showSun=true,showMoon=true,strongStab=true,raf=0,lastArcKey='';
  let sunArc=[],moonArc=[],sunNow=null,moonNow=null;
  const DEG=180/Math.PI,RAD=Math.PI/180;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap360=v=>((v%360)+360)%360;
  const wrap180=v=>{v=wrap360(v);return v>180?v-360:v};
  const smoothAngle=(prev,next,k)=>prev==null?next:wrap360(prev+wrap180(next-prev)*k);
  const smooth=(prev,next,k)=>prev==null?next:prev+(next-prev)*k;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function cardinal(d){return ['N','NE','E','SE','S','SO','O','NO'][Math.round(wrap360(d)/45)%8]}
  function fmtCoord(v){return Number(v).toFixed(5)}
  function fmtTime(d){return d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
  function ymd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function dateFromControls(){const d=new Date(selectedDate);d.setHours(Math.floor(selectedMinutes/60),selectedMinutes%60,0,0);return d}
  function sunPos(d){if(!window.SunCalc||!loc)return null;const p=SunCalc.getPosition(d,loc.lat,loc.lon);return {az:wrap360(p.azimuth*DEG+180),alt:p.altitude*DEG}}
  function moonPos(d){if(!window.SunCalc||!loc)return null;const p=SunCalc.getMoonPosition(d,loc.lat,loc.lon);return {az:wrap360(p.azimuth*DEG+180),alt:p.altitude*DEG}}
  function vecFromAzAlt(az,alt){const A=az*RAD,h=alt*RAD,c=Math.cos(h);return [c*Math.sin(A),c*Math.cos(A),Math.sin(h)]}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}

  function cameraBasis(){
    const H=wrap360((heading??0)+headingOffset)*RAD,P=clamp((pitch??0)+pitchOffset,-89,89)*RAD;
    const f=[Math.cos(P)*Math.sin(H),Math.cos(P)*Math.cos(H),Math.sin(P)];
    const r=[Math.cos(H),-Math.sin(H),0];
    const u=[-Math.sin(P)*Math.sin(H),-Math.sin(P)*Math.cos(H),Math.cos(P)];
    return {f,r,u};
  }
  function project(az,alt,w,h){
    if(heading==null||pitch==null)return null;
    const v=vecFromAzAlt(az,alt),b=cameraBasis();
    const z=dot(v,b.f);if(z<=.05)return null;
    const x=dot(v,b.r),y=dot(v,b.u);
    const hf=clamp(hFov,35,95)*RAD;
    const vf=2*Math.atan(Math.tan(hf/2)*(h/w));
    const fx=w/(2*Math.tan(hf/2)),fy=h/(2*Math.tan(vf/2));
    return {x:w/2+fx*(x/z),y:h/2-fy*(y/z),z};
  }

  function sampleArc(kind){
    const arr=[];const base=new Date(selectedDate);base.setHours(0,0,0,0);
    for(let m=0;m<=1440;m+=10){const d=new Date(base.getTime()+m*60000);const p=kind==='sun'?sunPos(d):moonPos(d);if(p)arr.push({m,az:p.az,alt:p.alt})}
    return arr;
  }
  function recomputeArcs(force=false){
    if(!loc||!window.SunCalc)return;
    const key=`${ymd(selectedDate)}:${loc.lat.toFixed(4)}:${loc.lon.toFixed(4)}`;
    if(!force&&key===lastArcKey)return;
    lastArcKey=key;sunArc=sampleArc('sun');moonArc=sampleArc('moon');
  }

  function pathFor(points,w,h,below){
    let d='',pen=false,last=null;
    for(const p of points){
      const isBelow=p.alt<0;if(isBelow!==below){pen=false;last=null;continue}
      const q=project(p.az,p.alt,w,h);if(!q||q.x<-w*.35||q.x>w*1.35||q.y<-h*.35||q.y>h*1.35){pen=false;last=null;continue}
      if(last&&Math.hypot(q.x-last.x,q.y-last.y)>Math.max(w,h)*.22)pen=false;
      d+=(pen?' L ':' M ')+q.x.toFixed(1)+' '+q.y.toFixed(1);pen=true;last=q;
    }
    return d;
  }
  function horizonPath(w,h){
    let d='',pen=false,last=null;const H=heading??0;
    for(let da=-100;da<=100;da+=4){const q=project(H+da,0,w,h);if(!q){pen=false;last=null;continue}if(last&&Math.hypot(q.x-last.x,q.y-last.y)>w*.25)pen=false;d+=(pen?' L ':' M ')+q.x.toFixed(1)+' '+q.y.toFixed(1);pen=true;last=q}
    return d;
  }
  function markerSvg(cls,label,p,w,h){if(!p)return '';const q=project(p.az,p.alt,w,h);if(!q||q.x<-30||q.x>w+30||q.y<-30||q.y>h+30)return '';return `<g class="celArMarker ${cls}" transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})"><circle r="9"></circle><text x="13" y="4">${esc(label)}</text></g>`}
  function hourMarkers(points,w,h){let out='';for(const p of points){if(p.m%120!==0||p.alt<-2)continue;const q=project(p.az,p.alt,w,h);if(!q||q.x<8||q.x>w-8||q.y<8||q.y>h-8)continue;out+=`<g class="celArHour" transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})"><circle r="2.5"></circle><text x="5" y="3">${String(Math.floor(p.m/60)%24).padStart(2,'0')}h</text></g>`}return out}

  function render(){
    raf=0;if(!root?.classList.contains('show')||!svg)return;
    const w=root.clientWidth||innerWidth,h=root.clientHeight||innerHeight;
    recomputeArcs();
    const d=dateFromControls();sunNow=sunPos(d);moonNow=moonPos(d);
    let html=`<path class="celArHorizon" d="${horizonPath(w,h)}"></path>`;
    if(showSun){html+=`<path class="celArSunPath" d="${pathFor(sunArc,w,h,false)}"></path><path class="celArSunPath celArBelow" d="${pathFor(sunArc,w,h,true)}"></path>${hourMarkers(sunArc,w,h)}${markerSvg('celArSunMarker','☀ '+Math.round(sunNow?.az||0)+'° · '+Math.round(sunNow?.alt||0)+'°',sunNow,w,h)}`}
    if(showMoon){html+=`<path class="celArMoonPath" d="${pathFor(moonArc,w,h,false)}"></path><path class="celArMoonPath celArBelow" d="${pathFor(moonArc,w,h,true)}"></path>${markerSvg('celArMoonMarker','☾ '+Math.round(moonNow?.az||0)+'° · '+Math.round(moonNow?.alt||0)+'°',moonNow,w,h)}`}
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.innerHTML=html;
    updateText();
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(render)}

  function updateText(){
    const H=heading==null?null:wrap360(heading+headingOffset),P=pitch==null?null:pitch+pitchOffset;
    const c=root.querySelector('#celArCompass');if(c)c.innerHTML=H==null?'Orientation en attente…':`${cardinal(H)} ${Math.round(H)}° <span>inclinaison ${Math.round(P||0)}°</span>`;
    const s=root.querySelector('#celArSunInfo');if(s&&sunNow)s.innerHTML=`<small>Soleil</small><b>${Math.round(sunNow.az)}° ${cardinal(sunNow.az)} · ${sunNow.alt.toFixed(1)}°</b><span>${sunNow.alt>=0?'au-dessus':'sous'} de l’horizon</span>`;
    const m=root.querySelector('#celArMoonInfo');if(m&&moonNow){let illum='';try{illum=` · ${Math.round(SunCalc.getMoonIllumination(dateFromControls()).fraction*100)}%`}catch(e){}m.innerHTML=`<small>Lune</small><b>${Math.round(moonNow.az)}° ${cardinal(moonNow.az)} · ${moonNow.alt.toFixed(1)}°</b><span>${moonNow.alt>=0?'au-dessus':'sous'} de l’horizon${illum}</span>`}
    const pos=root.querySelector('#celArPos');if(pos&&loc)pos.textContent=`GPS ±${Math.round(locAccuracy||0)} m · ${fmtCoord(loc.lat)}, ${fmtCoord(loc.lon)}`;
    const acc=root.querySelector('#celArAccuracy');if(acc)acc.textContent=headingAccuracy&&headingAccuracy>0?`Boussole ±${Math.round(headingAccuracy)}°`:(orientationReady?'Boussole active':'Boussole…');
    const tl=root.querySelector('#celArTimeLabel');if(tl)tl.textContent=fmtTime(dateFromControls());
  }

  function orientationHandler(e){
    let h=null;
    if(Number.isFinite(e.webkitCompassHeading)){h=Number(e.webkitCompassHeading);if(Number.isFinite(e.webkitCompassAccuracy))headingAccuracy=Number(e.webkitCompassAccuracy)}
    else if(Number.isFinite(e.alpha)){h=wrap360(360-Number(e.alpha)+(screen.orientation?.angle||window.orientation||0))}
    let p=null;const ang=Number(screen.orientation?.angle||window.orientation||0);
    if(Math.abs(ang)===90&&Number.isFinite(e.gamma))p=ang===90?Number(e.gamma):-Number(e.gamma);
    else if(Number.isFinite(e.beta))p=90-Number(e.beta);
    if(h!=null){rawHeading=h;heading=smoothAngle(heading,h,strongStab?0.12:0.26)}
    if(p!=null){rawPitch=p;pitch=smooth(pitch,p,strongStab?0.12:0.28)}
    orientationReady=h!=null&&p!=null;schedule();
  }

  async function requestOrientation(){
    try{
      if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
        const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')throw new Error('Permission orientation refusée');
      }
      window.removeEventListener('deviceorientation',orientationHandler,true);window.addEventListener('deviceorientation',orientationHandler,true);return true;
    }catch(e){return false}
  }
  async function requestCamera(){
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Caméra indisponible');
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
      track=stream.getVideoTracks()[0]||null;
      try{const cap=track?.getCapabilities?.();if(cap?.zoom&&cap.zoom.min<=1&&cap.zoom.max>=1)await track.applyConstraints({advanced:[{zoom:1}]})}catch(e){}
      video.srcObject=stream;await video.play();cameraReady=true;return true;
    }catch(e){cameraReady=false;return false}
  }
  async function requestLocation(){
    if(typeof myGeo!=='undefined'&&myGeo&&Number.isFinite(Number(myGeo.lat))&&Number.isFinite(Number(myGeo.lon))){loc={lat:Number(myGeo.lat),lon:Number(myGeo.lon)};locAccuracy=Number(myGeo.accuracy)||null;recomputeArcs(true);return true}
    return new Promise(resolve=>{
      if(!navigator.geolocation)return resolve(false);
      navigator.geolocation.getCurrentPosition(p=>{loc={lat:p.coords.latitude,lon:p.coords.longitude};locAccuracy=p.coords.accuracy;recomputeArcs(true);resolve(true)},()=>resolve(false),{enableHighAccuracy:true,maximumAge:5000,timeout:12000})
    })
  }

  function ensureRoot(){
    if(root)return;
    root=document.createElement('section');root.id='celestialAR';root.className='celAr';root.setAttribute('aria-label','RA Soleil et Lune');
    root.innerHTML=`<video class="celArVideo" id="celArVideo" playsinline muted></video><div class="celArShade"></div><svg class="celArSvg" id="celArSvg"></svg><div class="celArCross"><i></i></div><div class="celArTop"><div class="celArHead"><div class="celArHeadTop"><b>RA Soleil & Lune</b><span class="celArBadge" id="celArAccuracy">Capteurs…</span></div><small id="celArPos">Position en attente…</small></div><button class="celArClose" data-ar-close>✕</button></div><div class="celArCompass" id="celArCompass">Orientation en attente…</div><div class="celArInfo"><div class="celArInfoCard" id="celArSunInfo"><small>Soleil</small><b>—</b><span>—</span></div><div class="celArInfoCard" id="celArMoonInfo"><small>Lune</small><b>—</b><span>—</span></div></div><div class="celArControls"><div class="celArRow"><button class="primary" data-ar-now>Maintenant</button><input type="date" id="celArDate"><button class="on" data-ar-sun>☀ Soleil</button><button class="on" data-ar-moon>☾ Lune</button><button data-ar-settings>⚙︎</button></div><div class="celArRow"><div class="celArTime"><input type="range" id="celArTime" min="0" max="1439" step="5"></div><div class="celArTimeLabel" id="celArTimeLabel">—</div></div></div><div class="celArSettings" id="celArSettings"><div class="celArSetRow"><label>Champ horizontal</label><input id="celArFov" type="range" min="35" max="95" step="1"><output id="celArFovOut"></output></div><div class="celArSetRow"><label>Recalage azimut</label><input id="celArHeadingOffset" type="range" min="-45" max="45" step="0.5"><output id="celArHeadingOut"></output></div><div class="celArSetRow"><label>Recalage hauteur</label><input id="celArPitchOffset" type="range" min="-25" max="25" step="0.5"><output id="celArPitchOut"></output></div><div class="celArCalBtns"><button data-ar-cal-sun>Aligner sur le Soleil</button><button data-ar-cal-moon>Aligner sur la Lune</button></div><div class="celArCalBtns"><button data-ar-stab class="on">Stabilisation forte</button><button data-ar-reset>Réinitialiser</button></div></div><div class="celArWarn" id="celArWarn"><b>RA partiellement disponible</b><span id="celArWarnText"></span><button data-ar-warn-close>Continuer</button></div>`;
    document.body.appendChild(root);video=root.querySelector('#celArVideo');svg=root.querySelector('#celArSvg');bindUI();syncControls();
  }

  function bindUI(){
    root.addEventListener('click',e=>{
      if(e.target.closest('[data-ar-close]'))return closeAR();
      if(e.target.closest('[data-ar-now]')){liveMode=true;const n=new Date();selectedDate=n;selectedMinutes=n.getHours()*60+n.getMinutes();syncControls();recomputeArcs(true);schedule();return}
      if(e.target.closest('[data-ar-sun]')){showSun=!showSun;e.target.closest('button').classList.toggle('on',showSun);schedule();return}
      if(e.target.closest('[data-ar-moon]')){showMoon=!showMoon;e.target.closest('button').classList.toggle('on',showMoon);schedule();return}
      if(e.target.closest('[data-ar-settings]')){root.querySelector('#celArSettings').classList.toggle('show');return}
      if(e.target.closest('[data-ar-cal-sun]'))return calibrateTo('sun');
      if(e.target.closest('[data-ar-cal-moon]'))return calibrateTo('moon');
      if(e.target.closest('[data-ar-stab]')){strongStab=!strongStab;e.target.closest('button').classList.toggle('on',strongStab);return}
      if(e.target.closest('[data-ar-reset]')){headingOffset=0;pitchOffset=0;hFov=62;persistCal();syncControls();schedule();return}
      if(e.target.closest('[data-ar-warn-close]')){root.querySelector('#celArWarn').classList.remove('show');return}
    });
    root.querySelector('#celArDate').addEventListener('change',e=>{const [y,m,d]=e.target.value.split('-').map(Number);if(y&&m&&d){selectedDate=new Date(y,m-1,d,12,0,0);liveMode=false;recomputeArcs(true);schedule()}});
    root.querySelector('#celArTime').addEventListener('input',e=>{selectedMinutes=Number(e.target.value);liveMode=false;schedule()});
    root.querySelector('#celArFov').addEventListener('input',e=>{hFov=Number(e.target.value);persistCal();syncControls(false);schedule()});
    root.querySelector('#celArHeadingOffset').addEventListener('input',e=>{headingOffset=Number(e.target.value);persistCal();syncControls(false);schedule()});
    root.querySelector('#celArPitchOffset').addEventListener('input',e=>{pitchOffset=Number(e.target.value);persistCal();syncControls(false);schedule()});
  }
  function persistCal(){localStorage.setItem('travelPhotoArHeadingOffset',String(headingOffset));localStorage.setItem('travelPhotoArPitchOffset',String(pitchOffset));localStorage.setItem('travelPhotoArHFov',String(hFov))}
  function syncControls(full=true){if(!root)return;root.querySelector('#celArDate').value=ymd(selectedDate);root.querySelector('#celArTime').value=selectedMinutes;root.querySelector('#celArFov').value=hFov;root.querySelector('#celArHeadingOffset').value=headingOffset;root.querySelector('#celArPitchOffset').value=pitchOffset;root.querySelector('#celArFovOut').textContent=`${Math.round(hFov)}°`;root.querySelector('#celArHeadingOut').textContent=`${headingOffset.toFixed(1)}°`;root.querySelector('#celArPitchOut').textContent=`${pitchOffset.toFixed(1)}°`;if(full)schedule()}

  function calibrateTo(kind){
    if(heading==null||pitch==null||!loc)return;
    const now=new Date(),target=kind==='sun'?sunPos(now):moonPos(now);if(!target)return;
    const currentH=wrap360(heading+headingOffset),currentP=pitch+pitchOffset;
    headingOffset=clamp(headingOffset+wrap180(target.az-currentH),-45,45);
    pitchOffset=clamp(pitchOffset+(target.alt-currentP),-25,25);
    persistCal();syncControls(false);schedule();
  }

  function warning(parts){if(!parts.length)return;const w=root.querySelector('#celArWarn');root.querySelector('#celArWarnText').textContent=parts.join(' ');w.classList.add('show')}
  async function openAR(){
    ensureRoot();root.classList.add('show');document.body.style.overflow='hidden';
    const n=new Date();selectedDate=n;selectedMinutes=n.getHours()*60+n.getMinutes();liveMode=true;syncControls();
    const orientPromise=requestOrientation();const cameraPromise=requestCamera();const locPromise=requestLocation();
    const [o,c,l]=await Promise.all([orientPromise,cameraPromise,locPromise]);
    const issues=[];if(!o)issues.push('Orientation refusée : les arcs ne pourront pas suivre la caméra.');if(!c)issues.push('Caméra refusée : la vue astronomique reste disponible sur fond noir.');if(!l)issues.push('GPS indisponible : impossible de calculer précisément Soleil et Lune.');warning(issues);recomputeArcs(true);schedule();
  }
  function closeAR(){root?.classList.remove('show');document.body.style.overflow='';if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;track=null}cameraReady=false;window.removeEventListener('deviceorientation',orientationHandler,true)}

  function injectLaunch(){document.querySelectorAll('#uxPhotoScroll .celArLaunch').forEach(el=>el.remove())}

  function install(){ensureRoot();injectLaunch();const obs=new MutationObserver(()=>{if(document.getElementById('uxPhotoPanel')?.classList.contains('show'))setTimeout(injectLaunch,0)});obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});setInterval(()=>{if(document.getElementById('uxPhotoPanel')?.classList.contains('show'))injectLaunch();if(root?.classList.contains('show')&&liveMode){const n=new Date();if(ymd(n)!==ymd(selectedDate)){selectedDate=n;recomputeArcs(true)}selectedMinutes=n.getHours()*60+n.getMinutes();root.querySelector('#celArTime').value=selectedMinutes;schedule()}},1000);window.addEventListener('resize',schedule);window.addEventListener('orientationchange',()=>setTimeout(schedule,250));window.openCelestialAR=openAR}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1100));else setTimeout(install,1100);
})();
