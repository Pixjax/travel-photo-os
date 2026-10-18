(()=>{'use strict';
const shell=document.getElementById('shell'),chooser=document.getElementById('chooser'),canvas=document.getElementById('atmosphere');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(pointer:coarse)');
let timer=0,ctx=null,stars=[],width=0,height=0,dpr=1,frame=0,visible=true,previous=0;
function done(){clearTimeout(timer);shell.classList.add('ready');chooser.removeAttribute('inert')}
function play(){shell.classList.remove('ready');chooser.setAttribute('inert','');if(reduced.matches){done();return}clearTimeout(timer);timer=setTimeout(done,3250)}
document.getElementById('skip').addEventListener('click',done);

document.addEventListener('keydown',e=>{if(e.key==='Escape')done()});
function setup(){if(!canvas||reduced.matches)return;ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;resize();startStars()}
function resize(){if(!ctx)return;dpr=Math.min(devicePixelRatio||1,1.5);width=innerWidth;height=innerHeight;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(90,Math.round(width*height/18000));stars=Array.from({length:count},(_,i)=>({x:((i*73.71)%100)/100*width,y:((i*41.37+19)%100)/100*height,r:.3+(i%4)*.27,phase:i*1.8}))}
function startStars(){if(frame||!ctx||document.hidden||reduced.matches)return;frame=requestAnimationFrame(draw)}
function draw(t){frame=0;if(!ctx||document.hidden||reduced.matches)return;if(t-previous<32){frame=requestAnimationFrame(draw);return}previous=t;ctx.clearRect(0,0,width,height);
for(const s of stars){const alpha=.1+.31*(.5+.5*Math.sin(t*.00055+s.phase));ctx.fillStyle='rgba(207,222,237,'+alpha.toFixed(3)+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}
const y=height*.78;const glow=ctx.createRadialGradient(width*.5,y,5,width*.5,y,Math.min(width*.65,650));glow.addColorStop(0,'rgba(38,84,107,.105)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);frame=requestAnimationFrame(draw)}
addEventListener('resize',()=>{resize()},{passive:true});
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(!visible){cancelAnimationFrame(frame);frame=0}else startStars()});
reduced.addEventListener?.('change',()=>{if(reduced.matches){cancelAnimationFrame(frame);frame=0;done();ctx?.clearRect(0,0,width,height)}else{if(!ctx)setup();else startStars()}});
if(!coarse.matches&&!reduced.matches){document.querySelectorAll('.app[href]').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--mx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');el.style.setProperty('--my',((e.clientY-r.top)/r.height*100).toFixed(1)+'%')},{passive:true})})}
setup();play();
})();