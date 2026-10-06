'use strict';
/* Radar «a futuro»: lluvia prevista hora a hora (48 h) sobre el mapa del radar, a partir de una malla de puntos de Open-Meteo interpolada como imagen suave. */
(function(){
const RF={on:false,grid:null,layer:null,hour:0,times:[],data:null,timer:0,seq:0,bounds:null};
const COLS=24,ROWS=18;
const STEPS=[[.1,'#9ed8f7'],[.5,'#4fb0ef'],[1,'#2a7fd8'],[2,'#35b44a'],[4,'#f4d03f'],[7,'#f08c2b'],[12,'#d93a3a']];
const col=v=>{if(!(v>=.1))return null;let c=STEPS[0][1];for(const [t,h] of STEPS)if(v>=t)c=h;return c};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function ui(){const shell=$('#radarShell');if(!shell||$('#rfBar'))return;shell.insertAdjacentHTML('beforebegin',`<div class="rf-bar" id="rfBar"><div class="rf-mode" role="group" aria-label="Modo del radar"><button type="button" data-rf="obs" aria-pressed="true">Radar observado · últimas 2 h</button><button type="button" data-rf="fc" aria-pressed="false">Previsión · próximas 48 h</button></div></div><div class="rf-ctl" id="rfCtl" hidden><button type="button" class="primary" id="rfPlay">▶ Reproducir</button><div class="rf-track"><output class="rf-bubble" id="rfBubble"></output><input type="range" id="rfSlider" min="0" max="47" value="0" aria-label="Hora de la previsión"><div class="rf-ticks" id="rfTicks"></div></div><b id="rfTime">—</b></div><p class="rf-legend" id="rfLegend" hidden><span>Lluvia prevista (mm/h):</span>${STEPS.map(([t,c])=>`<i style="background:${c}"></i>${String(t).replace('.',',')}${t===12?'+':''}`).join(' ')} <span id="rfStatus"></span></p>`);
 $('#rfBar').onclick=e=>{const b=e.target.closest('[data-rf]');if(b)setMode(b.dataset.rf==='fc')};
 $('#rfSlider').oninput=e=>{stop();RF.hour=+e.target.value;paint()};$('#rfPlay').onclick=()=>RF.timer?stop():play();
 $('#opacity')?.addEventListener('input',()=>RF.layer?.setOpacity(op()))}
const op=()=>Math.min(.95,Math.max(.3,(+$('#opacity')?.value||72)/100));
function stop(){clearInterval(RF.timer);RF.timer=0;const b=$('#rfPlay');if(b)b.textContent='▶ Reproducir'}
function play(){stop();$('#rfPlay').textContent='❚❚ Pausa';RF.timer=setInterval(()=>{RF.hour=(RF.hour+1)%RF.times.length;$('#rfSlider').value=RF.hour;paint()},800)}
function label(){const e=$('#pane-radar .sectionhead .eyebrow');if(e)e.textContent=RF.on?'PRECIPITACIÓN PREVISTA':'PRECIPITACIÓN OBSERVADA'}
async function setMode(fc){RF.on=fc;$$('[data-rf]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.rf==='fc')===fc)));$('#rfCtl').hidden=!fc;$('#rfLegend').hidden=!fc;$('#radarShell')?.classList.toggle('rf-on',fc);label();const r=S.radar;
 if(fc){RF.age=RF.age||$('#radarAge')?.textContent;if(typeof stopRadar==='function')stopRadar();await load()}else{stop();RF.layer?.remove();RF.layer=null;if(RF.age&&$('#radarAge'))$('#radarAge').textContent=RF.age;RF.age='';if(typeof frame==='function'&&r.frames?.length)frame(r.index)}}
async function load(){const r=S.radar;if(!r?.map)return;const m=r.map,pb=m.getPixelBounds(),z=m.getZoom(),dx=(pb.max.x-pb.min.x)/COLS,dy=(pb.max.y-pb.min.y)/ROWS;const pts=[];
 for(let i=0;i<ROWS;i++)for(let j=0;j<COLS;j++){const ll=m.unproject([pb.min.x+dx*(j+.5),pb.min.y+dy*(i+.5)],z);pts.push({lat:ll.lat,lon:L.Util.wrapNum?L.Util.wrapNum(ll.lng,[-180,180],true):ll.lng})}
 RF.bounds=L.latLngBounds(m.unproject(pb.min,z),m.unproject(pb.max,z));const seq=++RF.seq;$('#rfStatus').textContent='· cargando…';
 try{const url='https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:pts.map(p=>p.lat.toFixed(3)).join(','),longitude:pts.map(p=>p.lon.toFixed(3)).join(','),hourly:'precipitation',forecast_hours:'48',timezone:'auto'});const res=await fetch(url);if(!res.ok)throw Error('Open-Meteo '+res.status);let d=await res.json();if(!Array.isArray(d))d=[d];if(seq!==RF.seq||!RF.on)return;RF.times=d[0].hourly.time;RF.data=d.map(x=>x.hourly.precipitation);RF.grid=pts;
  $('#rfSlider').max=RF.times.length-1;ticks();if(!RF.loaded){const now=Date.now();RF.hour=Math.max(0,RF.times.findIndex(t=>new Date(t).getTime()>=now-1800000));RF.loaded=1}RF.hour=Math.min(RF.hour,RF.times.length-1);$('#rfSlider').value=RF.hour;paint();$('#rfStatus').textContent='· modelo de alta resolución vía Open-Meteo'}
 catch(e){if(seq===RF.seq)$('#rfStatus').textContent='· no se pudo cargar la previsión: '+e.message}}
/* Pinta la malla en un lienzo diminuto y deja que el navegador lo amplíe con suavizado: transiciones continuas en lugar de cuadros. */
function image(){const c=document.createElement('canvas');c.width=COLS;c.height=ROWS;const x=c.getContext('2d'),img=x.createImageData(COLS,ROWS);RF.data.forEach((s,k)=>{const v=s?.[RF.hour],h=col(v),o=k*4;if(!h)return;const [R,G,B]=rgb(h);img.data[o]=R;img.data[o+1]=G;img.data[o+2]=B;img.data[o+3]=Math.round(255*Math.min(1,.55+v/20))});x.putImageData(img,0,0);
 const big=document.createElement('canvas');big.width=COLS*16;big.height=ROWS*16;const bx=big.getContext('2d');bx.imageSmoothingEnabled=true;bx.imageSmoothingQuality='high';bx.filter='blur(6px)';bx.drawImage(c,0,0,big.width,big.height);return big.toDataURL()}
function paint(){if(!RF.data||!RF.bounds||!S.radar?.map)return;const url=image();if(RF.layer){RF.layer.setUrl(url);RF.layer.setBounds(RF.bounds)}else RF.layer=L.imageOverlay(url,RF.bounds,{opacity:op(),interactive:false,className:'rf-img'}).addTo(S.radar.map);
 const t=RF.times[RF.hour];const txt=t?new Date(t).toLocaleString('es-ES',{weekday:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';$('#rfTime').textContent=txt;bubble();const a=$('#radarAge');if(a)a.textContent='Previsión para '+txt;
 const max=Math.max(0,...RF.data.map(s=>s?.[RF.hour]||0));if(!RF.timer)$('#rfStatus').textContent=max<.1?'· sin lluvia prevista en la zona a esta hora':'· máximo en la zona '+max.toFixed(1).replace('.',',')+' mm/h'}
function ticks(){const el=$('#rfTicks');if(!el)return;const n=RF.times.length-1;el.innerHTML=RF.times.map((t,k)=>{const d=new Date(t),h=d.getHours();if(h%6)return'';return `<span style="left:${(k/n*100).toFixed(2)}%">${h===0?d.toLocaleDateString('es-ES',{weekday:'short'}):String(h).padStart(2,'0')+'h'}</span>`}).join('')}
function bubble(){const b=$('#rfBubble'),t=RF.times[RF.hour];if(!b||!t)return;const n=Math.max(1,RF.times.length-1),d=new Date(t);b.textContent=d.toLocaleDateString('es-ES',{weekday:'short'})+' '+String(d.getHours()).padStart(2,'0')+':00';b.style.left=`calc(${(RF.hour/n*100).toFixed(2)}% + ${(8-RF.hour/n*16).toFixed(1)}px)`}
ui();label();
const prevShow=showTab;showTab=function(t){prevShow.apply(this,arguments);if(t==='radar'){ui();if(RF.on){if(typeof stopRadar==='function')stopRadar();load()}}else stop()};
let mv=0;const hook=()=>{const m=S.radar?.map;if(!m||m._rfHook)return;m._rfHook=1;m.on('moveend',()=>{if(!RF.on)return;clearTimeout(mv);mv=setTimeout(load,500)})};setInterval(hook,1500);
globalThis.TMRadarFc={setMode,load,col,get state(){return RF}};
})();
