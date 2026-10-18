/* NØMIA dual map theme: keeps existing MapLibre style, POIs and route layers intact. */
(function(){
 const KEY='nomia-map-look-v1';
 let enabled=false;
 const read=()=>{try{return localStorage.getItem(KEY)||'vector'}catch(e){return 'vector'}};
 const save=v=>{try{localStorage.setItem(KEY,v)}catch(e){}};
 const mapInstance=()=>{try{return typeof map!=='undefined'?map:null}catch(e){return null}};
 const original=new Map();
 const isBase=l=>l && !['satLayer','dem','hill','glow','dots','routeShadow','routeLine','buildings'].includes(l.id) && !/^(geo|nav|user|arrival|collab|photo)/i.test(l.id) && !['raster','hillshade','fill-extrusion'].includes(l.type);
 function recolor(m){
  const layers=m.getStyle()?.layers||[];
  layers.filter(isBase).forEach(l=>{
   const fields=l.type==='background'?['background-color']:l.type==='fill'?['fill-color']:l.type==='line'?['line-color']:l.type==='symbol'?['text-color','text-halo-color']:null;
   if(!fields)return;
   fields.forEach(prop=>{
    if(!m.getLayer(l.id))return;
    const k=l.id+'|'+prop;
    try{
     if(!original.has(k))original.set(k,m.getPaintProperty(l.id,prop));
     if(l.type==='background')m.setPaintProperty(l.id,prop,'#061629');
     else if(l.type==='fill')m.setPaintProperty(l.id,prop,'#152e45');
     else if(l.type==='line')m.setPaintProperty(l.id,prop,'#345577');
     else if(prop==='text-color')m.setPaintProperty(l.id,prop,'#d9e6ef');
     else if(prop==='text-halo-color')m.setPaintProperty(l.id,prop,'#061629');
    }catch(e){}
   });
  });
 }
 function restore(m){
  for(const [key,value] of original){
   const i=key.lastIndexOf('|'),id=key.slice(0,i),prop=key.slice(i+1);
   try{if(m.getLayer(id))m.setPaintProperty(id,prop,value===undefined?null:value)}catch(e){}
  }
 }
 function apply(mode){
  const m=mapInstance();if(!m||!m.getLayer('satLayer'))return;
  const sat=mode==='satellite';
  try{
   // Do not call setStyle: it would discard the trips, spot, route and navigation sources.
   if(sat){restore(m);m.setLayoutProperty('satLayer','visibility','visible');
    m.setPaintProperty('satLayer','raster-opacity',.94);
    m.setPaintProperty('satLayer','raster-brightness-max',.67);
    m.setPaintProperty('satLayer','raster-saturation',-.3);
    m.setPaintProperty('satLayer','raster-contrast',.13);
   }else{
    m.setLayoutProperty('satLayer','visibility','none');
    recolor(m);
   }
   try{satellite=sat}catch(e){}
   const legacy=document.getElementById('satBtn');if(legacy)legacy.classList.toggle('on',sat);
   const btn=document.getElementById('nomiaMapStyleToggle');
   if(btn){btn.innerHTML=sat?'◈ <span>Satellite sombre</span>':'▧ <span>Carte bleu nuit</span>';btn.setAttribute('aria-label',sat?'Passer en carte vectorielle bleu nuit':'Passer en satellite sombre');btn.setAttribute('aria-pressed',String(sat));btn.title='Changer le fond de carte';}
   save(mode);enabled=true;
  }catch(e){console.warn('NØMIA map theme',e)}
 }
 function mount(){
  const m=mapInstance();if(!m||!m.getLayer('satLayer'))return false;
  if(!document.getElementById('nomiaMapStyleToggle')){
   const btn=document.createElement('button');
   btn.id='nomiaMapStyleToggle';btn.type='button';btn.className='nomia-map-style-toggle';
   btn.addEventListener('click',()=>apply(read()==='satellite'?'vector':'satellite'));
   document.body.appendChild(btn);
   const old=document.getElementById('satBtn');
   if(old)old.addEventListener('click',()=>setTimeout(()=>apply((typeof satellite!=='undefined'&&satellite)?'satellite':'vector'),0));
  }
  apply(read());return true;
 }
 let attempts=0;const handle=setInterval(()=>{if(mount()||++attempts>90)clearInterval(handle)},400);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&enabled)apply(read())});
})();
