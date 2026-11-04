'use strict';
/* TrailMeteo 17 · Inicio con todo a la vista, barra inferior completa y secciones que abren arriba.
   - Al pulsar «Empezar» (sin enlace directo a una sección) aparece el menú de inicio: dos accesos destacados
     (Planificar una ruta y El tiempo) y el resto de secciones en tarjetas visuales.
   - En el móvil la barra inferior lleva TODAS las secciones y se desliza en horizontal; la activa se centra sola.
   - Al cambiar de sección la página se coloca arriba, no a media altura. */
(function(){
const I=p=>`<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const SECTIONS=[
 ['mapa','Mapa del tiempo','Senderos, esquí, 3D y previsión por horas','<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>','img/canal.jpg'],
 ['refugios','Refugios','Tiempo, temporada, precios y webcam','<path d="M3 20 12 5l9 15Z"/><path d="M9 20v-5h6v5"/>','img/andara-900.jpg'],
 ['nieve','Nieve y aludes','Cota, manto, satélite y boletín','<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/>','img/nieve.jpg'],
 ['webcams','Webcams','Cámaras en directo de Picos','<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',''],
 ['foros','Foros y noticias','Boletines, foros de meteo y prensa local','<path d="M4 5h12v9H8l-4 4Z"/><path d="M16 9h4v9l-3-3h-6v-1"/>',''],
 ['radar','Radar','Lluvia observada ahora','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 6"/>',''],
 ['models','Modelos','Compara ECMWF, ICON, GFS…','<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',''],
 ['mountain','AEMET montaña','Boletín oficial y avisos','<path d="M2 20 9 7l4 7 3-4 6 10Z"/>',''],
 ['terrain','Terreno','Sol, sombra, pendientes y relieve','<path d="M2 20 9 7l4 7 3-4 6 10Z"/><path d="M6 20c2-3 4-3 6-1s4 2 6-1"/>',''],
 ['canales','Canales de Picos','Las canales de los tres macizos','<path d="M5 3c2 5 1 8 3 11s1 5 0 7M19 3c-2 5-1 8-3 11s-1 5 0 7"/>',''],
 ['road','Carretera','DGT, cadenas y tiempo en la ruta','<path d="M8 3 5 21M16 3l3 18M12 4v3M12 10v3M12 16v3"/>',''],
 ['fuel','¿Qué como?','Energía y comida para tu ruta','<path d="M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17 3c-2 2-2 6 0 8v10"/>',''],
 ['library','Mis rutas','Guardadas en el dispositivo o tu cuenta','<path d="M6 3h12v18l-6-4-6 4Z"/>',''],
 ['copilot','Copiloto IA','Pregunta qué hacer y cuándo salir','<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4Z"/>',''],
 ['guide','Instrucciones','Cómo se usa todo, paso a paso','<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>','']];
const DOCK=['route','now','mapa','refugios','nieve','webcams','foros','radar','terrain','models','mountain','canales','road','fuel','library','copilot'];

/* ---------- Menú de inicio ---------- */
function wxText(){const d=S.forecast,c=d?.current;if(!c)return'Previsión por horas, ficha del sitio y avisos';return`${esc(S.location?.name||'')}: ${Math.round(c.temperature_2m)}°${typeof weather==='function'?' · '+esc(weather(c.weather_code)?.[1]||''):''}`}
function launcherHTML(){return`<section class="ln" id="tmLauncher" aria-label="Menú de inicio"><header class="ln-head"><p class="eyebrow">TRAILMETEO</p><h1>¿Qué quieres hacer?</h1></header>
 <div class="ln-feat"><button type="button" class="ln-big ln-route" data-nav="route"><span class="ln-bg" style="background-image:url(img/canal.jpg)"></span><span class="ln-in">${I('<path d="M4 19c3-1 3-5 6-6s5 2 8-1 1-6 1-6"/><circle cx="4" cy="19" r="1.6"/><circle cx="19" cy="6" r="1.6"/>')}<b>Cargar una ruta</b><small>Importa tu GPX: hora de paso, tiempo en cada tramo y veredicto</small><em>Planificar →</em></span></button>
 <button type="button" class="ln-big ln-wx" data-nav="now"><span class="ln-bg" style="background-image:url(img/niebla.jpg)"></span><span class="ln-in">${I('<path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z"/>')}<b>El tiempo</b><small id="lnWx">${wxText()}</small><em>Ver la previsión →</em></span></button></div>
 <div class="ln-grid">${SECTIONS.map(([k,t,d,ic,img])=>`<button type="button" class="ln-tile${img?' has-img':''}" data-nav="${k}">${img?`<span class="ln-bg" style="background-image:url(${img})"></span>`:''}<span class="ln-ic">${I(ic)}</span><b>${t}</b><small>${d}</small></button>`).join('')}</div></section>`}
function mount(){const hm=$('#homeScreen .hm')||$('#homeScreen');if(!hm||$('#tmLauncher'))return;hm.insertAdjacentHTML('afterbegin',launcherHTML())}
function refreshWx(){const el=$('#lnWx');if(el)el.innerHTML=wxText()}
const prevRender=typeof renderNow==='function'?renderNow:null;if(prevRender){renderNow=function(){prevRender.apply(this,arguments);refreshWx()}}

/* ---------- Barra inferior completa y deslizable ---------- */
function dock(){const nav=$('.tabs');if(!nav||nav.dataset.full)return;nav.dataset.full='1';const more=$('#dockMore'),have=new Set([...nav.querySelectorAll('[data-tab],[data-nav]')].map(b=>b.dataset.tab||b.dataset.nav));
 const label={refugios:'Refugios',webcams:'Webcams',foros:'Foros',radar:'Radar',models:'Modelos',mountain:'AEMET',canales:'Canales',road:'Carretera',fuel:'Comida',library:'Mis rutas',copilot:'Copiloto'};
 for(const k of DOCK){if(have.has(k))continue;const s=SECTIONS.find(x=>x[0]===k);if(!s)continue;more?.insertAdjacentHTML('beforebegin',`<button type="button" data-nav="${k}" class="dock-x">${I(s[3])}<span>${label[k]||s[1]}</span></button>`)}
 const order=DOCK.map(k=>nav.querySelector(`[data-tab="${k}"],[data-nav="${k}"]`)).filter(Boolean);for(const b of order)nav.insertBefore(b,more||null);nav.classList.add('tabs-scroll')}
function centerActive(){const nav=$('.tabs.tabs-scroll');if(!nav||nav.scrollWidth<=nav.clientWidth+4)return;const t=S.tab,sky=['now','radar','models','mountain','webcams'].includes(t)&&!nav.querySelector(`[data-nav="${t}"]`)?'now':t,b=nav.querySelector(`[data-tab="${sky}"],[data-nav="${sky}"]`);if(!b)return;nav.querySelectorAll('.dock-x').forEach(x=>x.classList.toggle('active',x===b));const l=b.offsetLeft-(nav.clientWidth-b.offsetWidth)/2;nav.scrollTo({left:Math.max(0,l),behavior:'smooth'})}

/* ---------- Cada sección se abre arriba ---------- */
/* Salto inmediato arriba (sin la animación suave, que se pelea con el cambio de altura de la página).
   Se repite tras pintar la sección, salvo que la persona ya haya empezado a desplazarse. */
let touched=false;for(const ev of ['wheel','touchstart','keydown'])addEventListener(ev,()=>{touched=true},{passive:true});
function toTop(){const h=document.documentElement,b=h.style.scrollBehavior;h.style.scrollBehavior='auto';window.scrollTo(0,0);h.style.scrollBehavior=b}
function settleTop(){touched=false;toTop();requestAnimationFrame(()=>{if(!touched)toTop()});setTimeout(()=>{if(!touched)toTop()},160)}
const prevShow=showTab;showTab=function(t){const before=S.tab,home=$('#homeScreen')&&!$('#homeScreen').hidden;prevShow.apply(this,arguments);if(t!==before||home)settleTop();requestAnimationFrame(centerActive)};

mount();dock();
globalThis.TMLauncher={open(){mount();if(typeof goHome==='function')goHome();refreshWx();settleTop()},mount,dock,sections:SECTIONS};
})();
