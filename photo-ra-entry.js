// Travel Photo OS — permanent Photo RA Terrain entry
(function(){
  if(window.__travelPhotoRaEntryLoaded)return;
  window.__travelPhotoRaEntryLoaded=true;

  function ensureCss(){
    if(document.querySelector('link[data-ra-entry-css]'))return;
    const l=document.createElement('link');
    l.rel='stylesheet';
    l.href='./photo-ar-field.css?v=ra-entry-1';
    l.dataset.raEntryCss='1';
    document.head.appendChild(l);
  }

  function loadEngine(){
    ensureCss();
    if(typeof window.openPhotoFieldAR==='function')return Promise.resolve(true);
    return new Promise(resolve=>{
      let s=document.querySelector('script[data-ra-entry-js]');
      if(!s){
        s=document.createElement('script');
        s.src='./photo-ar-field.js?v=ra-entry-1';
        s.dataset.raEntryJs='1';
        document.body.appendChild(s);
      }
      let n=0;
      const t=setInterval(()=>{
        if(typeof window.openPhotoFieldAR==='function'||++n>40){
          clearInterval(t);
          resolve(typeof window.openPhotoFieldAR==='function');
        }
      },100);
    });
  }

  async function openRa(){
    const ok=await loadEngine();
    if(ok){try{window.openPhotoFieldAR('astro');return}catch(e){}}
    try{window.toast?.('RA Terrain indisponible · recharge l’app avec Internet')}catch(e){}
  }

  function mount(){
    const panel=document.getElementById('uxPhotoPanel');
    if(!panel)return false;
    const head=panel.querySelector('.uxPhotoHeadTop');
    if(!head)return false;

    let b=document.getElementById('photoRaTerrainPermanent');
    if(!b){
      b=document.createElement('button');
      b.id='photoRaTerrainPermanent';
      b.type='button';
      b.innerHTML='<span style="font-size:16px;line-height:1">◎</span><span>RA Terrain</span>';
      b.setAttribute('aria-label','Ouvrir RA Terrain');
      Object.assign(b.style,{
        minHeight:'42px',padding:'0 12px',borderRadius:'14px',background:'#fff',color:'#111',
        border:'0',fontSize:'9px',fontWeight:'900',display:'flex',alignItems:'center',gap:'6px',
        whiteSpace:'nowrap',flex:'none',boxShadow:'0 8px 24px rgba(0,0,0,.22)'
      });
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openRa()});
    }

    const close=head.querySelector('.uxPhotoClose');
    if(b.parentNode!==head){
      if(close)head.insertBefore(b,close);else head.appendChild(b);
    }
    return true;
  }

  function heal(){
    if(mount())return;
    setTimeout(mount,100);
  }

  const obs=new MutationObserver(heal);
  if(document.body)obs.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{childList:true,subtree:true}),{once:true});

  setInterval(heal,500);
  window.addEventListener('pageshow',heal);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)heal()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(heal,200));
  else setTimeout(heal,200);
})();
