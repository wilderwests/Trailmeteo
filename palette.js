'use strict';
/* Paleta de comandos (⌘K / Ctrl+K o «/»): ir a cualquier sección, buscar rutas y lugares, preguntar al copiloto. */
(function(){
const fold=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const more=k=>()=>{TMTheme.openMore();setTimeout(()=>document.querySelector(`#moreSheet [data-more="${k}"]`)?.click(),30)};
const go=t=>()=>{if(typeof enterApp==='function'&&$('#splash'))enterApp(t);showTab(t);window.scrollTo({top:0,behavior:'smooth'})};
const CMDS=[
 ['Planificar una ruta','route planificar gpx','🧭',go('route')],
 ['Cielo · previsión del lugar','cielo tiempo prevision ahora','☁',go('now')],
 ['Terreno y relieve','terreno relieve pendiente','⛰',go('terrain')],
 ['Canales de Picos','canales picos catalogo','⟋',go('canales')],
 ['Radar de precipitación','radar lluvia','◎',more('radar')],
 ['Boletín AEMET de montaña','aemet montana boletin aludes','▲',more('mountain')],
 ['Modelos meteorológicos','modelos ecmwf icon gfs','≋',more('models')],
 ['Carretera · DGT y cadenas','carretera dgt cadenas coche llegar','🚗',more('road')],
 ['Mis rutas guardadas','mis rutas biblioteca guardadas','★',more('library')],
 ['Cuenta y sincronización','cuenta google login','◉',more('account')],
 ['Buzón de sugerencias','buzon contacto sugerencia','✉',more('contact')],
 ['Abrir el copiloto IA','copiloto ia chat','✦',()=>globalThis.Copilot?.open()],
 ['Combustible · comida y bebida','combustible comida calorias hidratos geles','◒',()=>globalThis.TMShell?.go('fuel')],
 ['Instrucciones','ayuda guia instrucciones como funciona','?',()=>globalThis.TMShell?.go('guide')],
 ['Probar una ruta de ejemplo','ejemplo demo','◇',()=>{go('route')();setTimeout(()=>$('#demoRoute')?.click(),60)}],
 ['Importar un GPX','importar gpx archivo','↥',()=>{go('route')();$('#gpxInput')?.click()}],
 ['Analizar la ruta cargada','analizar ruta','▶',()=>{go('route')();if(S.route)analyzeRoute()}],
 ['Modo noche','tema oscuro noche','☾',()=>TMTheme.apply('night')],
 ['Modo día','tema claro dia','☀',()=>TMTheme.apply('day')],
 ['Volver a la portada','inicio portada home','⌂',more('home')]];
let state=null;
function open(seed=''){if(state)return;document.body.insertAdjacentHTML('beforeend',`<div class="pal" id="pal" role="dialog" aria-modal="true" aria-label="Paleta de comandos"><div class="pal-box"><div class="pal-in"><span aria-hidden="true">⌕</span><input id="palInput" autocomplete="off" spellcheck="false" placeholder="Busca una sección, una ruta, un lugar o pregunta al copiloto…" aria-controls="palList"><kbd>esc</kbd></div><ul class="pal-list" id="palList" role="listbox"></ul><p class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>↵</kbd> abrir</span><span><kbd>⌘K</kbd> abrir o cerrar</span></p></div></div>`);state={i:0,items:[]};const inp=$('#palInput');inp.value=seed;inp.oninput=draw;inp.onkeydown=key;$('#pal').onclick=e=>{if(e.target.id==='pal')close();const li=e.target.closest('[data-pal]');if(li)run(+li.dataset.pal)};draw();inp.focus();if(typeof sfx==='function')sfx('open')}
function close(){$('#pal')?.remove();state=null}
function draw(){const q=fold($('#palInput').value.trim());const list=CMDS.map(([t,k,i,fn])=>({t,i,fn,score:!q?1:fold(t).includes(q)?3:fold(k).includes(q)?2:q.split(/\s+/).every(w=>fold(t+' '+k).includes(w))?1:0})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 if(q.length>=3){list.push({t:`Buscar ruta «${$('#palInput').value.trim()}»`,i:'⚡',sub:'Senderos de OpenStreetMap y canales · carga automática',fn:()=>{go('route')();$('#frQuery').value=$('#palInput').value.trim();globalThis.TMFinder?.search($('#frQuery').value)}},{t:`Buscar lugar «${$('#palInput').value.trim()}»`,i:'⌖',sub:'Previsión del sitio',fn:()=>{go('now')();$('#placeSearch').value=$('#palInput').value.trim();$('#searchForm').requestSubmit?.()}},{t:`Preguntar: «${$('#palInput').value.trim()}»`,i:'✦',sub:'Copiloto IA',fn:()=>globalThis.Copilot?.ask($('#palInput').value.trim())})}
 state.items=list;state.i=Math.min(state.i,Math.max(0,list.length-1));$('#palList').innerHTML=list.map((x,k)=>`<li role="option" data-pal="${k}" aria-selected="${k===state.i}"><span class="pal-ic">${x.i}</span><span>${esc(x.t)}${x.sub?`<small>${esc(x.sub)}</small>`:''}</span></li>`).join('')||'<li class="pal-empty">Sin coincidencias</li>'}
function key(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();state.i=(state.i+(e.key==='ArrowDown'?1:-1)+state.items.length)%Math.max(1,state.items.length);draw();$('#palList [aria-selected="true"]')?.scrollIntoView({block:'nearest'})}else if(e.key==='Enter'){e.preventDefault();run(state.i)}else if(e.key==='Escape')close()}
function run(k){const x=state?.items[k];close();if(x)try{x.fn()}catch(err){console.warn(err)}}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();state?close():open()}else if(e.key==='/'&&!state&&!/input|textarea|select/i.test(document.activeElement?.tagName||'')&&!document.activeElement?.isContentEditable){e.preventDefault();open()}});
const bar=$('.topbar');if(bar){const b=document.createElement('button');b.type='button';b.className='pal-trigger';b.id='palTrigger';b.innerHTML='<span aria-hidden="true">⌕</span><span class="pal-label">Buscar</span><kbd>⌘K</kbd>';b.setAttribute('aria-label','Buscar y navegar (⌘K)');b.onclick=()=>open();const anchor=$('#refresh')||bar.lastElementChild;anchor?.parentElement?.insertBefore(b,anchor)}
globalThis.TMPalette={open,close,commands:CMDS};
})();
