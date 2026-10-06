'use strict';
/* Presentación: arranque, sonido sintetizado con sala, viento ambiente, partículas cinematográficas y fotografía de fondo con atribución. */
const FX={ctx:null,muted:false,themes:{},current:null,layer:0,photoSeq:0};
try{FX.muted=localStorage.getItem('tm.sound')==='off'}catch{}
const TAB_IDS=['route','now','terrain','canales','radar','models','mountain'];

/* ---------- Sonido: Web Audio, sin archivos ---------- */
function audio(){if(FX.muted)return null;const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return null;try{if(!FX.ctx)FX.ctx=new AC();if(FX.ctx.state==='suspended')FX.ctx.resume();return FX.ctx}catch{return null}}
/* Bus de salida: seco + sala (respuesta al impulso generada, cola de 2,4 s) + compresor suave. */
function out(ctx){if(FX.bus&&FX.bus.ctx===ctx)return FX.bus.in;try{const input=ctx.createGain(),comp=ctx.createDynamicsCompressor(),wet=ctx.createGain(),conv=ctx.createConvolver(),len=Math.floor(ctx.sampleRate*2.4),ir=ctx.createBuffer(2,len,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)*(i<ctx.sampleRate*.012?.4:1)}conv.buffer=ir;wet.gain.value=.28;comp.threshold.value=-18;comp.ratio.value=3;input.connect(comp);input.connect(conv).connect(wet).connect(comp);comp.connect(ctx.destination);FX.bus={ctx,in:input};return input}catch{return ctx.destination}}
function tone(ctx,{f=440,to=null,d=.12,type='sine',g=.06,at=0,attack=.006}){const t=ctx.currentTime+at,o=ctx.createOscillator(),v=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(g,t+attack);v.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(v).connect(out(ctx));o.start(t);o.stop(t+d+.05)}
function whoosh(ctx,{d=.35,g=.05,from=400,to=2400,at=0}){const t=ctx.currentTime+at,len=Math.ceil(ctx.sampleRate*d),buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=Math.random()*2-1;const src=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),v=ctx.createGain();src.buffer=buf;bp.type='bandpass';bp.Q.value=1.4;bp.frequency.setValueAtTime(from,t);bp.frequency.exponentialRampToValueAtTime(to,t+d);v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(g,t+d*.35);v.gain.exponentialRampToValueAtTime(.0001,t+d);src.connect(bp).connect(v).connect(out(ctx));src.start(t);src.stop(t+d)}
const SOUNDS={
 boot(c){tone(c,{f:55,to:40,d:.9,type:'sine',g:.22});whoosh(c,{d:.9,g:.07,from:200,to:5200});[261.6,329.6,392,523.3,659.3,784].forEach((f,i)=>tone(c,{f,d:.9-i*.06,type:i%2?'triangle':'sine',g:.05,at:.12+i*.085}));tone(c,{f:1568,d:1.2,type:'sine',g:.03,at:.7})},
 tap(c){tone(c,{f:2600,to:2100,d:.03,type:'sine',g:.022});tone(c,{f:5200,d:.05,type:'sine',g:.008,at:.004})},
 snow(c){[1318.5,1760,2349.3].forEach((f,i)=>tone(c,{f,d:.9,type:'sine',g:.018,at:i*.07}));whoosh(c,{d:1.1,g:.025,from:3000,to:800})},
 save(c){tone(c,{f:587.3,d:.14,type:'triangle',g:.05});tone(c,{f:880,d:.24,type:'triangle',g:.05,at:.08});tone(c,{f:1174.7,d:.4,type:'sine',g:.035,at:.16})},
 tab(c){whoosh(c,{d:.22,g:.035,from:900,to:3600});tone(c,{f:740,to:990,d:.09,type:'triangle',g:.04,at:.03})},
 ok(c){tone(c,{f:880,d:.18,type:'triangle',g:.06});tone(c,{f:1318.5,d:.32,type:'sine',g:.05,at:.09})},
 warn(c){tone(c,{f:330,to:220,d:.28,type:'square',g:.03})},
 open(c){tone(c,{f:420,to:880,d:.2,type:'sine',g:.05});whoosh(c,{d:.25,g:.03,from:600,to:3000})},
 close(c){tone(c,{f:760,to:380,d:.18,type:'sine',g:.04})},
 msg(c){tone(c,{f:1046.5,d:.35,type:'sine',g:.045});tone(c,{f:1568,d:.4,type:'sine',g:.025,at:.06})},
 scan(c){[0,.12,.24].forEach(at=>tone(c,{f:1200,to:1800,d:.07,type:'sine',g:.03,at}))}
};
/* Viento ambiente opcional: ruido rosa filtrado con ráfagas lentas (LFO), muy bajo. */
try{FX.wind=localStorage.getItem('tm.wind')==='on'}catch{}
function ambient(on){if(!on){if(FX.amb){const a=FX.amb;FX.amb=null;try{a.g.gain.setTargetAtTime(0,a.c.currentTime,.6);setTimeout(()=>{try{a.src.stop();a.lfo.stop()}catch{}},2500)}catch{}}return}if(FX.amb)return;const c=audio();if(!c)return;try{const len=c.sampleRate*4,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);let b0=0,b1=0,b2=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=.997*b0+w*.029;b1=.985*b1+w*.032;b2=.95*b2+w*.048;d[i]=(b0+b1+b2)*.35}const src=c.createBufferSource(),lp=c.createBiquadFilter(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();src.buffer=buf;src.loop=true;lp.type='lowpass';lp.frequency.value=520;lp.Q.value=.7;lfo.frequency.value=.07;lg.gain.value=340;lfo.connect(lg).connect(lp.frequency);g.gain.value=0;g.gain.setTargetAtTime(.05,c.currentTime,1.5);src.connect(lp).connect(g).connect(out(c));src.start();lfo.start();FX.amb={c,src,lfo,g}}catch{}}
function setWind(on){FX.wind=on;try{localStorage.setItem('tm.wind',on?'on':'off')}catch{}ambient(on&&!FX.muted)}
function sfx(name){const c=audio();if(!c||!SOUNDS[name])return;try{SOUNDS[name](c)}catch{}}
function buzz(p=12){try{if(!FX.muted&&navigator.vibrate)navigator.vibrate(p)}catch{}}
function setMuted(m){FX.muted=m;if(m)ambient(false);try{localStorage.setItem('tm.sound',m?'off':'on')}catch{}const t=$('#soundToggle');if(t){t.textContent=m?'🔇':'🔊';t.setAttribute('aria-pressed',String(!m));t.setAttribute('aria-label',m?'Activar sonidos':'Silenciar sonidos')}const s=$('#splashMute');if(s){s.textContent=m?'Sonido desactivado':'Sonido activado';s.setAttribute('aria-pressed',String(m))}if(!m){sfx('ok');if(FX.wind)ambient(true)}}
setMuted(FX.muted);
$('#soundToggle')?.addEventListener('click',e=>{e.stopPropagation();setMuted(!FX.muted)});
document.addEventListener('click',e=>{const b=e.target.closest('button,.dropzone,.file-button');if(!b||b.id==='soundToggle'||b.id==='splashMute'||b.id==='splashEnter')return;if(b.dataset.tab||b.dataset.go){sfx('tab');buzz(8)}else if(b.classList.contains('primary')){sfx('ok');buzz(14)}else sfx('tap')},true);

/* ---------- Fotografía de fondo: Wikimedia Commons, con autor y licencia ---------- */
const PHOTO_QUERIES={terrain:'Picos de Europa roca caliza',splash:'Picos de Europa',home:'Picos de Europa macizo',route:'Ruta del Cares',now:'Picos de Europa nubes',radar:'Picos de Europa niebla',mountain:'Naranjo de Bulnes',canales:'Garganta del Cares',models:'Lagos de Covadonga'};
const stripHTML=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
function photoCache(){try{return JSON.parse(localStorage.getItem('tm.photos.v1'))||{}}catch{return{}}}
function savePhotoCache(c){try{localStorage.setItem('tm.photos.v1',JSON.stringify(c))}catch{}}
async function commonsPhotos(query,limit=10){const key=query.toLowerCase(),cache=photoCache(),hit=cache[key];if(hit&&Date.now()-hit.at<7*86400000&&Array.isArray(hit.items))return hit.items;
 const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',origin:'*',generator:'search',gsrnamespace:'6',gsrsearch:query+' filetype:bitmap',gsrlimit:'24',prop:'imageinfo',iiprop:'url|size|mime|extmetadata',iiurlwidth:'1920'});
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{const r=await fetch(url,{signal:ctrl.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error();const d=await r.json();const pages=Object.values(d?.query?.pages||{});
  const items=pages.map(p=>{const i=p.imageinfo?.[0],m=i?.extmetadata||{};return i&&{title:String(p.title||'').replace(/^File:|^Archivo:/,''),url:i.thumburl||i.url,page:i.descriptionurl,w:i.width,h:i.height,mime:i.mime,artist:stripHTML(m.Artist?.value).slice(0,80),license:stripHTML(m.LicenseShortName?.value),licenseUrl:m.LicenseUrl?.value||''}}).filter(x=>x&&/^https:\/\/upload\.wikimedia\.org\//.test(x.url)&&/jpe?g/i.test(x.mime||'')&&x.w>=1400&&x.w>x.h*1.15&&x.license&&!/fair use|non-free/i.test(x.license)).slice(0,limit);
  cache[key]={at:Date.now(),items};const keys=Object.keys(cache);if(keys.length>40)delete cache[keys[0]];savePhotoCache(cache);return items}catch{return hit?.items||[]}finally{clearTimeout(timer)}}
function creditHTML(p){if(!p)return'';if(p.local)return `📷 ${esc(p.title)} · fotografía propia de TrailMeteo`;const lic=p.licenseUrl&&/^https?:\/\//.test(p.licenseUrl)?`<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener">${esc(p.license)}</a>`:esc(p.license);return `📷 <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.title.replace(/\.[a-z]+$/i,''))}</a> · ${esc(p.artist||'Autor en Commons')} · ${lic}`}
function preload(src){return new Promise((res,rej)=>{const img=new Image();img.referrerPolicy='no-referrer';img.onload=()=>res(src);img.onerror=rej;img.src=src;setTimeout(()=>rej(Error('timeout')),15000)})}
/* Fotografías propias (Picos de Europa), servidas con la app: funcionan sin conexión y no dependen de bancos de imágenes. */
const LOCAL_PHOTOS={canal:{local:true,url:'img/canal.jpg',title:'Mar de nubes desde una canal'},niebla:{local:true,url:'img/niebla.jpg',title:'Niebla en la cresta'},nieve:{local:true,url:'img/nieve.jpg',title:'Nieve recién caída'}};
const LOCAL_BY_THEME={splash:'canal',home:'canal',route:'canal',canales:'canal',now:'niebla',radar:'niebla',models:'niebla',mountain:'niebla',terrain:'nieve',road:'nieve'};
function localPhoto(theme){let k=LOCAL_BY_THEME[theme];if(theme==='now'&&typeof pxMode==='function'&&pxMode()==='snow')k='nieve';return k?LOCAL_PHOTOS[k]:null}
async function pickPhoto(theme){const own=localPhoto(theme);if(own)return own;const items=FX.themes[theme]||(FX.themes[theme]=await commonsPhotos(PHOTO_QUERIES[theme]||PHOTO_QUERIES.home));if(!items.length)return null;const day=Math.floor(Date.now()/86400000);return items[(day+(theme.length*7))%items.length]}
async function showBackdrop(theme){if(FX.current===theme)return;const prevUrl=FX.currentUrl;FX.current=theme;const seq=++FX.photoSeq;const p=await pickPhoto(theme);if(seq!==FX.photoSeq||!p)return;if(p.url===prevUrl){const credit=$('#photoCredit');if(credit)credit.innerHTML=creditHTML(p);const home=$('.home-photo');if(theme==='home'&&home){home.style.backgroundImage=`url("${p.url}")`;home.classList.add('on')}return}FX.currentUrl=p.url;try{await preload(p.url)}catch{return}if(seq!==FX.photoSeq)return;const layers=$$('.bd-img');if(layers.length<2)return;const next=layers[FX.layer^1];next.style.backgroundImage=`url("${p.url.replace(/"/g,'%22')}")`;next.classList.add('on');layers[FX.layer].classList.remove('on');FX.layer^=1;const credit=$('#photoCredit');if(credit)credit.innerHTML=creditHTML(p);const home=$('.home-photo');if(theme==='home'&&home){home.style.backgroundImage=next.style.backgroundImage;home.classList.add('on');home.title=stripHTML(creditHTML(p))}}
globalThis.TMPhotos={commonsPhotos,creditHTML,preload,showBackdrop};

/* ---------- Integración con la navegación existente ---------- */
const fxShowTab=showTab;
showTab=function(tab){fxShowTab(tab);document.body.dataset.tab=tab;showBackdrop(tab);if(!$('#splash'))window.scrollTo?.({top:0,behavior:'smooth'})};
const fxGoHome=goHome;
goHome=function(){fxGoHome();document.body.dataset.tab='home';showBackdrop('home')};
$$('[data-home]').forEach(b=>b.onclick=goHome);$('#homeButton')&&($('#homeButton').onclick=goHome);$('.brand')&&($('.brand').onclick=e=>{e.preventDefault();goHome()});
$('.home-art')?.insertAdjacentHTML('afterbegin','<div class="home-photo"></div>');

/* ---------- Pantalla de arranque ---------- */
(function splash(){const el=$('#splash');if(!el)return;const lines=['Calibrando sensores…','Leyendo modelos ECMWF · ICON · GFS…','Sincronizando radar…','Trazando curvas de nivel…','Listo para tu ruta'];let i=0;const status=$('#splashStatus');const timer=setInterval(()=>{if(status&&i<lines.length)status.textContent=lines[i++];else clearInterval(timer)},430);
 Promise.resolve([LOCAL_PHOTOS.canal]).then(async items=>{const p=items[0];if(!p||!$('#splash'))return;try{await preload(p.url);const ph=$('.splash-photo');if(ph){ph.style.backgroundImage=`url("${p.url.replace(/"/g,'%22')}")`;ph.classList.add('on')}}catch{}});
 let done=false;function enter(){if(done)return;done=true;clearInterval(timer);sfx('boot');buzz([10,40,18]);gust();if(FX.wind)ambient(true);el.classList.add('leaving');const want=location.hash.slice(1),tab=TAB_IDS.includes(want)?want:'route';setTimeout(()=>{el.remove();document.body.classList.add('booted');enterApp(tab);showBackdrop(tab)},reduce()?10:720)}
 const reduce=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 $('#splashEnter').addEventListener('click',enter);
 $('#splashMute').addEventListener('click',()=>setMuted(!FX.muted));
 document.addEventListener('keydown',function key(e){if(!$('#splash')){document.removeEventListener('keydown',key);return}if(e.key==='Enter'||e.key===' '){e.preventDefault();enter()}});
 setTimeout(()=>$('#splashEnter')?.focus?.({preventScroll:true}),2200);
})();

/* ---------- Temas: Día, Noche (rojo, conserva la visión nocturna) y Contraste (pleno sol) ---------- */
const THEMES={day:['Día','#f3f5f6'],night:['Noche','#000000'],contrast:['Sol','#ffffff']};
function applyTheme(t){if(!THEMES[t])t='day';if(t==='day')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t;try{localStorage.setItem('tm.theme',t)}catch{}const m=document.querySelector('meta[name=theme-color]');if(m)m.content=THEMES[t][1];$$('[data-theme-set]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeSet===t)))}
function currentTheme(){return document.documentElement.dataset.theme||'day'}
applyTheme((()=>{try{return localStorage.getItem('tm.theme')||'day'}catch{return'day'}})());

/* ---------- Hoja «Más» del menú inferior ---------- */
const MORE_ITEMS=[['radar','Radar','Precipitación observada ahora','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 6"/>'],['mountain','AEMET montaña','Boletín oficial y avisos','<path d="M2 20 9 7l4 7 3-4 6 10Z"/>'],['models','Modelos','12 modelos, conjuntos y meteograma','<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],['library','Mis rutas','En este dispositivo o en tu cuenta','<path d="M6 3h12v18l-6-4-6 4Z"/>'],['copilot','Copiloto IA','El parte en tres líneas','<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4Z"/>'],['home','Inicio','Portada','<path d="M3 11 12 4l9 7v9H3Z"/>'],['wind','Viento ambiente','Sonido de fondo suave · on/off','<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>']];
const MORE_ACTIONS={};
function addMore(item,fn,before='home'){if(MORE_ITEMS.some(x=>x[0]===item[0]))return;const i=MORE_ITEMS.findIndex(x=>x[0]===before);MORE_ITEMS.splice(i<0?MORE_ITEMS.length:i,0,item);if(fn)MORE_ACTIONS[item[0]]=fn}
function openMore(){if($('#moreSheet'))return;sfx('open');document.body.insertAdjacentHTML('beforeend',`<div class="more-sheet" id="moreSheet" role="dialog" aria-modal="true" aria-label="Más secciones"><div class="more-panel"><div class="more-grab"></div>${MORE_ITEMS.map(([k,t,d,i])=>`<button type="button" data-more="${k}"${k==='wind'?` aria-pressed="${!!FX.wind}"`:''}><svg viewBox="0 0 24 24" aria-hidden="true">${i}</svg><span>${t}<small>${d}</small></span></button>`).join('')}</div></div>`);const el=$('#moreSheet');el.onclick=e=>{if(e.target===el){closeMore();return}const t=e.target.closest('[data-theme-set]');if(t){applyTheme(t.dataset.themeSet);sfx('tap');return}const m=e.target.closest('[data-more]');if(!m)return;closeMore();const k=m.dataset.more;if(MORE_ACTIONS[k]){MORE_ACTIONS[k]();return}if(k==='wind'){setWind(!FX.wind);sfx('tap');return}if(k==='copilot')globalThis.Copilot?.open();else if(k==='home')goHome();else if(k==='library'){enterApp('route',true)}else showTab(k)}}
function closeMore(){$('#moreSheet')?.remove()}
$('#dockMore')?.addEventListener('click',e=>{e.stopPropagation();openMore()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMore()});
const fxShowTab2=showTab;showTab=function(tab){fxShowTab2(tab);const sky=['now','radar','models','mountain'].includes(tab);$('.tabs [data-tab="now"]')?.classList.toggle('active',sky);$('#dockMore')?.classList.toggle('lit',false)};

/* ---------- Efectos: aparición, contadores, onda y foco de luz ---------- */
const REDUCED=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const revealer=typeof IntersectionObserver==='function'&&!REDUCED()?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');revealer.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -40px 0px'}):null;
function markReveal(root=document){if(!revealer)return;root.querySelectorAll?.('.card:not(.rv):not(.radar-shell):not(.mapcard),.route-hero:not(.rv),.cn-hero:not(.rv),.field-hero:not(.rv)').forEach(el=>{el.classList.add('rv');revealer.observe(el)})}
function countUp(el){const txt=el.textContent.trim();if(el.dataset.counted===txt)return;const m=txt.match(/^([+−-]?)(\d{1,3}(?:\.\d{3})*|\d+)(,\d+)?(.*)$/s);el.dataset.counted=txt;if(!m||REDUCED())return;const dec=m[3]?m[3].length-1:0,target=Number(m[2].replace(/\./g,'')+(m[3]?'.'+m[3].slice(1):''));if(!(target>0)||target>99999)return;el.dataset.counting='1';const t0=performance.now(),dur=750,fmtN=v=>v.toLocaleString('es-ES',{minimumFractionDigits:dec,maximumFractionDigits:dec});const step=now=>{if(el.dataset.counted!==txt||!el.isConnected){delete el.dataset.counting;return}const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=m[1]+fmtN(target*e)+(m[4]||'');if(k<1)requestAnimationFrame(step);else{el.textContent=txt;delete el.dataset.counting}};requestAnimationFrame(step)}
function scanCounts(root=document){root.querySelectorAll?.('#routeStats strong,#daySummary strong,.cn-kpis strong,#current .temperature,.metrics strong').forEach(el=>{const t=el.textContent.trim();if(!el.dataset.counting&&el.dataset.counted!==t&&/^[+−-]?\d/.test(t))countUp(el)})}
if(typeof MutationObserver==='function'){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;markReveal();scanCounts()})}).observe(document.body,{childList:true,subtree:true})}
markReveal();
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button,.dropzone');if(!b||REDUCED())return;const r=b.getBoundingClientRect(),size=Math.max(r.width,r.height)*2.2,sp=document.createElement('span');sp.className='ripple';sp.style.cssText=`width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px`;b.append(sp);setTimeout(()=>sp.remove(),650)},{passive:true});
if(globalThis.matchMedia?.('(pointer:fine)').matches&&!REDUCED()){let raf=0;document.addEventListener('pointermove',e=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;document.documentElement.style.setProperty('--mx',e.clientX+'px');document.documentElement.style.setProperty('--my',e.clientY+'px')})},{passive:true})}
globalThis.TMTheme={apply:applyTheme,get current(){return currentTheme()},openMore,closeMore,addMore};

/* ---------- Partículas cinematográficas: nieve, lluvia o motas de luz según el tiempo del lugar ---------- */
const PX={cv:null,c:null,parts:[],mode:'snow',w:0,h:0,dpr:1,raf:0,last:0,wind:0,windTarget:.25,sprites:{},boost:0};
function pxMode(){const c=S.forecast?.current||{},code=c.weather_code,t=c.temperature_2m;if(currentTheme()==='night')return'motes';if(code>=71&&code<=86||((code>=51&&code<=67||code>=80)&&finite(t)&&t<=1))return'snow';if(code>=51&&code<=67||code>=80&&code<=82||code>=95)return'rain';if(code===45||code===48)return'fog';if(finite(t)&&t<=2)return'snow';return['canales','terrain'].includes(document.body.dataset.tab)?'snow':'motes'}
function pxSprite(r,blur){const k=r+'|'+blur;if(PX.sprites[k])return PX.sprites[k];const s=Math.ceil((r+blur)*2+2),cv=document.createElement('canvas');cv.width=cv.height=s;const c=cv.getContext('2d');if(!c)return null;const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(Math.max(.05,r/(r+blur))*.9,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,s,s);return PX.sprites[k]=cv}
function pxSpawn(p,top){const depth=Math.random(),mode=PX.mode;p.z=depth;p.x=Math.random()*PX.w;p.y=top?-20-Math.random()*PX.h*.2:Math.random()*PX.h;p.ph=Math.random()*6.28;
 if(mode==='rain'){p.r=.6+depth*.9;p.vy=520+depth*700;p.len=10+depth*22;p.a=.12+depth*.28}
 else if(mode==='motes'){p.r=1+depth*depth*7;p.vy=-(4+depth*10);p.a=.08+(1-Math.abs(depth-.6))*.32;p.blur=depth>.8?6:depth<.25?3:1}
 else if(mode==='fog'){p.r=60+depth*140;p.vy=0;p.a=.05+depth*.06;p.blur=40}
 else{p.r=.8+depth*depth*4.2;p.vy=18+depth*depth*80;p.a=.35+depth*.55;p.blur=depth>.86?5:depth<.2?1.5:.6}
 return p}
function pxCount(){const area=PX.w*PX.h/(1280*800);return Math.round({snow:170,rain:220,motes:70,fog:14}[PX.mode]*Math.min(1.6,Math.max(.45,area)))}
function pxResize(){if(!PX.cv)return;PX.dpr=Math.min(2,globalThis.devicePixelRatio||1);PX.w=innerWidth;PX.h=innerHeight;PX.cv.width=Math.round(PX.w*PX.dpr);PX.cv.height=Math.round(PX.h*PX.dpr);PX.c?.setTransform(PX.dpr,0,0,PX.dpr,0,0)}
function pxSetMode(m){if(m===PX.mode&&PX.parts.length)return;PX.mode=m;PX.parts=Array.from({length:pxCount()},()=>pxSpawn({},false));if(PX.cv)PX.cv.dataset.mode=m}
function pxFrame(now){PX.raf=requestAnimationFrame(pxFrame);const dt=Math.min(.05,(now-(PX.last||now))/1000);PX.last=now;const c=PX.c;if(!c)return;c.clearRect(0,0,PX.w,PX.h);
 PX.windTarget=.25+Math.sin(now/9000)*.6+Math.sin(now/3700)*.25;PX.wind+=(PX.windTarget-PX.wind)*dt*.6;const boost=PX.boost>0?(PX.boost-=dt,1+PX.boost*2):1,gust=(S.forecast?.current?.wind_gusts_10m||15)/30;
 for(const p of PX.parts){const k=.35+p.z*.9;
  if(PX.mode==='rain'){p.x+=(PX.wind*gust*120)*k*dt;p.y+=p.vy*dt*boost;c.strokeStyle=`rgba(90,110,120,${p.a})`;c.lineWidth=p.r;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-PX.wind*gust*p.len*.25,p.y-p.len);c.stroke()}
  else{p.ph+=dt*(.6+p.z);p.x+=(PX.wind*gust*(PX.mode==='fog'?14:40)+Math.sin(p.ph)*(PX.mode==='motes'?6:14))*k*dt*boost;p.y+=p.vy*dt*boost;const sp=pxSprite(Math.round(p.r*2)/2,p.blur);if(!sp)continue;const tw=PX.mode==='motes'?.6+.4*Math.sin(p.ph*1.7):1;c.globalAlpha=Math.min(1,p.a*tw);const s=sp.width;c.drawImage(sp,p.x-s/2,p.y-s/2,s,s);c.globalAlpha=1}
  const pad=PX.mode==='fog'?p.r+40:80;if(p.x>PX.w+pad)p.x=-pad+1;else if(p.x<-pad)p.x=PX.w+pad-1;
  if(PX.mode==='motes'){if(p.y<-30){pxSpawn(p,false);p.y=PX.h+20}}else if(p.y>PX.h+30)pxSpawn(p,true)}}
function pxStart(){if(PX.raf||REDUCED()||document.hidden||!PX.cv)return;PX.last=0;PX.raf=requestAnimationFrame(pxFrame)}
function pxStop(){if(PX.raf)cancelAnimationFrame(PX.raf);PX.raf=0}
function pxInit(){if(PX.cv||typeof document.createElement!=='function')return;const cv=document.createElement('canvas');cv.id='fxCanvas';cv.setAttribute('aria-hidden','true');const bd=$('#backdrop');bd?bd.after(cv):document.body.prepend(cv);const c=cv.getContext?.('2d');if(!c){cv.remove();return}PX.cv=cv;PX.c=c;if($('#splash'))cv.classList.add('top');pxResize();pxSetMode($('#splash')?'snow':pxMode());pxStart()}
addEventListener('resize',()=>{pxResize();PX.parts.length=Math.min(PX.parts.length,pxCount());while(PX.parts.length<pxCount())PX.parts.push(pxSpawn({},false))});
document.addEventListener('visibilitychange',()=>document.hidden?pxStop():pxStart());
pxInit();
const pxShowTab=showTab;showTab=function(tab){pxShowTab(tab);PX.cv?.classList.remove('top');pxSetMode(pxMode())};
const pxRenderNow=renderNow;renderNow=function(){pxRenderNow();pxSetMode(pxMode())};
/* Ráfaga visual + sonido de nieve al entrar desde la portada. */
function gust(){PX.boost=1.4;PX.wind=2.2}
globalThis.TMParticles={get mode(){return PX.mode},setMode:pxSetMode,gust,start:pxStart,stop:pxStop,pick:pxMode};
globalThis.TMSound={sfx,ambient,setWind,get wind(){return!!FX.wind},get muted(){return FX.muted}};
