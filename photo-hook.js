// Bridge existing Photo mode to the new Photo Experience + reliable Field AR entry
(function(){
  if(window.__travelPhotoPhotoHookLoaded)return;
  window.__travelPhotoPhotoHookLoaded=true;

  function closePanel(){
    const p=document.getElementById('uxPhotoPanel');
    if(p)p.classList.remove('show');
    document.body.classList.remove('uxPhotoOpen');
  }

  function ensureArCss(){
    if(document.querySelector('link[data-photo-field-ar-css]'))return;
    const l=document.createElement('link');
    l.rel='stylesheet';
    l.href='./photo-ar-field.css?v=field-ar-selfheal-2';
    l.dataset.photoFieldArCss='1';
    document.head.appendChild(l);
  }

  function loadArEngine(){
    ensureArCss();
    if(typeof window.openPhotoFieldAR==='function')return Promise.resolve(true);
    const existing=document.querySelector('script[data-photo-field-ar-js]');
    if(existing){
      return new Promise(resolve=>{
        let n=0;
        const t=setInterval(()=>{
          if(typeof window.openPhotoFieldAR==='function'||++n>30){clearInterval(t);resolve(typeof window.openPhotoFieldAR==='function')}
        },100);
      });
    }
    return new Promise(resolve=>{
      const s=document.createElement('script');
      s.src='./photo-ar-field.js?v=field-ar-selfheal-2';
      s.dataset.photoFieldArJs='1';
      s.onload=()=>resolve(typeof window.openPhotoFieldAR==='function');
      s.onerror=()=>resolve(false);
      document.body.appendChild(s);
    });
  }

  async function openFieldAR(){
    const ok=await loadArEngine();
    if(ok){
      try{window.openPhotoFieldAR('astro');return}catch(e){console.warn('RA Terrain',e)}
    }
    try{if(typeof window.toast==='function')window.toast('RA Terrain indisponible · recharge l’app une fois avec Internet')}catch(e){}
  }

  function ensureFieldARButton(){
    const panel=document.getElementById('uxPhotoPanel');
    if(!panel)return;
    const head=panel.querySelector('.uxPhotoHeadTop');
    if(!head)return;
    let b=head.querySelector('#photoFieldArHeaderBtn');
    if(!b){
      b=document.createElement('button');
      b.id='photoFieldArHeaderBtn';
      b.type='button';
      b.setAttribute('aria-label','Ouvrir la RA Terrain Photo Pro');
      b.innerHTML='<span style="font-size:15px">◎</span><span>RA Terrain</span>';
      Object.assign(b.style,{
        minHeight:'42px',padding:'0 11px',borderRadius:'14px',background:'#fff',color:'#111',
        border:'0',fontSize:'9px',fontWeight:'900',display:'flex',alignItems:'center',gap:'6px',
        whiteSpace:'nowrap',flex:'none'
      });
      const close=head.querySelector('.uxPhotoClose');
      if(close)head.insertBefore(b,close);else head.appendChild(b);
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openFieldAR()});
    }
  }

  function heal(){
    const panel=document.getElementById('uxPhotoPanel');
    if(panel&&panel.classList.contains('show'))ensureFieldARButton();
  }

  function install(){
    if(typeof window.setMode==='function'){
      const base=window.setMode;
      window.setMode=function(m){
        const r=base.apply(this,arguments);
        if(m==='photo'&&typeof window.openPhotoExperience==='function'){
          setTimeout(()=>{window.openPhotoExperience();setTimeout(heal,30)},20);
        }else if(m!=='photo')closePanel();
        return r;
      };
    }
    const obs=new MutationObserver(heal);
    if(document.body)obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    setInterval(heal,700);
    window.addEventListener('pageshow',()=>setTimeout(heal,100));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(heal,100)});
    setTimeout(heal,300);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));
  else setTimeout(install,900);
})();
