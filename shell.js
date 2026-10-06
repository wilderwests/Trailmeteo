'use strict';
/* TrailMeteo 14 · estructura: menú completo, portada que explica la app, Planificar con el GPX primero,
   instrucciones de todo y sección Combustible. */
(function(){
const NAV=[
 ['Ruta',[['route','Planificar'],['library','Mis rutas'],['fuel','¿Qué como?'],['road','Carretera']]],
 ['Tiempo',[['now','Previsión'],['radar','Radar'],['models','Modelos'],['mountain','AEMET montaña']]],
 ['Montaña',[['terrain','Terreno'],['canales','Canales de Picos']]],
 ['Ayuda',[['copilot','Copiloto IA'],['guide','Instrucciones'],['account','Cuenta'],['contact','Buzón'],['home','Inicio']]]];
const ACT={
 library:()=>enterApp('route',true),
 copilot:()=>globalThis.Copilot?.open(),
 account:()=>globalThis.TMAccount?.open?.(),
 contact:()=>globalThis.TMContact?.open?.(),
 home:()=>goHome()};
function go(key){if(typeof closeSiteMenu==='function')closeSiteMenu();if(ACT[key])ACT[key]();else enterApp(key);markActive()}
function markActive(){const t=$('#homeScreen')&&!$('#homeScreen').hidden?'home':S.tab;$$('[data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav===t))}

/* ---------- Secciones nuevas ---------- */
$('#main')?.insertAdjacentHTML('beforeend',`<section id="pane-guide" class="pane guide" hidden></section><section id="pane-fuel" class="pane fuel" hidden></section>`);

/* ---------- Menú superior con todas las opciones (escritorio) ---------- */
const navHTML=NAV.map(([g,items])=>`<div class="mn-group"><span class="mn-label">${g}</span>${items.map(([k,l])=>`<button type="button" data-nav="${k}">${l}</button>`).join('')}</div>`).join('');
$('.topbar')?.insertAdjacentHTML('afterend',`<nav id="mainNav" class="mainnav" aria-label="Todas las secciones">${navHTML}</nav>`);
/* Menú ☰ (móvil y escritorio): las mismas opciones, agrupadas */
const sm=$('#siteMenu');if(sm)sm.innerHTML=NAV.map(([g,items])=>`<p class="sm-label">${g}</p>${items.map(([k,l])=>`<button type="button" data-nav="${k}">${l}</button>`).join('')}`).join('');
document.addEventListener('click',e=>{const b=e.target.closest('[data-nav]');if(!b)return;e.preventDefault();go(b.dataset.nav)});
const prevShow=showTab;showTab=function(t){prevShow.apply(this,arguments);markActive()};
const prevHome=goHome;goHome=function(){prevHome.apply(this,arguments);markActive()};

/* ---------- Portada: qué hace la app, sin relleno ---------- */
const home=$('#homeScreen');
if(home){home.innerHTML=`<div class="hm">
<header class="hm-head"><p class="hm-kicker">Qué hace TrailMeteo</p><h1>El tiempo de tu ruta, tramo a tramo.</h1><p class="hm-lead">Importa el GPX de tu salida. TrailMeteo calcula a qué hora pasarás por cada punto y qué tiempo hará allí, y te da un veredicto claro, la mejor hora para salir y lo que debes vigilar.</p>
<div class="hm-actions"><button class="primary" type="button" data-nav="route">Planificar una ruta</button><button class="quiet" type="button" data-nav="now">Ver el tiempo</button><button class="quiet" type="button" data-nav="guide">Instrucciones</button></div></header>
<ol class="hm-steps"><li><b>Importa tu ruta</b><span>El GPX de Wikiloc, de tu reloj o de una guía. Es lo más fiable.</span></li><li><b>Elige salida y ritmo</b><span>La hora de paso por cada tramo sale de la distancia y el desnivel.</span></li><li><b>Lee la decisión</b><span>GO, OJO o STOP, con los riesgos de cada tramo y las horas clave.</span></li><li><b>Prepárate y avisa</b><span>Mochila, agua, combustible y un plan de seguridad para compartir.</span></li></ol>
<section class="hm-what"><h2>Todo lo que incluye</h2><dl>
<div><dt>Tiempo por tramo</dt><dd>Temperatura, lluvia, viento, visibilidad e isoterma a tu hora de paso.</dd></div>
<div><dt>Cuándo salir</dt><dd>Mapa de la semana y comparación de horas de salida.</dd></div>
<div><dt>Fuentes oficiales</dt><dd>Boletín de montaña y avisos de AEMET, radar y doce modelos.</dd></div>
<div><dt>Terreno y canales</dt><dd>Sol y sombra, nieve, pendientes y las canales de Picos.</dd></div>
<div><dt>Carretera</dt><dd>Trayecto, avisos y cadenas de la DGT y tiempo en el camino.</dd></div>
<div><dt>¿Qué como?</dt><dd>Calorías, hidratos y sales de lo que llevas, con datos reales de cada producto.</dd></div>
<div><dt>Copiloto IA</dt><dd>Pregunta lo que quieras sobre tu salida; responde con los datos de la app.</dd></div>
<div><dt>Sin cobertura</dt><dd>Guarda el plan en el móvil y recalcula la llegada en marcha.</dd></div></dl></section>
<p class="hm-note">Gratis, sin cuenta y con datos abiertos (Open-Meteo, AEMET, DGT, OpenStreetMap, Open Food Facts). La información es orientativa: decide siempre con lo que veas en el terreno. Emergencias: 112.</p><footer class="hm-foot"><span>TrailMeteo 14</span><a href="#" data-open-contact>Buzón de sugerencias</a><a href="mailto:${esc(globalThis.TMContact?.email||'mariawilderwest@gmail.com')}">${esc(globalThis.TMContact?.email||'mariawilderwest@gmail.com')}</a></footer></div>`}

/* ---------- Planificar: primero el GPX, después la búsqueda ---------- */
(function reorder(){const hero=$('.route-hero'),head=$('.route-import-head'),drop=$('#dropzone'),foot=drop?.nextElementSibling,status=$('#routeStatus'),finder=$('#routeFinder'),road=$('.road-cta');if(!hero||!head||!drop||!finder)return;
 const sub=hero.querySelector('.route-hero-sub');if(sub)sub.textContent='Importa el GPX de tu ruta y TrailMeteo calculará cuándo pasarás por cada tramo y qué tiempo hará allí.';const eb=hero.querySelector('.eyebrow');if(eb)eb.textContent='Planificar';
 const h=head.querySelector('h2');if(h)h.textContent='1. Importa tu GPX';const he=head.querySelector('.eyebrow');if(he)he.textContent='Recomendado';
 const search=document.createElement('div');search.className='route-search-head';search.innerHTML=`<h2>¿No tienes el GPX? Búscala</h2><p class="route-advice"><b>Mejor con tu GPX.</b> Es el trazado exacto que vas a seguir (de Wikiloc, de tu reloj, de una guía o de alguien que la haya hecho). La búsqueda usa senderos de OpenStreetMap, que pueden estar incompletos o no coincidir con tu itinerario: revisa siempre el trazado en el mapa antes de fiarte del análisis.</p>`;
 hero.after(head);head.after(drop);let last=drop;if(foot?.classList.contains('footnote')){drop.after(foot);last=foot}if(status){last.after(status);last=status}last.after(search);search.after(finder);if(road)finder.after(road)})();

/* ---------- Instrucciones ---------- */
const G=[
['empezar','Para empezar',`<p>TrailMeteo cruza tu ruta con la previsión meteorológica: calcula a qué hora pasarás por cada tramo y consulta el tiempo previsto <em>en ese punto y a esa hora</em>. Con eso te da un veredicto y te ayuda a preparar la salida.</p><ol><li>Abre <b>Planificar</b> e importa el GPX de tu ruta.</li><li>Elige la hora de salida y tu ritmo, y pulsa <b>Analizar la ruta</b>.</li><li>Lee la sección <b>Decisión</b> y, si hace falta, cambia la hora de salida.</li><li>Antes de salir, revisa <b>Mochila y agua</b>, <b>Combustible</b> y comparte tu <b>plan de seguridad</b>.</li></ol>`],
['planificar','Planificar una ruta',`<h3>Importar GPX (recomendado)</h3><p>Toca la zona de importación o arrastra el archivo. Vale cualquier GPX con track o ruta: el que descargas de Wikiloc, el de tu reloj o el de una guía. El archivo se lee en tu dispositivo.</p><p><b>Desde Wikiloc:</b> abre la ruta, pulsa <i>Descargar → GPX</i> (necesita cuenta gratuita) e impórtalo. En Android también puedes usar <i>Compartir → TrailMeteo</i> si tienes la app instalada.</p><h3>Buscar una ruta</h3><p>Si no tienes el GPX, escribe el nombre (por ejemplo «Ruta del Cares» o «PR-PNPE 2»). Los resultados vienen de los senderos de OpenStreetMap y de las canales de Picos. Al tocar <b>Cargar y analizar</b> se carga el trazado y se analiza al momento. <b>Revisa siempre el trazado en el mapa</b>: los datos abiertos pueden estar incompletos.</p><h3>Salida y ritmo</h3><p><b>Salida</b> es la hora a la que empiezas a andar. <b>Ritmo en llano</b> son los minutos por kilómetro y <b>minutos por cada 100 m de ascenso</b> añade el tiempo de subida. Si tienes un GPX tuyo con tiempos, en <b>Tu ritmo real</b> la app calcula tu ritmo de verdad.</p>`],
['decision','Leer el análisis',`<p>Tras analizar, los resultados se ordenan en siete secciones a las que puedes saltar desde la barra fija:</p><dl class="g-dl"><dt>Decisión</dt><dd>Veredicto <b>GO</b> (ventana favorable), <b>OJO</b> (sal con precauciones) o <b>STOP</b> (replantea la salida); cifras clave, horario de referencia MIDE, agua recomendada, riesgos principales y horas clave: mejor salida, puesta de sol, <b>hora límite en la cota máxima</b> (si no has llegado a esa hora, date la vuelta) y hora para dar la alarma.</dd><dt>Cuándo salir</dt><dd>Mapa de la semana por días y horas y comparación de horas de salida con tu mismo ritmo.</dd><dt>Mapa y perfil</dt><dd>Recorrido coloreado por riesgo, perfil de altitud con la isoterma de 0 °C y la temperatura a cada hora de paso.</dd><dt>Tramo a tramo</dt><dd>Tabla con la hora de paso, la altitud, la temperatura, la lluvia, las rachas y la lectura de cada sector.</dd><dt>Riesgos y avisos</dt><dd>Avisos oficiales de AEMET que tocan tu ruta, incertidumbre entre modelos y tecnicidad por tramos.</dd><dt>Mochila y agua</dt><dd>Lista de material según la previsión y fuentes, refugios y puntos de agua cerca del recorrido.</dd><dt>En ruta y seguridad</dt><dd>Plan de seguridad para enviar a un contacto y seguimiento de tu posición para recalcular la llegada.</dd></dl><p class="g-note">El veredicto solo valora la meteorología en los puntos consultados. No certifica el estado del terreno, la nieve ni tu preparación.</p>`],
['combustible','¿Qué como?',`<p>Busca alimentos por nombre y marca (por ejemplo «pan Bimbo natural» o «membrillo Hacendado»). Los datos nutricionales vienen de <b>Open Food Facts</b>, una base de datos abierta con las etiquetas reales de cada producto. Añade la cantidad en gramos o en raciones y la app suma calorías, hidratos, azúcares, proteínas, grasas, fibra, sal y los micronutrientes disponibles.</p><p>Con una ruta analizada, compara lo que llevas con lo que necesitas según la duración y la intensidad: hidratos por hora, sodio y agua. Puedes cambiar tu peso y la intensidad para afinar el cálculo.</p>`],
['cielo','Cielo: previsión, radar, modelos y AEMET',`<p><b>Previsión</b>: el tiempo de ahora y por horas del lugar elegido, con ventanas de 3 horas y el parte del día. <b>Radar</b>: la lluvia observada en los últimos minutos. <b>Modelos</b>: compara ECMWF, ICON, GFS, Météo-France y más; si discrepan, hay más incertidumbre. <b>AEMET montaña</b>: el boletín oficial por macizos, con nieve, isoterma y viento en altura.</p><p>Para cambiar de lugar, usa el buscador de Previsión o el botón de ubicación.</p>`],
['terreno','Terreno y canales',`<p><b>Terreno</b> muestra sol y sombra a cualquier hora, pendientes, nieve y satélite para entender la ruta antes de ir. <b>Canales de Picos</b> es un catálogo de las canales de los tres macizos con ficha, perfil, accesos, sol y nieve; desde cada ficha puedes planificarla.</p>`],
['carretera','Carretera',`<p>Escribe de dónde sales y a dónde vas: TrailMeteo calcula el trayecto y muestra los avisos de la DGT en él (nieve, hielo, niveles de cadenas, cortes y obras), además del tiempo en la carretera a la hora en que pasarás. La etiqueta «DGT · hace X min» indica la antigüedad de los datos.</p>`],
['copiloto','Copiloto IA',`<p>Toca el botón ✦ y pregunta lo que quieras: «¿a qué hora salgo?», «¿qué material llevo?», «plan B si empeora». El copiloto usa los datos de tu ruta y de la previsión. Funciona siempre: usa Gemini cuando está disponible, la IA integrada de Chrome o una IA comunitaria y, si no hay ninguna, su propio motor, que razona con los datos de la app sin conexión. Las respuestas de cualquier IA pueden contener errores.</p>`],
['guardar','Mis rutas, sin cobertura y cuenta',`<p><b>Guardar sin cobertura</b> conserva el plan, la previsión y el mapa en el móvil para consultarlos en la montaña. <b>Mis rutas</b> reúne tus rutas guardadas y permite compararlas. Con <b>Cuenta</b> (Google) tus rutas se sincronizan entre dispositivos; sin cuenta todo funciona igual, solo que en este dispositivo.</p><p><b>Instalar como app:</b> en el móvil, menú del navegador → «Añadir a pantalla de inicio».</p>`],
['seguridad','Plan de seguridad',`<p>En <b>En ruta y seguridad</b> eliges a qué hora debe preocuparse tu contacto si no das señales. TrailMeteo prepara un mensaje con la ruta, el punto de salida (enlace de mapa), la llegada prevista y la hora de alarma para enviarlo por WhatsApp o SMS, o añadirlo como aviso al calendario. La app no envía nada por sí sola. Emergencias: <b>112</b>.</p>`],
['atajos','Atajos',`<ul><li><b>⌘K</b> o <b>Ctrl+K</b> (o la tecla <b>/</b>): buscar cualquier sección, ruta o lugar, o preguntar al copiloto.</li><li><b>Esc</b>: cerrar paneles.</li><li>Menú ☰: todas las secciones agrupadas.</li></ul>`],
['limites','Límites y fuentes',`<p>Las previsiones son modelos con incertidumbre, sobre todo en montaña y a varios días vista. La app no conoce el estado real del terreno, la nieve, los desprendimientos ni tu forma física. Contrasta con AEMET, pregunta en refugios y decide con lo que veas.</p><p>Fuentes: Open-Meteo (modelos), MET Norway, AEMET (boletines y avisos), RainViewer (radar), DGT (tráfico), OpenStreetMap y BRouter (senderos), IGN y Esri (imágenes), Open Food Facts (alimentos).</p>`]];
const gp=$('#pane-guide');if(gp)gp.innerHTML=`<header class="g-head"><p class="eyebrow">Ayuda</p><h2>Instrucciones</h2><p class="g-lead">Todo lo que puedes hacer con TrailMeteo, explicado paso a paso.</p></header><nav class="g-index" aria-label="Índice">${G.map(([id,t])=>`<a href="#g-${id}">${t}</a>`).join('')}</nav>${G.map(([id,t,h])=>`<section class="g-sec" id="g-${id}"><h2>${t}</h2>${h}</section>`).join('')}`;
gp?.addEventListener('click',e=>{const a=e.target.closest('.g-index a');if(!a)return;e.preventDefault();$(a.getAttribute('href'))?.scrollIntoView({behavior:'smooth',block:'start'})});

markActive();
{const rk=$("#routeKnowledge");if(rk)$("#pane-route")?.append(rk)}
globalThis.TMShell={go,markActive,nav:NAV};
})();
