// Travel Photo OS — single reliable RA Terrain entry
(function(){
  if(window.__travelPhotoRaDirectLoaded)return;
  window.__travelPhotoRaDirectLoaded=true;

  const OLD_SELECTORS=['#photoFieldArHeaderBtn','#photoRaTerrainPermanent','#uxPhotoScroll [data-field-master]'];

  function removeOldEntries(){
    OLD_SELECTORS.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.remove()));
  }

  function mount(){
    removeOldEntries();
    if(typeof window.openPhotoFieldAR!=='function')return false;
    const panel=document.getElementById('uxPhotoPanel');
    const head=panel?.querySelector('.uxPhotoHeadTop');
    if(!head)return false;

    let b=document.getElementById('photoRaTerrainDirect');
    if(!b){
      b=document.createElement('button');
      b.id='photoRaTerrainDirect';
      b.type='button';
      b.setAttribute('aria-label','Ouvrir RA Terrain');
      b.innerHTML='<span style="font-size:16px;line-height:1">◎</span><span>RA Terrain</span>';
      Object.assign(b.style,{
        minHeight:'42px',padding:'0 12px',borderRadius:'14px',background:'#fff',color:'#111',border:'0',
        fontSize:'9px',fontWeight:'900',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap',flex:'none',
        boxShadow:'0 8px 24px rgba(0,0,0,.22)'
      });
      b.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();
        try{window.openPhotoFieldAR('astro')}catch(err){
          console.error('RA Terrain',err);
          try{window.toast?.('Impossible d’ouvrir RA Terrain')}catch(_){ }
        }
      });
    }
    const close=head.querySelector('.uxPhotoClose');
    if(b.parentNode!==head){
      if(close)head.insertBefore(b,close);else head.appendChild(b);
    }
    return true;
  }

  function heal(){removeOldEntries();mount()}
  const style=document.createElement('style');
  style.textContent='#uxPhotoScroll [data-field-master]{display:none!important}';
  document.head.appendChild(style);

  const obs=new MutationObserver(()=>setTimeout(heal,0));
  function install(){
    obs.observe(document.body,{childList:true,subtree:true});
    let tries=0;
    const t=setInterval(()=>{
      heal();
      if(typeof window.openPhotoFieldAR==='function'&&document.getElementById('photoRaTerrainDirect')){clearInterval(t);return}
      if(++tries>80)clearInterval(t);
    },100);
    window.addEventListener('pageshow',()=>setTimeout(heal,50));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(heal,50)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
