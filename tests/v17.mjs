// TrailMeteo 17: buscador de lugares de montaña, tiempo en el punto, webcams y utilidades del mapa híbrido.
import {Window} from 'happy-dom';import fs from 'node:fs';import assert from 'node:assert/strict';import {indexedDB} from 'fake-indexeddb';import xmldom from '@xmldom/xmldom';
const w=new Window({url:'http://localhost:8765/',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});w.DOMParser=xmldom.DOMParser;w.indexedDB=indexedDB;w.structuredClone=structuredClone;w.IntersectionObserver=class{observe(){}unobserve(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.document.write(fs.readFileSync('index.html','utf8'));w.eval(fs.readFileSync('core.js','utf8'));
const H=3600,start=Math.floor(Date.now()/3600000)*3600;const calls=[];
const LUG={fetched:'2026-11-04T00:00:00Z',places:[['Picu Urriellu',['Naranjo de Bulnes'],'pico',43.2403,-4.8158,2519,'n1'],['Casetón de Ándara',[],'refugio',43.2247,-4.7253,1725,'w2'],['Refugio Jou de Cabrones',['Refugio de Cabrones'],'refugio',43.2147,-4.8333,2050,'n3'],['Collado Jermoso',[],'collado',43.1717,-4.8933,2064,'n4'],['Torre de Cerredo',[],'pico',43.1983,-4.8517,2650,'n5'],['Cabrales',[],'pueblo',43.30,-4.84,null,'n6'],['Vega de Urriellu',[],'paraje',43.243,-4.822,1950,'n7']]};
function forecast(u){const past=+(u.searchParams.get('past_days')||0),n=(+(u.searchParams.get('forecast_days')||7)+past)*24,t0=start-past*24*H,time=Array.from({length:n},(_,i)=>t0+i*H),hourly={time};
 for(const k of (u.searchParams.get('hourly')||'').split(',').filter(Boolean))hourly[k]=time.map((t,i)=>{const fut=t>=start;switch(k){case'temperature_2m':return t<start+24*H?-3:2;case'apparent_temperature':return -8;case'relative_humidity_2m':return 98;case'precipitation':return fut&&t<start+30*H?1:0;case'snowfall':return t<start?.5:fut&&t>=start+24*H&&t<start+36*H?1:0;case'snow_depth':return .4;case'wind_gusts_10m':return t>=start+6*H&&t<start+9*H?70:30;case'wind_speed_10m':return 20;case'wind_direction_10m':return 315;case'freezing_level_height':return 1400;case'visibility':return 800;case'cloud_cover_low':return 90;case'cloud_cover':return 80;case'cape':return 50;case'weather_code':return 71;case'precipitation_probability':return 60;default:return 0}});
 const days=Array.from({length:n/24},(_,i)=>t0+i*24*H),daily={time:days,sunrise:days.map(d=>d+8*H),sunset:days.map(d=>d+18*H),temperature_2m_max:days.map(()=>3),temperature_2m_min:days.map(()=>-5),wind_gusts_10m_max:days.map(()=>70),precipitation_sum:days.map(()=>6),snowfall_sum:days.map(()=>9),sunshine_duration:days.map(()=>3600*4),wind_direction_10m_dominant:days.map(()=>315)};
 const lats=(u.searchParams.get('latitude')||'0').split(','),el=u.searchParams.get('elevation');const one=i=>({timezone:'Europe/Madrid',elevation:el&&el.split(',')[i]&&el.split(',')[i]!=='nan'?+el.split(',')[i]:1000,current:{temperature_2m:1,wind_speed_10m:20,wind_gusts_10m:40,weather_code:71},hourly:structuredClone(hourly),daily:structuredClone(daily)});return lats.length>1?lats.map((_,i)=>one(i)):one(0)}
const iso=h=>new Date(Date.now()-h*36e5).toISOString();
const FOROS={fetched:iso(.3),forums:[{id:'tiempo',name:'Foro de Tiempo.com',by:'Meteored',home:'https://foro.tiempo.com/'},{id:'nevasport',name:'Nevasport · Meteorología y nieve',by:'Nevasport',home:'https://www.nevasport.com/phorum/list.php?48'}],
 posts:[{forum:'tiempo',forumName:'Foro de Tiempo.com',thread:'Galicia, Asturias, Cantabria y País Vasco. Noviembre de 2026.',url:'https://foro.tiempo.com/index.php?topic=1.msg3#msg3',date:iso(1),excerpt:'Nieva en Pajares desde las 8, cota 1200.',img:'https://i.imgur.com/a.jpg'},
  {forum:'tiempo',forumName:'Foro de Tiempo.com',thread:'Galicia, Asturias, Cantabria y País Vasco. Noviembre de 2026.',url:'https://foro.tiempo.com/index.php?topic=1.msg2#msg2',date:iso(2),excerpt:'Día fresco en Oviedo.'},
  {forum:'tiempo',forumName:'Foro de Tiempo.com',thread:'Galicia, Asturias, Cantabria y País Vasco. Noviembre de 2026.',url:'https://foro.tiempo.com/index.php?topic=1.msg1#msg1',date:iso(3),excerpt:'Primera helada.'},
  {forum:'nevasport',forumName:'Nevasport · Meteorología y nieve',thread:'Ronda informativa [Temporada 2026-2027]',url:'https://www.nevasport.com/phorum/read.php?48,1,1',date:iso(5),excerpt:null,replies:11}],
 news:[{title:'Primera nevada en Picos de Europa',source:'El Comercio',domain:'elcomercio.es',url:'https://news.google.com/rss/articles/A',date:iso(2),tags:['montaña','nieve'],also:[{source:'La Nueva España',domain:'lne.es',url:'https://news.google.com/rss/articles/B'}]},
  {title:'Rescatan a dos montañeros en Valdeón',source:'ILEON',domain:'ileon.eu',url:'https://news.google.com/rss/articles/C',date:iso(30),tags:['montaña','rescates']},
  {title:'Corte de la LE-2703 por nieve',source:'Diario de Valderrueda',domain:'diariodevalderrueda.es',url:'https://news.google.com/rss/articles/D',date:iso(100),tags:['carreteras','nieve']}],errors:[]};
w.fetch=async(url,opts={})=>{const u=new URL(url,'http://localhost:8765');calls.push(u.href);let d;
 if(u.pathname.endsWith('data/lugares.json'))d=LUG;
 else if(u.pathname.endsWith('data/canales.json'))d={elements:[{type:'way',id:9,tags:{name:'Canal de la Jenduda'},geometry:[{lat:43.16,lon:-4.80},{lat:43.17,lon:-4.81}]}]};
 else if(u.pathname.endsWith('data/webcams.json'))d=JSON.parse(fs.readFileSync('data/webcams.json'));
 else if(u.pathname.endsWith('data/webcams-live.json'))d={fetched:new Date(Date.now()-600000).toISOString(),cams:{'refugio-urriellu':{status:'live',img:'https://cams.example/urriellu.jpg',modified:new Date(Date.now()-300000).toISOString()},'sotres':{status:'down',error:'x'},'valdeon':{status:'stream'},'lago-enol':{status:'link'}}};
 else if(u.pathname.endsWith('data/aludes.json'))d=JSON.parse(fs.readFileSync('data/aludes.json'));
 else if(u.pathname.endsWith('data/foros.json'))d=FOROS;
 else if(u.pathname.endsWith('data/mountain.json'))d={zones:[{code:'peu1',name:'Picos de Europa',url:'https://www.aemet.es/es/eltiempo/prediccion/montana?p=peu1',issued:new Date(Date.now()-3*36e5).toISOString(),fields:[{key:'nubosidad',title:'Estado del cielo',text:'Nuboso con nevadas débiles.'},{key:'cota',title:'Cota de nieve',text:'Cota de nieve 1400 m.'}]}]};
 else if(u.pathname.endsWith('data/alerts.json'))d={updated:new Date().toISOString(),alerts:[{event:'Aviso de nevadas de nivel amarillo',area:'Cordillera y Picos de Europa de Cantabria',headline:'Aviso de nevadas',expires:new Date(Date.now()+864e5).toISOString()},{event:'Aviso de lluvias de nivel naranja',area:'Litoral de Barcelona',headline:'x',expires:new Date(Date.now()+864e5).toISOString()}]};
 else if(u.pathname.endsWith('data/skitour.json'))d={routes:[],outings:[]};
 else if(u.pathname.endsWith('data/refugios.json'))d=JSON.parse(fs.readFileSync('data/refugios.json'));
 else if(u.pathname.endsWith('data/refugios-libres.json'))d={fetched:'2026-11-04T06:00:00Z',note:'x',sources:[],errors:[],zones:{picos:{name:'Picos de Europa',news:[]},palentina:{name:'Montaña Palentina',news:[{t:'Vandalizan y queman un refugio de la Montaña Palentina',u:'https://example.org/n',d:'2026-05-04',src:'Diario',tone:'aviso'}]}},huts:[{id:'w477688956',osm:'way/477688956',name:'Refugio de Vega Huerta',zone:'picos',lat:43.1919,lon:-4.9606,ele:2039,eleSrc:'osm',cap:4,fire:'no',note:'Mesa, dos bancos y una litera',check:'2024-09-04',edited:'2024-09-05',cond:null,news:[]},{id:'w1338100380',osm:'way/1338100380',name:'Chozo Bernabé (semi-derruido)',zone:'palentina',lat:42.976,lon:-4.6456,ele:1700,eleSrc:'mdt',cap:null,fire:null,note:null,check:null,edited:'2025-01-01',cond:'ruina',condWhy:'OpenStreetMap lo marca como derruido o en ruinas',news:[]},{id:'w889215635',osm:'way/889215635',name:'Chozo de Pineda',zone:'palentina',lat:42.9896,lon:-4.6466,ele:1620,eleSrc:'mdt',cap:null,fire:null,note:null,check:null,edited:null,cond:null,news:[{t:'Queman el chozo de Pineda',u:'https://example.org/p',d:new Date().toISOString().slice(0,10),src:'Diario',tone:'aviso'}]}]};
 else if(u.pathname.includes('data/'))return{ok:false,status:404,json:async()=>({}),text:async()=>''};
 else if(u.hostname==='photon.komoot.io')d={features:[{properties:{name:'Refugio de Áliva',osm_value:'alpine_hut',state:'Cantabria'},geometry:{coordinates:[-4.77,43.19]}}]};
 else if(u.hostname==='geocoding-api.open-meteo.com')d={results:[{name:'Sotres',latitude:43.231,longitude:-4.748,elevation:1045,admin1:'Asturias',country:'España'}]};
 else if(u.hostname==='nominatim.openstreetmap.org')d=[{name:'Pico Tesorero',lat:'43.19',lon:'-4.79',type:'peak',extratags:{ele:'2570'},display_name:'Pico Tesorero, Camaleño, Cantabria'}];
 else if(u.hostname==='api.open-meteo.com'||u.hostname==='ensemble-api.open-meteo.com')d=forecast(u);
 else d={};return{ok:true,status:200,json:async()=>d,text:async()=>JSON.stringify(d)}};
const scripts=['app.js','mountain.js','expedition-core.js','expedition.js','terrain.js','route-library.js','home.js','public-sources.js','route-knowledge.js','cares-archive.js','fx.js','firebase-config.js','ai.js','copilot-expert.js','parte.js','wikiloc.js','canales.js','gear.js','field-core.js','pois.js','relief.js','sky.js','week.js','pace.js','flyover.js','card.js','modelsx.js','snow.js','quality.js','nieve-pro.js','seguimiento.js','trails.js','account.js','contact.js','road.js','finder.js','results.js','palette.js','shell.js','fuel.js','meteogrid.js','radarfc.js','lugares.js','punto.js','webcams.js','mapa.js','refugios.js','foros.js','nieve-zonas.js','lanzador.js'];
w.eval(scripts.map(s=>fs.readFileSync(s,'utf8')).join('\n')+'\nglobalThis.T={enterApp,showTab,setLocation,forecastURL,get S(){return S}};');
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)],wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(200);
const P=w.TMPlaces,M=w.TMMap,PT=w.TMPoint,WC=w.TMWebcams,T=w.T;

/* ---------- Buscador: sitios concretos, variantes y tildes ---------- */
const idx=await P.loadIndex();
assert.ok(idx.length>=8,'nomenclátor + canales cargados');
const top=q=>P.rank(idx,q,3)[0]?.name;
assert.equal(top('pico urriellu'),'Picu Urriellu');
assert.equal(top('picu urriellu'),'Picu Urriellu');
assert.equal(top('naranjo de bulnes'),'Picu Urriellu','nombre alternativo');
assert.equal(top('uriellu'),'Picu Urriellu','tolera una errata');
assert.equal(top('caseton de andara'),'Casetón de Ándara','sin tildes');
assert.equal(top('Casetón de Ándara'),'Casetón de Ándara');
assert.match(top('refugio de cabrones'),/Jou de (los )?Cabrones/);
assert.match(top('cabrones'),/Jou de (los )?Cabrones/);
assert.match(top('collau jermoso'),/Collado Jermoso/,'asturiano');
assert.equal(top('jenduda'),'Canal de la Jenduda','canales de Picos');
assert.equal(P.rank(idx,'zzzz').length,0);
const J=x=>JSON.stringify(x);assert.equal(J(P.coords('43.24, -4.82')),J({lat:43.24,lon:-4.82}));assert.equal(J(P.coords('43,24 -4,82')),J({lat:43.24,lon:-4.82}));assert.equal(P.coords('Sotres'),null);
assert.equal(P.norm('Peña Santa de Castilla'),'pena santa de castilla');
const merged=P.merge([[{name:'Sotres',lat:43.231,lon:-4.748,kind:'pueblo'}],[{name:'Sotres',lat:43.2312,lon:-4.7482,kind:'pueblo',ele:1045}]]);assert.equal(merged.length,1);assert.equal(merged[0].ele,1045);

// Escribir en el buscador muestra resultados del nomenclátor y de Photon / Open-Meteo
const input=$('#placeSearch');assert.match(input.placeholder,/Pico, refugio/);
input.value='andara';input.dispatchEvent(new w.Event('input'));await wait(700);
assert.ok($$('#searchResults [data-pl]').length>=1,'resultados al escribir');assert.match($('#searchResults').textContent,/Casetón de Ándara/);assert.match($('#searchResults').textContent,/Refugio · 1\.?725 m/);

/* ---------- Tiempo en el punto: altitud real del lugar ---------- */
T.enterApp('now');await P.pick({name:'Picu Urriellu',lat:43.2403,lon:-4.8158,ele:2519,kind:'pico',src:'test'});await wait(300);
assert.equal(T.S.location.ele,2519);
const fu=new URL(T.forecastURL(T.S.location.lat,T.S.location.lon));assert.equal(fu.searchParams.get('elevation'),'2519','la previsión se pide a la altitud del pico');
assert.ok(calls.some(c=>c.includes('api.open-meteo.com/v1/forecast')&&c.includes('elevation=2519')&&c.includes('past_days=3')),'ficha del punto a 2519 m');
assert.match($('#placeMeta').textContent,/Pico · 2\.?519 m \(altitud del punto\)/);
assert.ok($('#placeName .pl-star'),'estrella de favoritos');
const pt=$('#ptCard');assert.ok(pt,'ficha del punto en Cielo');assert.match(pt.textContent,/TIEMPO EN EL PUNTO/);assert.match(pt.textContent,/Picu Urriellu/);
assert.equal($$('#ptCard .pt-tile').length,8);assert.equal($$('#ptCard .pt-day').length,3);
assert.match(pt.textContent,/Niebla en el puntoProbable/,'niebla probable con 98 % y 800 m de visibilidad');
assert.match(pt.textContent,/el punto está por encima: hiela/);
assert.match(pt.textContent,/nevará en el punto/);
assert.match(pt.textContent,/Rehiela de noche/);
assert.match(pt.textContent,/placas probables en laderas orientadas al SE/,'viento del NO carga el SE');
assert.match(pt.textContent,/Mejor ventana/);
// Favoritos y chips
pt.querySelector('[data-pt="fav"]').click();assert.ok(P.isFav(T.S.location));await wait(20);assert.match($('#plChips').textContent,/★ Picu Urriellu/);
pt.querySelector('[data-pt="fav"]').click();assert.ok(!P.isFav(T.S.location));
// Pueblos: no se fuerza altitud (Open-Meteo usa su MDT)
await P.pick({name:'Sotres',lat:43.231,lon:-4.748,kind:'pueblo',ele:1045});await wait(200);assert.equal(T.S.location.ele,undefined);assert.equal(new URL(T.forecastURL(T.S.location.lat,T.S.location.lon)).searchParams.get('elevation'),null);
// Buscar con Enter usa también Nominatim
input.value='tesorero';await P.full('tesorero');await wait(200);assert.ok(calls.some(c=>c.includes('nominatim.openstreetmap.org')),'Nominatim solo al pulsar Buscar');

/* ---------- snowBrief: casos ---------- */
const now=start*1000,row=(i,o={})=>({time:now+i*H*1000,temperature_2m:-4,snowfall:0,precipitation:0,freezing_level_height:1200,wind_gusts_10m:20,wind_direction_10m:0,snow_depth:0,...o});
const dry=Array.from({length:96},(_,i)=>row(i-24,{temperature_2m:8,freezing_level_height:3000}));
assert.match(PT.snowBrief(dry,1500,now).headline,/No se espera nieve/);
const rainy=Array.from({length:96},(_,i)=>row(i-24,{precipitation:2,freezing_level_height:2600,temperature_2m:5}));
assert.match(PT.snowBrief(rainy,1200,now).headline,/lluvia o aguanieve/);
const pack=Array.from({length:96},(_,i)=>row(i-24,{snow_depth:.6,temperature_2m:2}));const pb=PT.snowBrief(pack,2000,now);assert.match(pb.headline,/Manto modelado.*60 cm/);assert.equal(pb.refreeze.kind,'none');
const today=Array.from({length:96},(_,i)=>row(i-24,{snowfall:i>=25&&i<29?2:0}));const tb=PT.snowBrief(today,1800,now);assert.match(tb.headline,/^(Hoy|Mañana|[a-zé]+ \d+) nevará en el punto: \d+–\d+ cm/);assert.equal(tb.n24,8);
assert.equal(PT.fogAt({relative_humidity_2m:80,visibility:20000,cloud_cover_low:10})[0],'Poco probable');assert.equal(PT.stormAt({weather_code:96})[0],'Prevista');assert.equal(PT.stormAt({weather_code:3,cape:1200,precipitation_probability:50})[0],'Posible');

/* ---------- Webcams ---------- */
await WC.load();assert.ok(WC.cams.length>=15);assert.equal(WC.state(WC.cams.find(c=>c.id==='refugio-urriellu')),'live');assert.equal(WC.state(WC.cams.find(c=>c.id==='sotres')),'down');assert.equal(WC.state(WC.cams.find(c=>c.id==='valdeon')),'stream');
const nearU=WC.near(43.2028,-4.8212,6);assert.equal(nearU[0].id,'refugio-urriellu');assert.ok(!nearU.some(c=>c.id==='sotres'),'las caídas no se ofrecen cerca');
T.enterApp('webcams');await wait(300);
assert.ok(!$('#pane-webcams').hidden);assert.ok($('.tabs [data-tab="now"]').classList.contains('active'),'Cielo resaltado en Webcams');
assert.match($('#wcStatus').textContent,/emitiendo de/);
const cards=$$('#wcGrid .wc-card');assert.ok(cards.length>=14,'tarjetas (sin las caídas)');assert.ok(!cards.some(c=>c.dataset.wc==='sotres'));
assert.ok($('#wcGrid [data-wc="refugio-urriellu"] img[referrerpolicy="no-referrer"]'),'imagen desde la web de origen sin referer');
assert.match($('#wcGrid [data-wc="lago-enol"]').textContent,/solo se ve en su web/);
$('#wcGrid [data-wc="refugio-urriellu"] .wc-hit').click();await wait(50);assert.ok($('#wcStage'),'visor en la página, sin ventanas emergentes');assert.match($('#wcStage').textContent,/Refugio de Urriellu/);assert.ok($('#wcStage a[href*="webcamsdeasturias"]'));
$('#wcGrid [data-wc="valdeon"] .wc-hit').click();await wait(50);assert.ok($('#wcStage iframe[src*="youtube-nocookie.com/embed/sKZ8nWR6xu0"]'),'emisión de YouTube integrada');
$('#wcStage [data-wc-act="close"]').click();await wait(20);assert.ok(!$('#wcStage'));
$('#wcQ').value='enol';$('#wcQ').dispatchEvent(new w.Event('input'));await wait(20);assert.ok($$('#wcGrid .wc-card').every(c=>/enol/i.test(c.textContent)));
$('#wcZones [data-zone="__down"]').click();await wait(20);$('#wcQ').value='';$('#wcQ').dispatchEvent(new w.Event('input'));await wait(20);assert.ok($('#wcGrid [data-wc="sotres"]'),'se pueden ver las caídas');
assert.ok(calls.some(c=>c.includes('api.open-meteo.com')&&c.includes('current=temperature_2m')&&c.split('latitude=')[1].split('&')[0].split('%2C').length>=15),'tiempo actual de todas las cámaras en una sola consulta');

assert.ok(WC.cams.filter(c=>c.zone==='Montaña Palentina').length>=5,'webcams de la Montaña Palentina');
$('#wcZones [data-zone="Montaña Palentina"]').click();await wait(400);assert.match($('#wcCond').textContent,/Montaña Palentina/);assert.match($('#wcCond').textContent,/Curavacas/);assert.match($('#wcCond').textContent,/Piedrasluengas/);assert.ok(calls.some(c=>c.includes('elevation=2539')),'condiciones a la altitud de cada cumbre');
$('#wcZones [data-zone="all"]').click();await wait(50);
/* ---------- Mapa: utilidades puras ---------- */
const g=M.gridPoints({south:43.1,west:-5,north:43.3,east:-4.6},7);assert.ok(g.nx>=3&&g.ny>=3&&g.nx*g.ny<=49);assert.equal(g.pts.length,g.nx*g.ny);assert.equal(g.pts[0].lat,43.3);assert.equal(g.pts.at(-1).lon,-4.6);
assert.equal(M.bilinear([0,10,0,10],2,2,.5,.5),5);assert.equal(M.bilinear([0,10,20,30],2,2,0,1),20);
assert.equal(J(M.ramp([[0,'#000000'],[10,'#ffffff']],5).slice(0,3).map(Math.round)),'[128,128,128]');assert.equal(J(M.ramp([[0,'#000000'],[10,'#ffffff']],-5).slice(0,3)),'[0,0,0]');
assert.equal(M.snowState(1000,1600,0,2000),'none');assert.equal(M.snowState(1650,1600,0,2000),'edge');assert.equal(M.snowState(2400,1600,-1,2000),'cold');assert.equal(M.snowState(2000,1600,0,2000),'trans');assert.equal(M.snowState(2000,1600,5,2000),'wet');assert.equal(M.snowState(null,1600),'unknown');
const line=[[43.1,-4.8,1000],[43.11,-4.8,1500],[43.12,-4.8,2000]],rs=M.resample(line,5);assert.equal(rs.length,5);assert.equal(Math.round(rs[2].ele),1500);assert.ok(Math.abs(M.lineKm(line)-2.22)<.05);
assert.equal(J(Object.keys(M.VARS)),J(['temp','wind','gust','rain','snow','snow24','cloud','cota']));
// Pestaña, menú y Más
T.enterApp('mapa');await wait(100);assert.ok(!$('#pane-mapa').hidden);assert.ok($('#mpVars')&&$$('#mpVars [data-var]').length===8);assert.ok($('#mpTime')&&$('#mpSlider'));assert.ok($$('#mpOverlays [data-ov]').length===7);
assert.ok($('#mainNav [data-nav="mapa"]')&&$('#mainNav [data-nav="webcams"]'),'en el menú superior');assert.ok($('.tabs [data-tab="mapa"]'),'Mapa en la barra inferior');
$('#dockMore').click();await wait(20);assert.ok($('#moreSheet [data-more="mapa"]')&&$('#moreSheet [data-more="webcams"]')&&$('#moreSheet [data-more="canales"]'),'Más: mapa, webcams y canales');w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));
assert.ok($$('#pane-guide .g-sec').some(s=>/Mapa del tiempo con senderos/.test(s.textContent))&&$$('#pane-guide .g-sec').some(s=>/Buscar sitios concretos/.test(s.textContent)),'instrucciones nuevas');
assert.equal(w.eval('TM_VERSION'),'17');
/* ---------- Refugios ---------- */
const RF=w.TMRefugios;await RF.load();assert.equal(RF.list.length,10);
const ur=RF.list.find(r=>r.id==='urriellu');assert.equal(ur.ele,1960);assert.ok(ur.prices.pernocta[0]===15&&ur.prices.pernocta[1]===20);
assert.equal(RF.openStatus(ur,new Date(2026,10,4)).open,true);assert.match(RF.openStatus(ur,new Date(2026,11,10)).label,/cierra el 15 de diciembre/);assert.match(RF.openStatus(ur,new Date(2026,0,10)).label,/abre el 15 de marzo/);
const vb=RF.list.find(r=>r.id==='vegarredonda');assert.equal(RF.openStatus(vb,new Date(2026,11,20)).open,false);assert.match(RF.openStatus(vb,new Date(2026,11,20)).label,/abre el 1 de mayo/);
assert.ok(RF.palette({current:{cloud_cover:10,weather_code:0}},{altitude:-20}).night);assert.ok(RF.palette({current:{cloud_cover:95,weather_code:73}},{altitude:30}).snowing);
const fakeH={h0:1960,bands:[0,1,2].map(k=>Array.from({length:360},(_,a)=>(k+1)*2+Math.sin(a/20)*3)),tops:[0,1,2].map(()=>Array.from({length:360},(_,a)=>a%2?2600:1500)),dist:[0,1,2].map(()=>new Array(360).fill(3000))};
const svg=RF.panoSVG(fakeH,ur,{wx:{current:{cloud_cover:10,weather_code:0}},cota:2000,peaks:[{name:'Torre de Cerredo',ele:2648,az:200,ang:8}]});
assert.match(svg,/<svg class="rf-pano"/);assert.ok((svg.match(/<path /g)||[]).length>=6,'tres planos de relieve + nieve');assert.match(svg,/Torre de Cerredo/);assert.match(svg,/feGaussianBlur/);
T.enterApp('refugios');await wait(600);assert.ok(!$('#pane-refugios').hidden);assert.equal($$('#rfGrid .rf-card').length,10);assert.equal($$('#rfCmp tbody tr').length,10);
assert.ok($('#mainNav [data-nav="refugios"]'),'Refugios en el menú');
$('#rfMassif [data-massif="Oriental"]').click();await wait(50);assert.equal($$('#rfGrid .rf-card').length,1);assert.match($('#rfGrid').textContent,/Casetón de Ándara/);
$('#rfMassif [data-massif="all"]').click();await wait(50);
$('[data-rf-open="urriellu"]').click();await wait(700);const det=$('#rfd-urriellu');assert.ok(det&&!det.hidden);assert.match(det.textContent,/Tiempo en el refugio/);assert.match(det.textContent,/Comparación de modelos/);assert.match(det.textContent,/Pernocta/);assert.match(det.textContent,/Collado de Pandébano/);assert.match(det.textContent,/Webcam del refugio/);
assert.ok(calls.some(c=>c.includes('models=ecmwf_ifs025')&&c.includes('elevation=1960')),'modelos a la altitud del refugio');
assert.equal(RF.near(43.2028,-4.8212)?.id,'urriellu');assert.equal(RF.near(43.0,-4.0),null);assert.ok($('[data-rf-share="urriellu"]'),'compartir refugio');
assert.equal($$('#rfGrid .rf-card')[0].dataset.rf,'andara','Ándara el primero');assert.ok($('#rf-andara .rf-star'),'asterisco de grupos');assert.ok($('#rf-urriellu .rf-star-l'),'asterisco de refugio libre');
assert.doesNotMatch(RF.panoSVG(fakeH,RF.list.find(r=>r.id==='andara'),{wx:{current:{cloud_cover:10}}}),/rf-buddies/,'sin la ilustración antigua');
assert.ok($('#rf-andara.rf-card--photo .rf-photo[src*="img/andara"]'),'Ándara con su foto en la cabecera');assert.match($('#rf-andara').getAttribute('style')||'',/andara-blur/,'y la misma foto difuminada de fondo');
$('[data-rf-open="andara"]').click();await wait(700);assert.match($('#rfd-andara').textContent,/Alrededor del refugio/);assert.match($('#rfd-andara').textContent,/Morra de Lechugales/);assert.ok($('#rfd-andara #rf3d-andara [data-rf-hero="andara"]'),'vista 3D (sin WebGL, el horizonte plano de respaldo)');assert.doesNotMatch($('#rf-andara').textContent,/Foto:/,'sin crédito en la foto');
{const t=$('#rfd-andara').textContent;assert.match(t,/Consultar/,'Ándara: estado «Consultar»');assert.doesNotMatch(t,/pirate|Corrección|autora|sin confirmar|1 de mayo|15 de mayo/i,'sin avisos de web pirateada, sin «corrección» ni fecha de apertura');assert.match(t,/Federación Cántabra de Montaña/);assert.doesNotMatch(t,/casetondeandara/);
 assert.equal(RF.openStatus(RF.list.find(r=>r.id==='andara')).label,'Consultar');}$('[data-rf-open="andara"]').click();await wait(50);
/* Refugios libres: estado según OSM y prensa */
const ls=RF.libState;assert.equal(ls({cond:'ruina',news:[]}).label,'En ruinas');assert.equal(ls({cond:null,news:[{tone:'aviso',t:'Queman un refugio',d:new Date().toISOString().slice(0,10)}]}).label,'Aviso reciente');assert.equal(ls({cond:'bueno',news:[]}).k,'ok');assert.equal(ls({cond:null,news:[],check:'2010-01-01'}).label,'Sin noticias recientes');
$('#rfViews [data-view="libres"]').click();await wait(300);assert.ok(!$('#rfLibres').hidden&&$('#rfGuarded').hidden,'vista de refugios libres');assert.equal($$('#rfLGrid .rf-lcard').length,5,'zonas libres de Urriellu, Ario y Vegarredonda + Vega Huerta + Pineda (la ruina se oculta)');assert.match($('#rfLGrid').textContent,/Aviso reciente/);assert.match($('#rfLHead').textContent,/Vandalizan y queman/);
$('#rfLZone [data-lz="palentina"]').click();await wait(80);assert.equal($$('#rfLGrid .rf-lcard').length,1,'solo Montaña Palentina');$('#rfLRuin').click();await wait(80);assert.equal($$('#rfLGrid .rf-lcard').length,2,'mostrando ruinas');assert.ok($('#rfLGrid [href*="openstreetmap.org/note/new"]'),'avisar del estado en OSM');
assert.ok(calls.some(c=>c.includes('api.open-meteo.com')&&decodeURIComponent(c).includes('snow_depth')&&/elevation=[^&]*1620/.test(decodeURIComponent(c))),'tiempo de esta noche a la altitud de cada refugio libre');$('#rfLZone [data-lz="all"]').click();$('#rfLRuin').click();await wait(50);
$('#rfViews [data-view="guardados"]').click();await wait(100);assert.ok(!$('#rfGuarded').hidden);
T.enterApp('now');await P.pick({name:'Vega de Urriellu',lat:43.2027,lon:-4.8213,ele:1960,kind:'refugio'});await wait(300);assert.ok($('#ptCard [data-pt="refu"]'),'enlace a la ficha del refugio desde el punto');
assert.ok(calls.some(c=>c.includes('api.open-meteo.com')&&decodeURIComponent(c).includes('elevation=1630,1460')||decodeURIComponent(c).split('elevation=')[1]?.split('&')[0].split(',').length===10),'una sola consulta para los 10 refugios');
{/* Nieve por zonas, índice y acceso a noticias de nieve */const NZ=w.TMNieveZonas,now=Date.UTC(2026,10,4,12),hh=[];for(let i=-72;i<=96;i++)hh.push({time:now+i*36e5,snowfall:i>-20&&i<=0?1:i>10&&i<=40?.5:0,snow_depth:.32,freezing_level_height:1600});
 const st=NZ.zoneStats(hh,{time:[0,1,2,3,4,5,6,7].map(d=>(now/1000|0)+(d-1)*86400),snowfall_sum:[20,0,8,7,0,0,0,0]},now);
 assert.equal(Math.round(st.depth),32);assert.equal(st.fell24,20);assert.equal(st.next72,15);assert.equal(st.days.length,7);assert.ok(st.next>now&&st.next<=now+11*36e5);assert.ok(st.band&&st.band.mid<1600,'cota de nieve bajo la isoterma');
 T.enterApp('nieve');await wait(600);assert.ok($('#nzJump')&&$('#nzCard'),'índice y nieve por zonas');assert.equal($$('#nzCard .nz-row').length,10);assert.ok($('#nzJump [data-nz-jump="acc-npGramCard"]'));
 $('#nzJump [data-nz-jump="acc-npGramCard"]').click();await wait(30);assert.equal($('#acc-npGramCard').open,true,'el índice abre el bloque');
 $('#nzCard [data-nz-sort="geo"]').click();await wait(20);assert.match($('#nzCard .nz-row').textContent,/Macizo Occidental/);
 $('#nzCard [data-nz-go="ubi"]').click();await wait(400);assert.equal(T.S.location.name,'Ubiña','toda la sección pasa a la zona');assert.equal(T.S.location.ele,2000);
 $('#nzJump [data-nz-news]').click();await wait(400);assert.equal(T.S.tab,'foros');assert.ok($('#forosApp [data-fr-tag="nieve"].on'),'abre las noticias de nieve');w.TMForos.state.tag='all';}
{/* Foros, boletines y noticias */T.enterApp('foros');await wait(400);const app=$('#forosApp'),t=app.textContent;
 assert.match(t,/Foros, boletines y noticias/);assert.match(t,/Picos de Europa/);assert.match(t,/Cota de nieve 1400 m/,'predicción AEMET de montaña');assert.match(t,/1 aviso en la zona/,'solo los avisos de la Cordillera');assert.doesNotMatch(t,/Barcelona/);
 assert.equal($$('#forosApp .fr-th').length,2,'mensajes agrupados por hilo');assert.match($('#forosApp .fr-th').textContent,/3 mensajes nuevos/);assert.equal($$('#forosApp .fr-th')[0].querySelectorAll('.fr-post').length,2,'dos mensajes a la vista');
 $('#forosApp [data-fr-thread]').click();await wait(30);assert.equal($$('#forosApp .fr-th')[0].querySelectorAll('.fr-post').length,3,'y el resto al desplegar');
 assert.equal($$('#forosApp .fr-n').length,2,'últimos 3 días por defecto');for(const a of $$('#forosApp a[href]'))assert.match(a.getAttribute('href'),/^https:\/\//,'enlaces https al original');assert.ok($$('#forosApp a[target="_blank"]').length>6);
 assert.match($('#forosApp .fr-also').textContent,/La Nueva España/);
 $('#forosApp [data-fr-tag="rescates"]').click();await wait(30);assert.equal($$('#forosApp .fr-n').length,1);assert.match($('#forosApp .fr-n').textContent,/Valdeón/);
 $('#forosApp [data-fr-tag="all"]').click();const sel=$('#frDays');sel.value='7';sel.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(30);assert.equal($$('#forosApp .fr-n').length,3,'última semana');
 const q=$('#frQ');q.value='pajares';q.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(260);assert.equal($$('#forosApp .fr-th').length,1,'el buscador filtra foros');assert.equal($$('#forosApp .fr-n').length,0);
 {const q2=$('#frQ');q2.value='';q2.dispatchEvent(new w.Event('input',{bubbles:true}))}await wait(260);$('#forosApp [data-fr-view="news"]').click();await wait(30);assert.ok($('#forosApp .fr-body.v-news'));
 $('#forosApp [data-fr-forum="nevasport"]').click();await wait(30);assert.equal($$('#forosApp .fr-th').length,1);assert.match($('#forosApp .fr-th').textContent,/11 respuestas/);
 assert.ok($('#mainNav [data-nav="foros"]'),'en el menú');}
console.log('v17 checks passed: mountain place search (peaks, huts, cols, canals, Asturian variants, typos, coordinates), point weather at real altitude with fog/storm/snow brief/refreeze/wind loading/best window, favourites, webcams (status, inline viewer, YouTube, filters, weather per cam), map grid/ramp/bilinear/snow state/resample, menus, refuges (season, prices, real-horizon panorama, models, comparison table).');
await w.happyDOM.close();
