// Travel Photo OS — always-visible desktop Voyage button
(function(){
  function install(){
    if(window.innerWidth<=760)return;
    if(document.getElementById('uxDesktopVoyageFab'))return;
    const b=document.createElement('button');
    b.id='uxDesktopVoyageFab';
    b.className='uxDesktopVoyageFab';
    b.innerHTML='✈ <span>Voyage</span>';
    b.setAttribute('aria-label','Ouvrir le centre de contrôle du voyage');
    b.addEventListener('click',()=>{
      try{
        if(typeof window.openVoyageHub==='function')return window.openVoyageHub();
        if(typeof openVoyageHub==='function')return openVoyageHub();
      }catch(e){}
      try{if(typeof showHome==='function')showHome()}catch(e){}
    });
    document.body.appendChild(b);
  }
  function sync(){
    const b=document.getElementById('uxDesktopVoyageFab');
    if(window.innerWidth<=760){if(b)b.remove();return}
    if(!b)install();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));else setTimeout(install,900);
  window.addEventListener('resize',sync);
  setInterval(sync,3000);
})();
