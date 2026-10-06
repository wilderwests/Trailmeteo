'use strict';
/* Radar «a futuro»: lluvia prevista hora a hora (48 h) sobre el mapa del radar, a partir de una malla de puntos de Open-Meteo. */
(function(){
const RF={on:false,grid:null,layer:null,hour:0,times:[],data:null,timer:0,seq:0};
const COLS=16,ROWS=12;
const col=v=>v<.1?null:v<.5?'#9ed8f7':v<1?'#4fb0ef':v<2?'#2a7fd8':v<4?'#35b44a':v<7?'#f4d03f':v<12?'#f08c2b':'#d93a3a';
function ui(){const map=$('#radarMap');if(!map||$('#rfBar'))return;map.insertAdjacentHTML('beforebegin',`<div class="rf-bar" id="rfBar"><div class="rf-mode" role="group" aria-label="Modo del radar"><button type="button" data-rf="obs" aria-pressed="true">Radar observado</button><button type="button" data-rf="fc" aria-pressed="false">Previsión 48 h</button></div><div class="rf-ctl" id="rfCtl" hidden><button type="button" class="quiet" id="rfPlay">▶</button><input type="range" id="rfSlider" min="0" max="47" value="0" aria-label="Hora de la previsión"><b id="rfTime">—</b></div></div><p class="rf-legend" id="rfLegend" hidden><span>Lluvia prevista (mm/h):</span>${[['0,1','#9ed8f7'],['0,5','#4fb0ef'],['1','#2a7fd8'],['2','#35b44a'],['4','#f4d03f'],['7','#f08c2b'],['12+','#d93a3a']].map(([t,c])=>`<i style="background:${c}"></i>${t}`).join(' ')} · modelo de alta resolución (Open-Meteo). <span id="rfStatus"></span></p>`);
 $('#rfBar').onclick=e=>{const b=e.target.closest('[data-rf]');if(b)setMode(b.dataset.rf==='fc')};
 $('#rfSlider').oninput=e=>{stop();RF.hour=+e.target.value;paint()};$('#rfPlay').onclick=()=>RF.timer?stop():play()}
function stop(){clearInterval(RF.timer);RF.timer=0;const b=$('#rfPlay');if(b)b.textContent='▶'}
function play(){stop();$('#rfPlay').textContent='❚❚';RF.timer=setInterval(()=>{RF.hour=(RF.hour+1)%RF.times.length;$('#rfSlider').value=RF.hour;paint()},700)}
async function setMode(fc){RF.on=fc;$$('[data-rf]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.rf==='fc')===fc)));$('#rfCtl').hidden=!fc;$('#rfLegend').hidden=!fc;const r=S.radar;
 if(fc){if(typeof stopRadar==='function')stopRadar();r.layers?.forEach(l=>l.setOpacity?.(0));await load()}else{stop();RF.layer?.remove();RF.layer=null;if(typeof frame==='function'&&r.frames?.length)frame(r.index)}}
async function load(){const r=S.radar;if(!r.map)return;const b=r.map.getBounds(),s=b.getSouth(),n=b.getNorth(),w=b.getWest(),e=b.getEast(),dy=(n-s)/ROWS,dx=(e-w)/COLS;const pts=[];for(let i=0;i<ROWS;i++)for(let j=0;j<COLS;j++)pts.push({lat:s+dy*(i+.5),lon:w+dx*(j+.5),b:[[s+dy*i,w+dx*j],[s+dy*(i+1),w+dx*(j+1)]]});const seq=++RF.seq;$('#rfStatus').textContent='Cargando…';
 try{const url='https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:pts.map(p=>p.lat.toFixed(3)).join(','),longitude:pts.map(p=>p.lon.toFixed(3)).join(','),hourly:'precipitation',forecast_hours:'48',timezone:'auto'});const res=await fetch(url);if(!res.ok)throw Error('Open-Meteo '+res.status);let d=await res.json();if(!Array.isArray(d))d=[d];if(seq!==RF.seq||!RF.on)return;RF.times=d[0].hourly.time;RF.data=d.map(x=>x.hourly.precipitation);RF.grid=pts;
  RF.layer?.remove();RF.layer=L.layerGroup(pts.map(p=>L.rectangle(p.b,{stroke:false,fillOpacity:0,interactive:false}))).addTo(r.map);$('#rfSlider').max=RF.times.length-1;const now=Date.now();RF.hour=Math.max(0,RF.times.findIndex(t=>new Date(t).getTime()>=now-1800000));$('#rfSlider').value=RF.hour;paint();$('#rfStatus').textContent=''}
 catch(e){if(seq===RF.seq)$('#rfStatus').textContent='No se pudo cargar la previsión: '+e.message}}
function paint(){if(!RF.layer||!RF.data)return;const ls=RF.layer.getLayers();ls.forEach((l,k)=>{const v=RF.data[k]?.[RF.hour];const c=typeof v==='number'?col(v):null;l.setStyle({fillColor:c||'#000',fillOpacity:c?.55:0})});const t=RF.times[RF.hour];$('#rfTime').textContent=t?new Date(t).toLocaleString('es-ES',{weekday:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
ui();
const prevShow=showTab;showTab=function(t){prevShow.apply(this,arguments);if(t==='radar'){ui();if(RF.on){if(typeof stopRadar==='function')stopRadar();load()}}else stop()};
let mv=0;const hook=()=>{const m=S.radar?.map;if(!m||m._rfHook)return;m._rfHook=1;m.on('moveend',()=>{if(!RF.on)return;clearTimeout(mv);mv=setTimeout(load,500)})};setInterval(hook,1500);
globalThis.TMRadarFc={setMode,load,col,get state(){return RF}};
})();
