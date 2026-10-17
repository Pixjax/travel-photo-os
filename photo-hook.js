// Bridge existing Photo mode to the new Photo Experience
(function(){
  function closePanel(){const p=document.getElementById('uxPhotoPanel');if(p)p.classList.remove('show');document.body.classList.remove('uxPhotoOpen')}
  function install(){
    if(typeof window.setMode==='function'){
      const base=window.setMode;
      window.setMode=function(m){
        const r=base.apply(this,arguments);
        if(m==='photo'&&typeof window.openPhotoExperience==='function')setTimeout(()=>window.openPhotoExperience(),20);
        else if(m!=='photo')closePanel();
        return r;
      };
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));else setTimeout(install,900);
})();
