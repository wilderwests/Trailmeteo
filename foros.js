'use strict';
/* TrailMeteo 18 · Foros, boletines y noticias de la Cordillera en un solo sitio.
   - Boletines oficiales arriba (AEMET montaña, peligro de aludes, avisos activos en la zona) con su enlace original.
   - Lo último de los foros (Tiempo.com/Meteored, Nevasport), agrupado por hilo, con extracto breve y foto si la hay.
   - Noticias de prensa local filtrables por tema, fecha y texto; la misma historia en varios medios va en una tarjeta.
   Datos: data/foros.json (lo genera scripts/update-foros.py cada hora), data/mountain.json, data/aludes.json y
   data/alerts.json. Todo enlaza al original: TrailMeteo solo muestra título, fecha y un extracto corto. */
(function(){
const FR={data:null,loading:null,view:'all',forum:'all',tag:'all',days:3,q:'',bul:null,openThreads:new Set()};
const ZONE=/asturian|asturias|cantabr|liébana|liebana|picos|león|leon|palencia|palentin|cordillera cant/i;
const TAGS=[['nieve','Nieve'],['aludes','Aludes'],['avisos','Avisos'],['previsión','Previsión'],['rescates','Rescates'],['carreteras','Carreteras'],['esquí','Esquí'],['refugios','Refugios'],['montaña','Montaña']];
const I=p=>`<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const IC={ext:I('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),forum:I('<path d="M4 5h12v9H8l-4 4Z"/><path d="M16 9h4v9l-3-3h-6v-1"/>'),news:I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>'),
 bul:I('<path d="M6 3h9l4 4v14H6Z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),snow:I('<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/>'),warn:I('<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/>'),mount:I('<path d="M2 20 9 7l4 7 3-4 6 10Z"/>'),road:I('<path d="M8 3 5 21M16 3l3 18M12 4v3M12 10v3M12 16v3"/>'),refresh:I('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>')};
const ago=iso=>{const t=Date.parse(iso);if(!finite(t))return'';const m=Math.round((Date.now()-t)/60000);return m<1?'ahora':m<60?`hace ${m} min`:m<1440?`hace ${Math.round(m/60)} h`:m<2880?'ayer':`hace ${Math.round(m/1440)} días`};
const DAYF=new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'});
function dayLabel(iso){const d=new Date(iso),t=new Date();const a=new Date(d.getFullYear(),d.getMonth(),d.getDate()),b=new Date(t.getFullYear(),t.getMonth(),t.getDate());const n=Math.round((b-a)/864e5);return n<=0?'Hoy':n===1?'Ayer':DAYF.format(d).replace(/^./,c=>c.toUpperCase())}
const safe=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:null}catch{return null}};
const link=(u,cls,inner,label='')=>{const s=safe(u);return s?`<a class="${cls}" href="${esc(s)}" target="_blank" rel="noopener noreferrer"${label?` aria-label="${esc(label)}"`:''}>${inner}</a>`:`<span class="${cls}">${inner}</span>`};
const initials=s=>{const w=String(s||'?').split(/[\s.\-]+/).filter(x=>x&&!/^(el|la|los|las|de|del|y|en|diario|digital)$/i.test(x));return((w[0]||s||'?')[0]+(w[1]?.[0]||'')).toUpperCase()};
const hue=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%360;return h};
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}

/* ---------- Datos ---------- */
async function load(force=false){if(FR.data&&!force)return FR.data;if(FR.loading)return FR.loading;FR.loading=(async()=>{
 const get=async(u,t)=>{try{return await json(u,force?0:t)}catch{return null}};
 const [f,m,a,al]=await Promise.all([get('data/foros.json',600000),get('data/mountain.json',900000),get('data/aludes.json',900000),get('data/alerts.json',600000)]);
 FR.data=f||{posts:[],news:[],forums:[],error:true};FR.bul={m,a,al};return FR.data})();try{return await FR.loading}finally{FR.loading=null}}

/* ---------- Boletines oficiales ---------- */
const LEVEL=['','Débil','Limitado','Notable','Fuerte','Muy fuerte'];
function bulletins(){const {m,a,al}=FR.bul||{},out=[];
 const mz=(m?.zones||[]).find(z=>z.code==='peu1');
 if(mz){const f=k=>(mz.fields||[]).find(x=>x.key===k||new RegExp(k,'i').test(x.title||'')),short={nubosidad:'Cielo',pcp:'Precipitación'},lines=[f('nubosidad'),f('pcp'),f('cota|isoterma')].filter(x=>x?.text).map(x=>`${short[x.key]||x.title}: ${x.text}`),txt=lines.join(' · ');
  out.push({k:'aemet',ic:IC.mount,eyebrow:'AEMET · Predicción de montaña',title:'Picos de Europa',meta:mz.issued?'Emitido '+ago(mz.issued):'',text:txt||'Predicción oficial para el macizo: cielo, precipitación, cota de nieve, viento y temperaturas en altura.',url:mz.url,internal:'mountain'})}
 else out.push({k:'aemet',ic:IC.mount,eyebrow:'AEMET · Predicción de montaña',title:'Picos de Europa',text:'Predicción oficial para el macizo, con cota de nieve, viento y temperaturas en altura.',url:'https://www.aemet.es/es/eltiempo/prediccion/montana?p=peu1',internal:'mountain'});
 for(const code of ['picos','cordel']){const z=(a?.zones||[]).find(x=>x.code===code);if(!z)continue;const on=z.status==='ok'||z.status==='on'||finite(z.level_max);const lv=finite(z.level_max)?z.level_max:null;
  out.push({k:'aludes',ic:IC.snow,eyebrow:'AEMET · Peligro de aludes',title:z.name,level:lv,meta:on&&z.issued?'Emitido '+ago(z.issued):z.issued?`Último boletín: ${new Date(z.issued).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}`:'',
   text:lv?`Nivel ${lv} · ${LEVEL[lv]}${(z.problems||[]).length?'. '+z.problems.slice(0,2).join(', '):''}.`:on?'Boletín publicado: consulta el nivel en el original.':'Fuera de temporada: AEMET publica el boletín de diciembre a mayo.',url:z.pdf&&on?z.pdf:z.page,internal:'nieve'})}
 const now=Date.now(),act=(al?.alerts||[]).filter(x=>ZONE.test((x.area||'')+' '+(x.headline||''))&&(!x.expires||Date.parse(x.expires)>now));
 const worst=act.some(x=>/rojo/i.test(x.event))?'rojo':act.some(x=>/naranja/i.test(x.event))?'naranja':act.length?'amarillo':null;
 out.push({k:'avisos',ic:IC.warn,eyebrow:'AEMET · Avisos (Meteoalerta)',title:act.length?`${act.length} aviso${act.length>1?'s':''} en la zona`:'Sin avisos en la Cordillera',warn:worst,
  text:act.length?[...new Set(act.map(x=>x.event.replace(/^Aviso de /,'').replace(/ de nivel/,'')))].slice(0,3).join(' · ')+' — '+[...new Set(act.map(x=>x.area))].slice(0,3).join(', '):'Asturias, Cantabria, León y Palencia sin avisos activos ahora mismo.',url:'https://www.aemet.es/es/eltiempo/prediccion/avisos',meta:al?.updated?'Actualizado '+ago(al.updated):''});
 return out}
function bulletinHTML(){const qs=[['DGT · Puertos y cadenas','https://infocar.dgt.es/etraffic/',IC.road],['Parque Nacional · Avisos','https://parquenacionalpicoseuropa.es/',IC.mount],['AEMET · Boletín de aludes','https://www.aemet.es/es/eltiempo/prediccion/montana/boletin_peligro_aludes',IC.snow]];
 return`<section class="fr-sec fr-bul" aria-labelledby="frBulH"><header class="fr-h"><h3 id="frBulH">${IC.bul}Boletines oficiales</h3></header><div class="fr-bulgrid">${bulletins().map(b=>`<article class="fr-bc fr-bc-${b.k}${b.level?' lv'+b.level:''}${b.warn?' w-'+b.warn:''}">
  <p class="fr-eb">${b.ic}${esc(b.eyebrow)}</p><h4>${esc(b.title)}${b.level?`<span class="fr-lv">${b.level}</span>`:''}</h4><p class="fr-bt">${esc(b.text)}</p>
  <div class="fr-bf"><small>${esc(b.meta||'')}</small><span>${b.internal?`<button type="button" class="fr-mini" data-fr-go="${b.internal}">En la app</button>`:''}${link(b.url,'fr-mini fr-out','Original '+IC.ext)}</span></div></article>`).join('')}</div>
  <nav class="fr-quick" aria-label="Más fuentes oficiales">${qs.map(([t,u,ic])=>link(u,'fr-q',ic+esc(t)+IC.ext)).join('')}</nav></section>`}

/* ---------- Foros ---------- */
function threads(){const d=FR.data||{},by=new Map();for(const p of d.posts||[]){if(FR.forum!=='all'&&p.forum!==FR.forum)continue;if(FR.q&&!norm(p.thread+' '+(p.excerpt||'')).includes(norm(FR.q)))continue;
  const k=p.forum+'|'+p.thread;if(!by.has(k))by.set(k,{forum:p.forum,forumName:p.forumName,thread:p.thread,board:p.board,posts:[],replies:p.replies});by.get(k).posts.push(p)}
 return[...by.values()].map(t=>(t.posts.sort((a,b)=>b.date.localeCompare(a.date)),t.last=t.posts[0].date,t)).sort((a,b)=>b.last.localeCompare(a.last))}
function forumHTML(){const d=FR.data||{},ts=threads(),forums=[...new Map((d.forums||[]).map(f=>[f.id,f])).values()];
 const chips=[['all','Todos'],...forums.map(f=>[f.id,f.by||f.name])].map(([k,l])=>`<button type="button" class="fr-chip${FR.forum===k?' on':''}" data-fr-forum="${k}" aria-pressed="${FR.forum===k}">${esc(l)}</button>`).join('');
 const card=t=>{const many=t.posts.length,open=FR.openThreads.has(t.thread),show=open?t.posts:t.posts.slice(0,2),img=t.posts.find(p=>p.img)?.img;
  return`<article class="fr-th fr-f-${esc(t.forum)}"><header><span class="fr-badge">${esc(t.forum==='tiempo'?'Tiempo.com':'Nevasport')}</span><small>${esc(ago(t.last))}${many>1?` · ${many} mensajes nuevos`:t.replies!=null?` · ${t.replies} respuestas`:''}</small></header>
   ${link(t.posts[0].url,'fr-tt',esc(t.thread)+IC.ext,'Abrir el hilo «'+t.thread+'» en el foro')}
   ${img?`<a class="fr-img" href="${esc(safe(t.posts.find(p=>p.img).url)||'#')}" target="_blank" rel="noopener noreferrer"><img src="${esc(safe(img)||'')}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>`:''}
   ${show.filter(p=>p.excerpt).map(p=>`<a class="fr-post" href="${esc(safe(p.url)||'#')}" target="_blank" rel="noopener noreferrer"><time>${esc(ago(p.date))}</time><span>${esc(p.excerpt)}</span></a>`).join('')}
   ${many>2&&t.posts.some(p=>p.excerpt)?`<button type="button" class="fr-more" data-fr-thread="${esc(t.thread)}">${open?'Ver menos':`Ver los ${many} mensajes`}</button>`:''}</article>`};
 return`<section class="fr-sec fr-for" aria-labelledby="frForH"><header class="fr-h"><h3 id="frForH">${IC.forum}En los foros</h3><div class="fr-chips" role="group" aria-label="Foro">${chips}</div></header>
  <div class="fr-ths">${ts.length?ts.map(card).join(''):`<p class="fr-empty">${d.error?'Todavía no hay copia de los foros: se actualiza cada hora.':'Nada reciente con este filtro.'}</p>`}</div>
  <p class="fr-src">${forums.map(f=>link(f.home,'',esc(f.name)+' '+IC.ext)).join(' · ')}</p></section>`}

/* ---------- Noticias ---------- */
function newsList(){const d=FR.data||{},lim=Date.now()-FR.days*864e5,q=norm(FR.q);return(d.news||[]).filter(n=>Date.parse(n.date)>=lim&&(FR.tag==='all'||(n.tags||[]).includes(FR.tag))&&(!q||norm(n.title+' '+n.source).includes(q)))}
function newsHTML(){const d=FR.data||{},lim=Date.now()-FR.days*864e5,base=(d.news||[]).filter(n=>Date.parse(n.date)>=lim),count=k=>base.filter(n=>(n.tags||[]).includes(k)).length,list=newsList();
 const chips=[['all','Todas',base.length],...TAGS.map(([k,l])=>[k,l,count(k)]).filter(x=>x[2]||x[0]===FR.tag)].map(([k,l,c])=>`<button type="button" class="fr-chip t-${esc(k)}${FR.tag===k?' on':''}" data-fr-tag="${esc(k)}" aria-pressed="${FR.tag===k}">${esc(l)}<b>${c}</b></button>`).join('');
 let last='';const rows=list.map((n,i)=>{const day=dayLabel(n.date),sep=day!==last?`<h4 class="fr-day">${esc(day)}</h4>`:'';last=day;
  return sep+`<article class="fr-n${i<2&&FR.tag==='all'&&!FR.q?' big':''}"><a class="fr-nl" href="${esc(safe(n.url)||'#')}" target="_blank" rel="noopener noreferrer"><span class="fr-av" style="--h:${hue(n.source)}">${esc(initials(n.source))}</span>
   <span class="fr-nb"><small><b>${esc(n.source)}</b> · ${esc(ago(n.date))}</small><strong>${esc(n.title)}</strong><span class="fr-tags">${(n.tags||[]).map(t=>`<i class="t-${esc(t)}">${esc((TAGS.find(x=>x[0]===t)||[t,t])[1])}</i>`).join('')}</span></span>${IC.ext}</a>
   ${(n.also||[]).length?`<p class="fr-also">También en ${n.also.map(a=>link(a.url,'',esc(a.source))).join(', ')}</p>`:''}</article>`}).join('');
 return`<section class="fr-sec fr-news" aria-labelledby="frNewsH"><header class="fr-h"><h3 id="frNewsH">${IC.news}Noticias</h3>
  <label class="fr-days"><span class="sr-only">Periodo</span><select id="frDays">${[[1,'Últimas 24 h'],[3,'Últimos 3 días'],[7,'Última semana'],[21,'Últimas 3 semanas']].map(([v,l])=>`<option value="${v}"${FR.days===v?' selected':''}>${l}</option>`).join('')}</select></label></header>
  <div class="fr-chips fr-tagchips" role="group" aria-label="Tema">${chips}</div>
  <div class="fr-nlist">${rows||`<p class="fr-empty">${d.error?'Todavía no hay copia de las noticias: se actualiza cada hora.':'No hay noticias con este filtro. Prueba otro tema o un periodo más largo.'}</p>`}</div>
  <p class="fr-src">Titulares de prensa vía Google News. Cada noticia abre en su medio.</p></section>`}

/* ---------- Pantalla ---------- */
function shell(){const d=FR.data||{};const views=[['all','Todo'],['foros','Foros'],['news','Noticias'],['bul','Boletines']];
 return`<header class="fr-top"><div><p class="eyebrow">PICOS DE EUROPA · CORDILLERA CANTÁBRICA</p><h2>Foros, boletines y noticias</h2><p class="fr-sub">Lo que cuentan hoy los foros de meteorología, los boletines oficiales y la prensa de la zona. Todo abre el original.</p></div>
  <div class="fr-tools"><label class="fr-search">${I('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>')}<input id="frQ" type="search" placeholder="Buscar: nieve, Pajares, rescate…" value="${esc(FR.q)}" aria-label="Buscar en foros y noticias"></label>
  <button type="button" class="fr-ref" id="frRef" title="Actualizar">${IC.refresh}<span>${d.fetched?esc(ago(d.fetched)):'—'}</span></button></div></header>
  <nav class="fr-views" role="tablist" aria-label="Qué ver">${views.map(([k,l])=>`<button type="button" role="tab" data-fr-view="${k}" aria-selected="${FR.view===k}" class="${FR.view===k?'on':''}">${l}</button>`).join('')}</nav>
  <div class="fr-body v-${FR.view}">${bulletinHTML()}<div class="fr-cols">${forumHTML()}${newsHTML()}</div></div>`}
function render(){const el=$('#forosApp');if(!el)return;const focus=document.activeElement?.id,pos=focus==='frQ'?document.activeElement.selectionStart:null;el.innerHTML=shell();if(focus==='frQ'){const q=$('#frQ');q.focus();try{q.setSelectionRange(pos,pos)}catch{}}}
let qt=0;
function wire(){const el=$('#forosApp');if(!el||el.dataset.wired)return;el.dataset.wired='1';
 el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.frView){FR.view=b.dataset.frView;render();return}
  if(b.dataset.frForum){FR.forum=b.dataset.frForum;render();return}
  if(b.dataset.frTag){FR.tag=b.dataset.frTag;if(FR.view==='foros'||FR.view==='bul')FR.view='news';render();return}
  if(b.dataset.frThread){const t=b.dataset.frThread;FR.openThreads.has(t)?FR.openThreads.delete(t):FR.openThreads.add(t);render();return}
  if(b.dataset.frGo){enterApp(b.dataset.frGo);return}
  if(b.id==='frRef'){b.classList.add('spin');load(true).then(render)}});
 el.addEventListener('input',e=>{if(e.target.id!=='frQ')return;clearTimeout(qt);qt=setTimeout(()=>{FR.q=e.target.value.trim();render()},180)});
 el.addEventListener('change',e=>{if(e.target.id==='frDays'){FR.days=+e.target.value;render()}})}
async function open(){wire();if(!FR.data){$('#forosApp').innerHTML='<p class="fr-empty">Cargando foros y noticias…</p>'}await load();render()}

const prevShow=showTab;showTab=function(t){prevShow.apply(this,arguments);if(t==='foros')open()};
globalThis.TMForos={load,open,render,state:FR,bulletins,threads,newsList};
})();
