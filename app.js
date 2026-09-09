const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = {
  location: null, forecast: null, models: [],
  radar: {meta:null,frames:[],layer:null,map:null,timer:null},
  route: {points:[],sampled:[],map:null,line:null,markers:[],riskLines:[],radarLayer:null,analysis:null,name:null}
};
const OM='https://api.open-meteo.com/v1/forecast';
const GEO='https://geocoding-api.open-meteo.com/v1/search';
const MODEL_ENDPOINTS=[
  {name:'ECMWF IFS',url:'https://api.open-meteo.com/v1/ecmwf'},
  {name:'DWD ICON',url:'https://api.open-meteo.com/v1/dwd-icon'},
  {name:'NOAA GFS',url:'https://api.open-meteo.com/v1/gfs'},
  {name:'GEM',url:'https://api.open-meteo.com/v1/gem'}
];
const hourlyVars=['temperature_2m','apparent_temperature','relative_humidity_2m','precipitation','precipitation_probability','weather_code','cloud_cover','visibility','wind_speed_10m','wind_gusts_10m','cape','uv_index','freezing_level_height'];

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fmt(v,d=0){return Number.isFinite(+v)?(+v).toFixed(d):'—'}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toLocalInput(d){const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`}
function weatherLabel(code){if(code===0)return'Despejado';if(code<=3)return'Nuboso';if(code<=48)return'Niebla';if(code<=57)return'Llovizna';if(code<=67)return'Lluvia';if(code<=77)return'Nieve';if(code<=82)return'Chubascos';if(code<=86)return'Nieve';if(code>=95)return'Tormenta';return'Variable'}
function trailScore(h){
  let s=100;
  const p=+h.precipitation||0, pp=+h.precipitation_probability||0, gust=+h.wind_gusts_10m||0, vis=+h.visibility||100000, cape=+h.cape||0, t=+h.apparent_temperature||+h.temperature_2m||15, uv=+h.uv_index||0;
  s-=Math.min(34,p*11); s-=Math.max(0,(pp-25)*.18); s-=Math.max(0,(gust-30)*.7); s-=vis<1000?25:vis<3000?14:vis<7000?6:0; s-=Math.min(22,cape/90);
  if(t>28)s-=(t-28)*2.4; if(t<1)s-=(1-t)*1.6; if(uv>7)s-=(uv-7)*2;
  if((+h.weather_code||0)>=95)s-=25;
  return Math.round(clamp(s,0,100));
}
function riskText(h){
  const risks=[]; if((+h.weather_code||0)>=95 || (+h.cape||0)>1000) risks.push('tormenta');
  if((+h.precipitation||0)>=2) risks.push('lluvia intensa'); else if((+h.precipitation_probability||0)>60) risks.push('lluvia');
  if((+h.wind_gusts_10m||0)>55) risks.push('rachas'); if((+h.visibility||99999)<3000) risks.push('visibilidad');
  if((+h.apparent_temperature||0)>30) risks.push('calor'); if((+h.apparent_temperature||10)<0) risks.push('frío');
  return risks.length?risks.join(', '):'sin riesgo destacado';
}
function hourlyObjects(data){
  if(!data?.hourly?.time)return[]; const h=data.hourly;
  return h.time.map((time,i)=>{const o={time}; for(const k of Object.keys(h)){if(k!=='time')o[k]=h[k]?.[i]} return o});
}
function nearestHour(hours,date){let best=null,bd=Infinity; for(const h of hours){const d=Math.abs(new Date(h.time)-date); if(d<bd){bd=d;best=h}} return best}
function mean(xs){const a=xs.filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN}
function std(xs){const m=mean(xs),a=xs.filter(Number.isFinite);return a.length?Math.sqrt(mean(a.map(x=>(x-m)**2))):NaN}
function distKm(a,b){const R=6371,rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad,la1=a.lat*rad,la2=b.lat*rad;const q=Math.sin(dlat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.sqrt(q))}

async function fetchJSON(url){const r=await fetch(url); if(!r.ok)throw new Error(`${r.status} ${r.statusText}`); return r.json()}
function forecastURL(lat,lon,days=7){const p=new URLSearchParams({latitude:lat,longitude:lon,hourly:hourlyVars.join(','),current:['temperature_2m','apparent_temperature','precipitation','weather_code','wind_speed_10m','wind_gusts_10m'].join(','),timezone:'auto',forecast_days:String(days)});return `${OM}?${p}`}

async function setLocation(loc){
  state.location=loc; $('#placeMeta').textContent=`${loc.name||'Ubicación'} · ${(+loc.lat).toFixed(4)}, ${(+loc.lon).toFixed(4)}${loc.elevation?` · ${Math.round(loc.elevation)} m`:''}`;
  $('#heroWeather').innerHTML='Actualizando predicción…';
  try{
    state.forecast=await fetchJSON(forecastURL(loc.lat,loc.lon,10)); renderNow();
    updateMaps(); loadModels(); loadRadar(); refreshSupplementary();
  }catch(e){$('#heroWeather').innerHTML=`<span class="riskHigh">No se pudo cargar el tiempo: ${escapeHtml(e.message)}</span>`}
}

function renderNow(){
  const d=state.forecast,c=d.current||{},hours=hourlyObjects(d),now=nearestHour(hours,new Date()),score=trailScore(now||c);
  $('#heroWeather').innerHTML=`<div class="heroTop"><div><div class="muted">${escapeHtml(state.location.name||'Ubicación')}</div><div class="temp">${fmt(c.temperature_2m)}°</div><div>${weatherLabel(+c.weather_code||0)} · sensación ${fmt(c.apparent_temperature)}°</div></div><div><div class="scoreRing" style="--score:${score}"><span>${score}</span></div><div class="smallText muted" style="text-align:center;margin-top:6px">Trail Score</div></div></div><div class="metricGrid"><div class="metric"><b>${fmt(c.precipitation,1)} mm</b><span>precipitación actual</span></div><div class="metric"><b>${fmt(c.wind_gusts_10m)} km/h</b><span>rachas</span></div><div class="metric"><b>${fmt(now?.visibility/1000,1)} km</b><span>visibilidad</span></div><div class="metric"><b>${fmt(now?.cape)} J/kg</b><span>CAPE</span></div></div><p class="muted smallText">Riesgo principal: ${escapeHtml(riskText(now||{}))}.</p>`;
  const future=hours.filter(h=>new Date(h.time)>=new Date()).slice(0,72); const windows=future.map(h=>({...h,score:trailScore(h)})).sort((a,b)=>b.score-a.score).slice(0,5).sort((a,b)=>new Date(a.time)-new Date(b.time));
  $('#bestWindows').innerHTML=`<h2>Mejores ventanas próximas</h2>${windows.map(h=>`<div class="window"><strong>${new Date(h.time).toLocaleString('es-ES',{weekday:'short',hour:'2-digit',minute:'2-digit'})} · ${h.score}/100</strong><div class="muted smallText">${fmt(h.temperature_2m)}° · lluvia ${fmt(h.precipitation,1)} mm (${fmt(h.precipitation_probability)}%) · rachas ${fmt(h.wind_gusts_10m)} km/h</div></div>`).join('')}`;
  $('#hourly').innerHTML=`<h2>Próximas 24 h</h2><div class="hourStrip">${future.slice(0,24).map(h=>{const s=trailScore(h);return `<div class="hourCard ${s>=75?'good':s<50?'bad':''}"><b>${new Date(h.time).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</b><div>${fmt(h.temperature_2m)}°</div><div>☔ ${fmt(h.precipitation_probability)}%</div><div>💨 ${fmt(h.wind_gusts_10m)}</div><div class="smallText">${s}/100</div></div>`}).join('')}</div>`;
}

async function searchPlaces(){
  const q=$('#placeSearch').value.trim(); if(q.length<2)return; const data=await fetchJSON(`${GEO}?${new URLSearchParams({name:q,count:'8',language:'es',format:'json'})}`); const box=$('#searchResults');
  box.innerHTML=(data.results||[]).map((r,i)=>`<div class="searchResult" data-i="${i}"><b>${escapeHtml(r.name)}</b><div class="muted smallText">${escapeHtml([r.admin1,r.country].filter(Boolean).join(', '))} · ${Math.round(r.elevation||0)} m</div></div>`).join('')||'<div class="searchResult">Sin resultados</div>';box.classList.remove('hidden');
  $$('.searchResult[data-i]').forEach(el=>el.onclick=()=>{const r=data.results[+el.dataset.i];box.classList.add('hidden');setLocation({name:r.name,lat:r.latitude,lon:r.longitude,elevation:r.elevation})});
}

async function loadModels(){
  if(!state.location)return; $('#modelCards').innerHTML='Comparando modelos…'; const {lat,lon}=state.location; const vars=['temperature_2m','precipitation','wind_gusts_10m','weather_code'];
  const results=await Promise.allSettled(MODEL_ENDPOINTS.map(async m=>{const p=new URLSearchParams({latitude:lat,longitude:lon,hourly:vars.join(','),timezone:'auto',forecast_days:'5'});return {...m,data:await fetchJSON(`${m.url}?${p}`)}}));
  state.models=results.filter(x=>x.status==='fulfilled').map(x=>x.value); renderModels();
}
function renderModels(){
  if(!state.models.length){$('#modelCards').innerHTML='<span class="muted">Sin modelos disponibles.</span>';return}
  const when=new Date(Date.now()+12*3600e3), rows=state.models.map(m=>({name:m.name,h:nearestHour(hourlyObjects(m.data),when)}));
  const temps=rows.map(x=>+x.h?.temperature_2m),rain=rows.map(x=>+x.h?.precipitation),gust=rows.map(x=>+x.h?.wind_gusts_10m); const spread=std(temps)+std(rain)*2+std(gust)/10; const conf=Math.round(clamp(100-spread*8,25,98));
  $('#confidenceBadge').textContent=`Confianza ${conf}%`;
  $('#modelCards').innerHTML=rows.map(x=>`<div class="modelCard"><div class="modelName">${x.name}</div><div class="metricGrid"><div><b>${fmt(x.h?.temperature_2m)}°</b><div class="muted smallText">temperatura</div></div><div><b>${fmt(x.h?.precipitation,1)} mm</b><div class="muted smallText">lluvia/h</div></div><div><b>${fmt(x.h?.wind_gusts_10m)} km/h</b><div class="muted smallText">rachas</div></div><div><b>${weatherLabel(+x.h?.weather_code||0)}</b><div class="muted smallText">+12 h</div></div></div></div>`).join('');
  const hours=[0,6,12,18,24,36,48].map(h=>new Date(Date.now()+h*3600e3));
  $('#modelChart').innerHTML=`<h2>Dispersión de precipitación</h2><div style="overflow:auto"><table><thead><tr><th>Modelo</th>${hours.map(h=>`<th>+${Math.round((h-Date.now())/3600e3)}h</th>`).join('')}</tr></thead><tbody>${state.models.map(m=>{const hs=hourlyObjects(m.data);return `<tr><td>${m.name}</td>${hours.map(t=>`<td>${fmt(nearestHour(hs,t)?.precipitation,1)}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`;
}

function ensureMaps(){
  if(!window.L)return;
  if(!state.radar.map){state.radar.map=L.map('radarMap',{zoomControl:true}).setView([43.2,-4.1],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(state.radar.map)}
  if(!state.route.map){state.route.map=L.map('routeMap',{zoomControl:true}).setView([43.2,-4.1],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(state.route.map)}
}
function updateMaps(){ensureMaps();if(state.location&&state.radar.map)state.radar.map.setView([state.location.lat,state.location.lon],9)}

async function loadRadar(){
  ensureMaps(); try{const m=await fetchJSON('https://api.rainviewer.com/public/weather-maps.json');state.radar.meta=m;state.radar.frames=m.radar?.past||[];const s=$('#radarSlider');s.max=Math.max(0,state.radar.frames.length-1);s.value=s.max;renderRadarFrame(+s.value)}catch(e){$('#radarTime').textContent='Radar no disponible'}
}
function renderRadarFrame(i){
  const r=state.radar, f=r.frames[i]; if(!f||!r.map)return; if(r.layer)r.map.removeLayer(r.layer); r.layer=L.tileLayer(`${r.meta.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,{opacity:.68,maxNativeZoom:7,maxZoom:12,attribution:'Radar © RainViewer'}).addTo(r.map); if(state.route.map){if(state.route.radarLayer)state.route.radarLayer.remove();state.route.radarLayer=L.tileLayer(`${r.meta.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,{opacity:.42,maxNativeZoom:7,maxZoom:12}).addTo(state.route.map)} $('#radarTime').textContent=new Date(f.time*1000).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
}
function toggleRadar(){if(state.radar.timer){clearInterval(state.radar.timer);state.radar.timer=null;$('#radarPlay').textContent='▶︎ Animar';return} $('#radarPlay').textContent='Ⅱ Parar';state.radar.timer=setInterval(()=>{const s=$('#radarSlider');s.value=(+s.value+1)%(+s.max+1);renderRadarFrame(+s.value)},700)}

function parseAemetCoord(v){
  if(typeof v==='number')return v; const s=String(v||'').trim().toUpperCase();
  if(/^[-+]?\d+(\.\d+)?$/.test(s))return +s;
  const hemi=s.slice(-1),digits=s.slice(0,-1).replace(/\D/g,''); if(digits.length<4)return NaN;
  let deg,min,sec;if(hemi==='N'||hemi==='S'){deg=+digits.slice(0,2);min=+digits.slice(2,4);sec=+(digits.slice(4)||0)}else{deg=+digits.slice(0,3);min=+digits.slice(3,5);sec=+(digits.slice(5)||0)}
  let x=deg+min/60+sec/3600;if(hemi==='S'||hemi==='W')x=-x;return x;
}
async function loadAemetObservation(){
  const key=localStorage.getItem('trailmeteo.aemetKey'); if(!key||!state.location)return null;
  try{
    $('#aemetStatus').textContent='consultando AEMET…';
    const meta=await fetchJSON(`https://opendata.aemet.es/opendata/api/observacion/convencional/todas?api_key=${encodeURIComponent(key)}`);
    if(!meta.datos)throw new Error(meta.descripcion||'sin URL de datos'); const obs=await fetchJSON(meta.datos);
    let best=null,bd=Infinity;for(const o of obs){const lat=parseAemetCoord(o.lat),lon=parseAemetCoord(o.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;const d=distKm({lat:state.location.lat,lon:state.location.lon},{lat,lon});if(d<bd){bd=d;best={...o,_d:d,_lat:lat,_lon:lon}}}
    if(best){$('#aemetStatus').textContent=`${best.ubi||best.idema} · ${best._d.toFixed(1)} km · ${Number.isFinite(+best.ta)?best.ta+'°C':'observación'}`;return best}throw new Error('sin estación próxima');
  }catch(e){$('#aemetStatus').textContent=`no disponible: ${e.message}`;return null}
}
async function loadMeteoblue(){
  const key=localStorage.getItem('trailmeteo.meteoblueKey');if(!key||!state.location)return null;
  try{
    $('#meteoblueStatus').textContent='consultando meteoblue…';const {lat,lon}=state.location;
    const u=`https://my.meteoblue.com/packages/basic-1h?lat=${lat}&lon=${lon}&apikey=${encodeURIComponent(key)}&format=json`;
    const d=await fetchJSON(u),h=d.data_1h||d.data1h||{};const temp=(h.temperature||h.temperature_mean||[])[0],rain=(h.precipitation_amount||h.precipitation||[])[0],wind=(h.windspeed||h.wind_speed||[])[0];
    $('#meteoblueStatus').textContent=`activo${Number.isFinite(+temp)?` · ${temp}°C`:''}`;return {name:'meteoblue mLM',temp,rain,wind,raw:d};
  }catch(e){$('#meteoblueStatus').textContent=`no disponible: ${e.message}`;return null}
}
async function refreshSupplementary(){
  const [a,m]=await Promise.all([loadAemetObservation(),loadMeteoblue()]);
  const box=$('#modelCards');if(!box)return;let extra='';
  if(a)extra+=`<div class="modelCard"><div class="modelName">AEMET · observación</div><div class="muted smallText">${escapeHtml(a.ubi||a.idema||'Estación')} · ${fmt(a._d,1)} km</div><div class="metricGrid"><div><b>${fmt(a.ta,1)}°</b><div class="muted smallText">temperatura real</div></div><div><b>${fmt(a.prec,1)} mm</b><div class="muted smallText">precipitación</div></div><div><b>${fmt(a.vv,1)} km/h</b><div class="muted smallText">viento</div></div><div><b>${fmt(a.vmax,1)}</b><div class="muted smallText">viento máx.</div></div></div></div>`;
  if(m)extra+=`<div class="modelCard"><div class="modelName">meteoblue · mLM</div><div class="muted smallText">consenso location-specific</div><div class="metricGrid"><div><b>${fmt(m.temp,1)}°</b><div class="muted smallText">temperatura</div></div><div><b>${fmt(m.rain,1)} mm</b><div class="muted smallText">precipitación</div></div><div><b>${fmt(m.wind,1)}</b><div class="muted smallText">viento</div></div></div></div>`;
  if(extra){box.insertAdjacentHTML('beforeend',extra)}
}
async function enrichElevations(points){
  const missing=points.filter(p=>!Number.isFinite(p.ele));if(!missing.length)return points;
  try{const lat=points.map(p=>p.lat.toFixed(5)).join(','),lon=points.map(p=>p.lon.toFixed(5)).join(',');const d=await fetchJSON(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);const els=d.elevation||[];return points.map((p,i)=>({...p,ele:Number.isFinite(p.ele)?p.ele:+els[i]}))}catch{return points}
}
function parseGPX(text){
  const xml=new DOMParser().parseFromString(text,'application/xml'); if(xml.querySelector('parsererror'))throw new Error('GPX no válido');
  const name=xml.querySelector('trk>name, rte>name')?.textContent?.trim()||'Ruta GPX'; let nodes=[...xml.querySelectorAll('trkpt')];if(!nodes.length)nodes=[...xml.querySelectorAll('rtept')];
  return {name,points:nodes.map(n=>({lat:+n.getAttribute('lat'),lon:+n.getAttribute('lon'),ele:+n.querySelector('ele')?.textContent||NaN})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon))};
}
function routeStats(points){let km=0,up=0,down=0;for(let i=1;i<points.length;i++){km+=distKm(points[i-1],points[i]);const de=(points[i].ele-points[i-1].ele);if(Number.isFinite(de)){if(de>0)up+=de;else down-=de}}return{km,up,down}}
function sampleRoute(points,target=24){
  if(points.length<=target)return points.map((p,i)=>({...p,idx:i})); const stats=routeStats(points),step=stats.km/(target-1);const out=[{...points[0],idx:0}],cum=0,next=step;for(let i=1;i<points.length;i++){cum+=distKm(points[i-1],points[i]);if(cum>=next){out.push({...points[i],idx:i});next+=step}}if(out[out.length-1].idx!==points.length-1)out.push({...points.at(-1),idx:points.length-1});return out;
}
function buildEta(points,start,flatPace,climbPenalty){
  let mins=0,cumKm=0,cumUp=0;const arr=[{...points[0],eta:new Date(start),km:0,up:0}];for(let i=1;i<points.length;i++){const dk=distKm(points[i-1],points[i]);const de=Number.isFinite(points[i].ele)&&Number.isFinite(points[i-1].ele)?Math.max(0,points[i].ele-points[i-1].ele):0;cumKm+=dk;cumUp+=de;mins+=dk*flatPace+(de/100)*climbPenalty;arr.push({...points[i],eta:new Date(start.getTime()+mins*60000),km:cumKm,up:cumUp})}return{points:arr,durationMin:mins}}
async function analyzeRoute(){
  if(!state.route.sampled.length)return; $('#routeRiskTable').innerHTML='Analizando meteorología a lo largo de la ruta…';
  const start=new Date($('#startTime').value),pace=+$('#flatPace').value||6.5,pen=+$('#climbPenalty').value||8; const eta=buildEta(state.route.sampled,start,pace,pen);
  const lat=eta.points.map(p=>p.lat.toFixed(5)).join(','),lon=eta.points.map(p=>p.lon.toFixed(5)).join(',');
  const vars=['temperature_2m','apparent_temperature','precipitation','precipitation_probability','weather_code','visibility','wind_gusts_10m','cape','freezing_level_height'];
  try{
    const p=new URLSearchParams({latitude:lat,longitude:lon,hourly:vars.join(','),timezone:'auto',forecast_days:'7'});let data=await fetchJSON(`${OM}?${p}`);if(!Array.isArray(data))data=[data];
    const rows=eta.points.map((pt,i)=>{const h=nearestHour(hourlyObjects(data[i]),pt.eta)||{};return{...pt,...h,score:trailScore(h),risk:riskText(h)}}); state.route.analysis={rows,durationMin:eta.durationMin,start,pointData:data}; renderRouteAnalysis(); findDepartureWindows();
  }catch(e){$('#routeRiskTable').innerHTML=`<span class="riskHigh">Error analizando ruta: ${escapeHtml(e.message)}</span>`}
}
function renderRouteAnalysis(){
  const a=state.route.analysis;if(!a)return;const scores=a.rows.map(r=>r.score),worst=Math.min(...scores),avg=Math.round(mean(scores));
  $('#routeSummary').innerHTML+=`<div class="metric"><b>${Math.floor(a.durationMin/60)}h ${Math.round(a.durationMin%60)}m</b><span>tiempo estimado</span></div><div class="metric"><b>${avg}/100</b><span>score medio</span></div><div class="metric"><b>${worst}/100</b><span>peor sector</span></div>`;
  $('#routeRiskTable').innerHTML=`<h2>Riesgo por sectores</h2><div style="overflow:auto"><table><thead><tr><th>km</th><th>ETA</th><th>Alt.</th><th>Score</th><th>Lluvia</th><th>Rachas</th><th>Riesgo</th></tr></thead><tbody>${a.rows.map(r=>`<tr><td>${fmt(r.km,1)}</td><td>${r.eta.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</td><td>${Number.isFinite(r.ele)?Math.round(r.ele):'—'}</td><td class="${r.score<50?'riskHigh':r.score<70?'riskMed':'riskLow'}"><b>${r.score}</b></td><td>${fmt(r.precipitation,1)} mm</td><td>${fmt(r.wind_gusts_10m)}</td><td>${escapeHtml(r.risk)}</td></tr>`).join('')}</tbody></table></div>`;
  if(state.route.map){state.route.markers.forEach(m=>m.remove());state.route.riskLines.forEach(l=>l.remove());state.route.markers=[];state.route.riskLines=[];for(let i=1;i<a.rows.length;i++){const r=a.rows[i],prev=a.rows[i-1],col=r.score<50?'#fb7185':r.score<70?'#fbbf24':'#6ee7b7';const ln=L.polyline([[prev.lat,prev.lon],[r.lat,r.lon]],{weight:8,opacity:.9,color:col}).addTo(state.route.map);state.route.riskLines.push(ln)}for(const r of a.rows){if(r.score<70){const m=L.circleMarker([r.lat,r.lon],{radius:r.score<50?8:6,weight:2,fillOpacity:.85}).bindPopup(`<b>km ${fmt(r.km,1)} · ${r.score}/100</b><br>${escapeHtml(r.risk)}<br>${r.eta.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}`);m.addTo(state.route.map);state.route.markers.push(m)}}}
}
async function findDepartureWindows(){
  const base=state.route.analysis;if(!base?.pointData)return;
  const candidates=[];
  for(let shift=-4;shift<=8;shift++){
    const shiftedScores=[]; const shiftedRisks=[];
    base.rows.forEach((r,i)=>{
      const target=new Date(r.eta.getTime()+shift*3600e3);
      const h=nearestHour(hourlyObjects(base.pointData[i]),target)||{};
      shiftedScores.push(trailScore(h)); shiftedRisks.push(riskText(h));
    });
    candidates.push({shift,score:Math.round(mean(shiftedScores)),worst:Math.min(...shiftedScores),risks:[...new Set(shiftedRisks.filter(x=>x!=='sin riesgo destacado'))].slice(0,2)});
  }
  candidates.sort((a,b)=>(b.score+b.worst*.35)-(a.score+a.worst*.35));
  const top=candidates.slice(0,5);
  $('#routeWindows').innerHTML=`<h2>Mejores horas de salida</h2><p class="muted smallText">Comparación real usando el forecast de cada punto de la ruta a la hora estimada de paso.</p>${top.map((x,n)=>{const d=new Date(base.start.getTime()+x.shift*3600e3);return `<div class="window"><strong>${n===0?'★ ':''}${d.toLocaleString('es-ES',{weekday:'short',hour:'2-digit',minute:'2-digit'})} · ${x.score}/100</strong><div class="muted smallText">Peor sector ${x.worst}/100${x.risks.length?` · ${escapeHtml(x.risks.join(', '))}`:' · sin riesgo destacado'}</div></div>`}).join('')}`;
}
async function loadGPX(file){
  const parsed=parseGPX(await file.text());if(parsed.points.length<2)throw new Error('El GPX no contiene suficientes puntos');state.route.name=parsed.name;state.route.points=parsed.points;state.route.sampled=await enrichElevations(sampleRoute(parsed.points,24));const fullHasEle=parsed.points.filter(p=>Number.isFinite(p.ele)).length>parsed.points.length*.7;const st=routeStats(fullHasEle?parsed.points:state.route.sampled);
  $('#routeSummary').innerHTML=`<div class="metric"><b>${fmt(st.km,1)} km</b><span>distancia</span></div><div class="metric"><b>+${Math.round(st.up)} m</b><span>ascenso</span></div><div class="metric"><b>−${Math.round(st.down)} m</b><span>descenso</span></div><div class="metric"><b>${state.route.sampled.length}</b><span>puntos meteorológicos</span></div>`;
  ensureMaps();if(state.route.line)state.route.line.remove();state.route.line=L.polyline(parsed.points.map(p=>[p.lat,p.lon]),{weight:5,opacity:.85}).addTo(state.route.map);state.route.map.fitBounds(state.route.line.getBounds(),{padding:[20,20]});await analyzeRoute();
}

function setupUI(){
  $$('.tab').forEach(t=>t.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');$$('.tabPane').forEach(x=>x.classList.remove('active'));$(`#tab-${t.dataset.tab}`).classList.add('active');setTimeout(()=>{state.radar.map?.invalidateSize();state.route.map?.invalidateSize()},100)});
  $('#searchBtn').onclick=searchPlaces;$('#placeSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchPlaces()});
  $('#locateBtn').onclick=()=>navigator.geolocation?.getCurrentPosition(p=>setLocation({name:'Mi ubicación',lat:p.coords.latitude,lon:p.coords.longitude}),e=>alert(`No se pudo obtener ubicación: ${e.message}`),{enableHighAccuracy:true});
  $('#radarSlider').oninput=e=>renderRadarFrame(+e.target.value);$('#radarPlay').onclick=toggleRadar;$('#radarLatest').onclick=()=>{const s=$('#radarSlider');s.value=s.max;renderRadarFrame(+s.value)};
  $('#gpxInput').onchange=async e=>{try{await loadGPX(e.target.files[0])}catch(err){alert(err.message)}};
  ['startTime','flatPace','climbPenalty'].forEach(id=>$('#'+id).addEventListener('change',()=>state.route.sampled.length&&analyzeRoute()));
  const d=new Date(Date.now()+3600e3);d.setMinutes(0,0,0);$('#startTime').value=toLocalInput(d);
  $('#aemetKey').value=localStorage.getItem('trailmeteo.aemetKey')||'';$('#meteoblueKey').value=localStorage.getItem('trailmeteo.meteoblueKey')||'';$('#saveKeys').onclick=()=>{localStorage.setItem('trailmeteo.aemetKey',$('#aemetKey').value.trim());localStorage.setItem('trailmeteo.meteoblueKey',$('#meteoblueKey').value.trim());alert('Claves guardadas localmente en este dispositivo.');refreshSupplementary()};
  ensureMaps(); if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

setupUI();
setLocation({name:'Picos de Europa',lat:43.18,lon:-4.82,elevation:900});
