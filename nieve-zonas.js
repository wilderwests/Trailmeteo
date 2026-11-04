'use strict';
/* TrailMeteo 18 · Nieve más práctica, encima de lo que ya hay (snow.js + nieve-pro.js), sin cambiarlo:
   - Índice fijo arriba con accesos a cada bloque (abre el desplegable y baja hasta él).
   - «Nieve por zonas»: 10 zonas de la Cordillera a una cota de referencia, de un vistazo: nieve en el suelo, lo nevado en
     24 y 72 h, lo previsto en 72 h, barras de los próximos 7 días y cota de nieve. Ordenable; al tocar una zona, toda la
     sección (resumen, nivograma, historia…) pasa a esa zona.
   - Acceso directo a las noticias y foros de nieve.
   Datos: Open-Meteo (modelo, con su corrección por altitud). La cota de nieve es la misma estimación que usa la sección. */
(function(){
const ZONES=[
 {id:'occ',name:'Picos · Macizo Occidental',near:'Vegarredonda · Peña Santa',lat:43.215,lon:-4.975,ele:2000},
 {id:'cen',name:'Picos · Macizo Central',near:'Urriellu · Cabrones',lat:43.195,lon:-4.83,ele:2200},
 {id:'ori',name:'Picos · Macizo Oriental',near:'Ándara · Morra de Lechugales',lat:43.205,lon:-4.73,ele:2000},
 {id:'ali',name:'Áliva · Fuente Dé',near:'Liébana, cara sur',lat:43.163,lon:-4.79,ele:1800},
 {id:'ubi',name:'Ubiña',near:'Peña Ubiña · Meicín',lat:43.017,lon:-5.955,ele:2000},
 {id:'val',name:'Valgrande-Pajares',near:'Puerto de Pajares',lat:43.003,lon:-5.772,ele:1700},
 {id:'isi',name:'San Isidro · Mampodre',near:'Puerto de San Isidro',lat:43.06,lon:-5.37,ele:1800},
 {id:'pal',name:'Montaña Palentina',near:'Curavacas · Espigüete',lat:42.98,lon:-4.67,ele:2000},
 {id:'cam',name:'Alto Campoo · Peña Labra',near:'Tres Mares',lat:43.03,lon:-4.38,ele:1900},
 {id:'lei',name:'Leitariegos',near:'Puerto de Leitariegos',lat:42.995,lon:-6.415,ele:1700}];
const NZ={rows:null,at:0,loading:null,sort:'depth',err:false};
const H=3600000,D=86400000;
const sum=(h,a,b,k='snowfall')=>h.filter(r=>r.time>a&&r.time<=b&&finite(r[k])).reduce((s,r)=>s+r[k],0);
const cm=v=>finite(v)?(v<.5&&v>0?'<1':fmt(Math.round(v))):'—';
const DAYS=new Intl.DateTimeFormat('es-ES',{weekday:'narrow'});

/* Resumen de una zona a partir de las horas del modelo (puro: se prueba sin red). */
function zoneStats(h,daily,now=Date.now()){const cur=nearest(h,now)||{},past=h.filter(r=>r.time<=now),fut=h.filter(r=>r.time>now&&r.time<=now+72*H);
 const band=globalThis.TMSnow?.snowBand?.(cur.freezing_level_height),mins=fut.map(r=>globalThis.TMSnow?.snowBand?.(r.freezing_level_height)?.lo).filter(finite),
  next=h.find(r=>r.time>now&&r.snowfall>=.5),depth=finite(cur.snow_depth)?cur.snow_depth*100:null;
 const days=(daily?.time||[]).map((t,i)=>({t:t*1000,v:daily.snowfall_sum?.[i]})).filter(d=>d.t+D>now).slice(0,7);
 return{depth,fell24:sum(h,now-24*H,now),fell72:sum(h,now-72*H,now),next72:sum(h,now,now+72*H),band,minLine:mins.length?Math.min(...mins):null,next:next?.time||null,days,past:past.length}}

async function load(force=false){if(NZ.rows&&!force&&Date.now()-NZ.at<30*60000)return NZ.rows;if(NZ.loading)return NZ.loading;NZ.loading=(async()=>{
 try{const q={latitude:ZONES.map(z=>z.lat).join(','),longitude:ZONES.map(z=>z.lon).join(','),elevation:ZONES.map(z=>z.ele).join(','),hourly:'snowfall,snow_depth,freezing_level_height',daily:'snowfall_sum',past_days:'3',forecast_days:'7',timezone:'Europe/Madrid',timeformat:'unixtime'};
  const d=await json('https://api.open-meteo.com/v1/forecast?'+new URLSearchParams(q),force?0:1800000),list=Array.isArray(d)?d:[d];
  NZ.rows=ZONES.map((z,i)=>({...z,...zoneStats(hours(list[i]),list[i]?.daily)}));NZ.at=Date.now();NZ.err=false}catch{NZ.err=true;NZ.rows=NZ.rows||null}return NZ.rows})();try{return await NZ.loading}finally{NZ.loading=null}}

function bars(days){if(!days?.length)return'';const max=Math.max(5,...days.map(d=>d.v||0));return`<span class="nz-bars" aria-label="Nieve prevista por días">${days.map(d=>`<i style="--v:${Math.round((d.v||0)/max*100)}%" title="${esc(new Date(d.t).toLocaleDateString('es-ES',{weekday:'short',day:'numeric'}))}: ${cm(d.v)} cm"><b>${d.v>=1?Math.round(d.v):''}</b><em>${esc(DAYS.format(new Date(d.t)))}</em></i>`).join('')}</span>`}
function sorted(){const r=[...(NZ.rows||[])],k=NZ.sort;if(k==='next')r.sort((a,b)=>(b.next72||0)-(a.next72||0));else if(k==='geo')r.sort((a,b)=>ZONES.findIndex(z=>z.id===a.id)-ZONES.findIndex(z=>z.id===b.id));else r.sort((a,b)=>(b.depth||0)-(a.depth||0)||(b.next72||0)-(a.next72||0));return r}
function headline(rows){const snowy=rows.filter(r=>r.depth>=5),coming=rows.filter(r=>r.next72>=5).sort((a,b)=>b.next72-a.next72);
 if(!rows.length)return'';const a=snowy.length?`Hay nieve en el suelo en ${snowy.length} de ${rows.length} zonas (más en ${esc(snowy.sort((x,y)=>y.depth-x.depth)[0].name)}: ${cm(snowy[0].depth)} cm).`:'Sin nieve significativa en el suelo a estas cotas.';
 const b=coming.length?` En 72 h: hasta ${cm(coming[0].next72)} cm en ${esc(coming[0].name)}.`:' Sin nevadas importantes previstas en 72 h.';return a+b}
function render(){const el=$('#nzBody');if(!el)return;if(!NZ.rows){el.innerHTML=NZ.err?'<p class="muted">No se pudo consultar el modelo. Vuelve a intentarlo con «Actualizar».</p>':'<p class="muted"><span class="spinner"></span>Consultando la nieve en las zonas…</p>';return}
 const cur=S.location,here=z=>cur&&Math.abs(cur.lat-z.lat)<.02&&Math.abs(cur.lon-z.lon)<.02;
 el.innerHTML=`<p class="nz-head">${headline(NZ.rows)}</p>
 <div class="nz-sort" role="group" aria-label="Ordenar">${[['depth','Más nieve'],['next','Más nevada prevista'],['geo','Por zona']].map(([k,l])=>`<button type="button" class="fr-chip${NZ.sort===k?' on':''}" data-nz-sort="${k}" aria-pressed="${NZ.sort===k}">${l}</button>`).join('')}</div>
 <div class="nz-list${NZ.all?' all':''}">${sorted().map((z,i)=>`<article class="nz-row${here(z)?' here':''}${z.depth>=5?' snowy':''}${i>=5?' nz-extra':''}">
  <div class="nz-name"><b>${esc(z.name)}</b><small>${esc(z.near)} · a ${fmt(z.ele)} m</small></div>
  <div class="nz-depth"><strong>${cm(z.depth)}<small> cm</small></strong><span>en el suelo</span></div>
  <div class="nz-fig"><span><b>${z.fell24>=.5?'+'+cm(z.fell24):'0'}</b> cm 24 h</span><span><b>${z.fell72>=.5?'+'+cm(z.fell72):'0'}</b> cm 72 h</span></div>
  <div class="nz-fig nz-fut"><span><b>${z.next72>=.5?cm(z.next72):'0'}</b> cm en 72 h</span><span>${z.next?`nieva ${esc(new Date(z.next).toLocaleDateString('es-ES',{weekday:'short',day:'numeric'}))} ${esc(new Date(z.next).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}))}`:'sin nevadas a la vista'}</span></div>
  ${bars(z.days)}
  <div class="nz-line"><span>Cota de nieve</span><b>${z.band?fmt(z.band.mid)+' m':'—'}</b><small>${finite(z.minLine)?'mín. '+fmt(z.minLine)+' m en 72 h':''}</small></div>
  <button type="button" class="nz-go" data-nz-go="${z.id}" aria-label="Ver la nieve de ${esc(z.name)} en detalle">${here(z)?'Viendo':'Ver aquí'}</button></article>`).join('')}</div>
 <button type="button" class="nz-all" data-nz-all>${NZ.all?'Ver solo 5 zonas':`Ver las ${NZ.rows.length} zonas`}</button>
 <p class="footnote">Modelo Open-Meteo a la cota indicada (corrige por altitud). La cota de nieve es la estimación de la sección. En canales y umbrías puede haber nieve que el modelo no ve: mira el satélite, las webcams y lo que cuentan los foros.</p>`}

/* ---------- Índice y encaje en la sección ---------- */
const JUMPS=[['npSummary','Resumen'],['nzCard','Por zonas'],['npMapCard','Mapa'],['acc-avCard','Aludes'],['acc-snowCard','En tu ruta'],['acc-npGramCard','Nivograma'],['acc-npHistCard','Historia del manto'],['acc-npModelsCard','Modelos'],['acc-satCard','Satélite'],['acc-obsCard','Observaciones']];
function jumpTo(id){const el=document.getElementById(id);if(!el)return;if(el.tagName==='DETAILS'&&!el.open)el.open=true;const top=el.getBoundingClientRect().top+scrollY-(($('.topbar')?.offsetHeight||64)+($('#nzJump')?.offsetHeight||48)+8);window.scrollTo({top:Math.max(0,top),behavior:'smooth'})}
function mount(){const app=$('#nieveApp');if(!app||$('#nzCard'))return;
 const sum=$('#npSummary');const nav=`<nav class="nz-jump" id="nzJump" aria-label="Ir a">${JUMPS.map(([id,l])=>`<button type="button" data-nz-jump="${id}">${l}</button>`).join('')}<button type="button" class="nz-news" data-nz-news>Foros y noticias de nieve ↗</button></nav>`;
 const card=`<section class="card nz-card" id="nzCard"><header class="nz-top"><div><p class="eyebrow">Nieve por zonas ${'<span class="pv pv-mod">Modelo</span>'}</p><h2>¿Dónde hay nieve ahora?</h2></div><button type="button" class="fr-ref" data-nz-ref title="Actualizar">↻</button></header><div id="nzBody"></div></section>`;
 const hero=app.querySelector('.route-hero');(hero||app.firstChild)?.insertAdjacentHTML(hero?'afterend':'beforebegin',nav);(sum||$('#nzJump'))?.insertAdjacentHTML('afterend',card);
 app.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.nzJump){jumpTo(b.dataset.nzJump);return}
  if(b.dataset.nzSort){NZ.sort=b.dataset.nzSort;render();return}
  if(b.hasAttribute('data-nz-all')){NZ.all=!NZ.all;render();return}
  if(b.hasAttribute('data-nz-ref')){NZ.rows=null;render();load(true).then(render);return}
  if(b.hasAttribute('data-nz-news')){const F=globalThis.TMForos?.state;if(F){F.tag='nieve';F.view='all';F.q=''}enterApp('foros');return}
  if(b.dataset.nzGo){const z=ZONES.find(x=>x.id===b.dataset.nzGo);if(!z)return;b.textContent='Cargando…';Promise.resolve(setLocation({name:z.name,lat:z.lat,lon:z.lon,ele:z.ele,kind:'zona'})).finally(()=>{globalThis.TMSnow?.load?.();render();jumpTo('npSummary')})}})}
/* El índice se pega justo debajo de la cabecera de la app, que cambia de alto (menú de escritorio, se oculta al bajar). */
let raf=0;function pin(){raf=0;const tb=$('.topbar'),j=$('#nzJump');if(!tb||!j)return;j.style.setProperty('--nz-top',Math.max(0,Math.round(tb.getBoundingClientRect().bottom))+'px')}
addEventListener('scroll',()=>{if(S.tab==='nieve'&&!raf)raf=requestAnimationFrame(pin)},{passive:true});addEventListener('resize',()=>{if(S.tab==='nieve')pin()});
async function open(){mount();render();pin();await load();render()}
const prevShow=showTab;showTab=function(t){prevShow.apply(this,arguments);if(t==='nieve')open()};
mount();
globalThis.TMNieveZonas={ZONES,zoneStats,load,open,render,state:NZ,jumpTo};
})();
