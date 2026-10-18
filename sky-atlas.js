(function(){
if(window.openSkyAtlas)return;
const d=Math.PI/180,rad=180/Math.PI,wrap=x=>(x%360+360)%360,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const stars=[['Sirius',101.287,-16.716,-1.46],['Canopus',95.988,-52.696,-.74],['Arcturus',213.915,19.182,-.05],['Vega',279.234,38.784,.03],['Capella',79.172,45.998,.08],['Rigel',78.634,-8.202,.13],['Procyon',114.825,5.225,.34],['Betelgeuse',88.793,7.407,.42],['Achernar',24.429,-57.237,.46],['Hadar',210.956,-60.373,.61],['Acrux',186.650,-63.099,.76],['Altair',297.696,8.868,.77],['Aldebaran',68.980,16.509,.85],['Spica',201.298,-11.161,.97],['Antares',247.352,-26.432,1.06],['Pollux',116.329,28.026,1.14],['Fomalhaut',344.412,-29.622,1.16],['Deneb',310.358,45.280,1.25],['Mimosa',191.930,-59.689,1.25],['Regulus',152.093,11.967,1.35],['Adhara',104.656,-28.972,1.50],['Castor',113.650,31.888,1.58],['Gacrux',187.792,-57.113,1.63],['Bellatrix',81.283,6.350,1.64],['Elnath',81.573,28.608,1.65],['Alnair',332.058,-46.961,1.73],['Alioth',193.507,55.960,1.76],['Dubhe',165.932,61.751,1.79],['Merak',165.461,56.382,2.37],['Mizar',200.981,54.925,2.23],['Alkaid',206.885,49.313,1.86],['Polaris',37.955,89.264,1.98],['Alnitak',85.189,-1.943,1.74],['Alnilam',84.053,-1.202,1.69],['Mintaka',83.002,-.299,2.25],['Saiph',86.939,-9.670,2.07],['Sadr',305.557,40.257,2.23],['Albireo',292.680,27.960,3.05],['Kaus Australis',276.043,-34.384,1.79],['Shaula',263.402,-37.104,1.62],['Nunki',283.816,-26.297,2.05],['Dschubba',240.083,-22.622,2.29],['Rasalhague',263.734,12.560,2.08],['Mirfak',51.081,49.861,1.79],['Algol',47.042,40.955,2.12],['Alpheratz',2.097,29.091,2.06],['Markab',346.190,15.205,2.49],['Rigil Kentaurus',219.902,-60.834,-.01]];
let root,canvas,ctx,video,stream,shown=false,lat=-16.92,lon=145.77,heading=180,elevation=20,fov=90,offset=0,date=new Date(),live=true,frame=0,drag=null,cam=false,sensorGood=false,sensorAccuracy=null,sensorUpdated=0,calibrationReference=null,orientationLabel='Capteurs non prêts',yawCorrection=null,goodCompassSamples=0,lastGoodHeading=null;
function jd(t){return t.getTime()/86400000+2440587.5}
function lst(t){let j=jd(t),T=(j-2451545)/36525;return wrap(280.46061837+360.98564736629*(j-2451545)+.000387933*T*T-T*T*T/38710000+lon)}
function equ(ra,dec){let H=(wrap(lst(date)-ra+180)-180)*d,p=lat*d,de=dec*d,h=Math.asin(Math.sin(p)*Math.sin(de)+Math.cos(p)*Math.cos(de)*Math.cos(H));return {az:wrap((Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(p)-Math.tan(de)*Math.cos(p))+Math.PI)*rad),alt:h*rad}}
function gal(l){let x=Math.cos(l*d),y=Math.sin(l*d),xx=-.0548755604*x-.8734370902*y,yy=.4941094279*x-.4448296300*y,zz=-.8676661490*x-.1980763734*y;return equ(wrap(Math.atan2(yy,xx)*rad),Math.asin(zz)*rad)}
function projection(p,w,h){let A=(p.az-heading-offset)*d,E=p.alt*d,e=elevation*d,z=Math.sin(E)*Math.sin(e)+Math.cos(E)*Math.cos(e)*Math.cos(A);if(z<=.02)return null;let k=(w/2)/Math.tan(fov*d/2);return {x:w/2+k*Math.cos(E)*Math.sin(A)/z,y:h/2-k*(Math.sin(E)*Math.cos(e)-Math.cos(E)*Math.cos(A)*Math.sin(e))/z}}
function line(points,w,h){ctx.beginPath();let prev=null;for(const p of points){let q=projection(p,w,h);if(!q||q.x<-w||q.x>2*w||q.y<-h||q.y>2*h){prev=null;continue}if(!prev)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);prev=q}ctx.stroke()}
function draw(){if(!shown)return;if(live)date=new Date();const z=devicePixelRatio||1,w=innerWidth,h=innerHeight;canvas.width=Math.round(w*z);canvas.height=Math.round(h*z);ctx.setTransform(z,0,0,z,0,0);ctx.clearRect(0,0,w,h);
ctx.lineWidth=1;ctx.strokeStyle='#65758aa0';line(Array.from({length:181},(_,i)=>({az:2*i,alt:0})),w,h);
ctx.lineWidth=25;ctx.strokeStyle='#9476f540';line(Array.from({length:361},(_,i)=>gal(i)),w,h);
ctx.lineWidth=1.5;ctx.strokeStyle='#c3a6ff';line(Array.from({length:361},(_,i)=>gal(i)),w,h);
for(let A=0;A<360;A+=45){const q=projection({az:A,alt:0},w,h);if(q){ctx.fillStyle='#d5dfef';ctx.font='12px system-ui';ctx.fillText(['N','NE','E','SE','S','SO','O','NO'][A/45],q.x,q.y-5)}}
for(const s of stars){let p=equ(s[1],s[2]);if(p.alt<-7)continue;let q=projection(p,w,h);if(!q||q.x<0||q.x>w||q.y<0||q.y>h)continue;ctx.fillStyle='#f7f7ff';ctx.beginPath();ctx.arc(q.x,q.y,clamp(3-s[3]*.55,1,3.8),0,7);ctx.fill();if(s[3]<1.3){ctx.font='11px system-ui';ctx.fillText(s[0],q.x+7,q.y-7)}}
const gc=gal(0),g=projection(gc,w,h);if(g){ctx.strokeStyle='#f2a9ff';ctx.strokeRect(g.x-10,g.y-10,20,20);ctx.fillStyle='#f2d9ff';ctx.font='12px system-ui';ctx.fillText('Centre galactique',g.x+15,g.y)}
if(window.SunCalc)for(const [name,p,color]of [['Soleil',SunCalc.getPosition(date,lat,lon),'#ffd772'],['Lune',SunCalc.getMoonPosition(date,lat,lon),'#d8e5ff']]){const q=projection({az:wrap(p.azimuth*rad+180),alt:p.altitude*rad},w,h);if(q){ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,7,0,7);ctx.fill();ctx.fillText(name,q.x+10,q.y-8)}}
root.querySelector('#skyStatus').textContent=Math.round(wrap(heading+offset))+'° / '+Math.round(elevation)+'° • '+date.toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+(cam?' · '+(Date.now()-sensorUpdated>2500?'Capteurs inactifs':orientationLabel)+(sensorAccuracy!=null?' ±'+Math.round(sensorAccuracy)+'°':''):'');root.classList.toggle('skyUnreliable',cam&&(!sensorGood||Date.now()-sensorUpdated>2500));
frame=requestAnimationFrame(draw)}
function localDateValue(t){return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')}
function localTimeValue(t){return String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')}
function refresh(){
 root.querySelector('#skyDate').value=localDateValue(date);
 root.querySelector('#skyTime').value=localTimeValue(date);
 root.querySelector('#skyClockMode').textContent=live?'DIRECT · heure réelle':'PRÉVISION · date et heure choisies';
 root.querySelector('#skyNow').classList.toggle('on',live);
}
function pickTime(){
 const day=root.querySelector('#skyDate').value,hm=root.querySelector('#skyTime').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^\d{2}:\d{2}$/.test(hm))return;
 const [y,m,d]=day.split('-').map(Number),[h,min]=hm.split(':').map(Number);
 const chosen=new Date(y,m-1,d,h,min);
 if(!Number.isFinite(chosen.getTime()))return;
 date=chosen;live=false;refresh();
}
function build(){
 if(root)return;
 root=document.createElement('div');root.id='skyAtlas';
 root.innerHTML='<video id="skyVideo" playsinline muted></video><canvas id="skyCanvas"></canvas><div class="skyHeader"><div><small>PHOTO PRO · PLANÉTARIUM</small><b>Ciel verrouillé</b><span id="skyStatus"></span></div><button id="skyExit" type="button">✕</button></div><div class="skyControls"><div class="skyRow"><button id="skyNow" type="button">● Maintenant</button><button id="skyCamera" type="button">📷 RA caméra</button><button id="skyNight" type="button">Mode rouge</button></div><div class="skyModeLabel" id="skyClockMode">DIRECT · heure réelle</div><div class="skyRow skyPredict"><label>Date<input type="date" id="skyDate"></label><label>Heure<input type="time" id="skyTime" step="60"></label></div><div class="skyRow"><button id="skyGps" type="button">⌖ Position GPS</button><button id="skyRecalibrate" type="button">↻ Recalibrer</button></div><small class="skyDisclaimer">La date et l’heure de prévision utilisent le fuseau horaire de ton téléphone. Oriente le téléphone pour explorer le ciel : déplacement manuel et curseurs désactivés. La RA dépend de la boussole et ne remplace pas un alignement vérifié.</small></div>';
 document.body.appendChild(root);canvas=root.querySelector('canvas');ctx=canvas.getContext('2d');video=root.querySelector('video');
 root.querySelector('#skyExit').onclick=close;
 root.querySelector('#skyNow').onclick=()=>{live=true;date=new Date();refresh()};
 root.querySelector('#skyNight').onclick=()=>root.classList.toggle('red');
 root.querySelector('#skyCamera').onclick=toggleCam;
 root.querySelector('#skyGps').onclick=()=>{if(!navigator.geolocation){alert('GPS indisponible');return}navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lon=p.coords.longitude;},()=>alert('Localisation indisponible : vérifie les autorisations iPhone.'),{enableHighAccuracy:true,timeout:12000})};
 root.querySelector('#skyRecalibrate').onclick=()=>{
   yawCorrection=null;goodCompassSamples=0;sensorGood=false;sensorUpdated=0;
   orientationLabel='Recalibrage en cours';
   alert('Éloigne l’iPhone des objets métalliques et aimantés, puis oriente-le lentement dans plusieurs directions. Si la boussole reste imprécise, la RA ne peut pas garantir le nord.');
 };
 root.querySelector('#skyDate').addEventListener('change',pickTime);
 root.querySelector('#skyTime').addEventListener('change',pickTime);
 canvas.style.touchAction='none';
 // No manual sky drag. The same real-world direction stays fixed while the phone rotates.
 canvas.onpointerdown=()=>{};canvas.onpointermove=()=>{};canvas.onpointerup=()=>{};
}
async function toggleCam(){if(cam){stopCam();return}try{const permission=(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function')?DeviceOrientationEvent.requestPermission():Promise.resolve('granted');const camera=navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});const [permissionResult,media]=await Promise.allSettled([permission,camera]);if(media.status!=='fulfilled')throw media.reason;stream=media.value;video.srcObject=stream;await video.play();cam=true;sensorGood=false;sensorUpdated=0;yawCorrection=null;goodCompassSamples=0;root.classList.add('camera');root.querySelector('#skyCamera').textContent='Carte du ciel';if(permissionResult.status==='fulfilled'&&permissionResult.value==='granted')window.addEventListener('deviceorientation',orient,true);else alert('Caméra active, mais orientation refusée. Utilise le mode carte ou autorise les capteurs.')}catch(e){alert('Caméra indisponible : '+e.message)}}
// Device Euler angles (intrinsic Z-X'-Y' rotations): derive camera -Z
// in local tangent coordinates. The compass anchors the yaw separately.
function orientationVectors(alpha,beta,gamma){
 const a=alpha*d,b=beta*d,g=gamma*d;
 const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cg=Math.cos(g),sg=Math.sin(g);
 // Device -> earth, columns are right (+X), top (+Y), back (+Z)
 const x=[ca*cg-sa*sb*sg,sa*cg+ca*sb*sg,-cb*sg];
 const y=[-sa*cb,ca*cb,sb];
 const z=[ca*sg+sa*sb*cg,sa*sg-ca*sb*cg,cb*cg];
 return {x,y,z};
}
function orient(e){
 if(!cam||!Number.isFinite(e.alpha)||!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;
 const v=orientationVectors(e.alpha,e.beta,e.gamma);
 // Back camera looks along device -Z. Earth-frame x=east, y=north, z=up.
 const ray=v.z.map(n=>-n);
 const horizontal=Math.hypot(ray[0],ray[1]);
 const tilt=Math.asin(clamp(ray[2],-1,1))*rad;
 if(Number.isFinite(tilt))elevation=clamp(elevation+(tilt-elevation)*.2,-89,89);
 sensorUpdated=Date.now();
 const compass=e.webkitCompassHeading;
 sensorAccuracy=Number.isFinite(e.webkitCompassAccuracy)?Math.abs(e.webkitCompassAccuracy):null;
 if(!Number.isFinite(compass)||sensorAccuracy===null||sensorAccuracy>20||horizontal<.1){
   sensorGood=false;goodCompassSamples=0;
   orientationLabel=horizontal<.1?'Caméra verticale · cap non défini':'Nord imprécis · alignement figé';
   return;
 }
 const top=v.y, topHorizontal=Math.hypot(top[0],top[1]);
 // iOS compassHeading gives the geographic heading of the device top.
 // A north correction is established only while that top has a usable
 // horizontal projection. Keep the correction fixed while rotating the phone:
 // changing the correction each frame would make NORTH drift.
 if(topHorizontal>.32){
   const eulerTop=wrap(Math.atan2(top[0],top[1])*rad);
   const candidate=wrap(compass-eulerTop+180)-180;
   if(yawCorrection===null){yawCorrection=candidate;goodCompassSamples=1}
   else {
     const difference=wrap(candidate-yawCorrection+180)-180;
     if(Math.abs(difference)<12){goodCompassSamples=Math.min(50,goodCompassSamples+1);if(goodCompassSamples>5)yawCorrection=wrap(yawCorrection+difference*.025+180)-180}
     else goodCompassSamples=Math.max(0,goodCompassSamples-2);
   }
 }
 if(yawCorrection===null){
   sensorGood=false;orientationLabel='Oriente l’iPhone vers le bas pour initialiser le nord';return;
 }
 const worldAz=wrap(Math.atan2(ray[0],ray[1])*rad+yawCorrection);
 const delta=wrap(worldAz-heading+180)-180;
 // Smooth within a single, fixed geographical frame — never add device
 // orientation directly to a heading already in geographical coordinates.
 heading=wrap(heading+delta*.24);
 lastGoodHeading=heading;sensorGood=true;
 orientationLabel='Nord géographique suivi';
}
function stopCam(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;cam=false;sensorGood=false;video.srcObject=null;root.classList.remove('camera');root.querySelector('#skyCamera').textContent='📷 RA caméra';window.removeEventListener('deviceorientation',orient,true)}
function open(){build();offset=0;try{if(typeof myGeo!=='undefined'&&myGeo&&Number.isFinite(+myGeo.lat)){lat=+myGeo.lat;lon=+myGeo.lon}else if(typeof selected!=='undefined'&&selected&&Number.isFinite(+selected.lat)){lat=+selected.lat;lon=+selected.lon}}catch(e){}date=new Date();live=true;refresh();shown=true;root.classList.add('show');cancelAnimationFrame(frame);draw()}
function close(){shown=false;cancelAnimationFrame(frame);stopCam();root.classList.remove('show')}
window.openSkyAtlas=open;
})();