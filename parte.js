'use strict';
/* Parte de montaña del día, redactado en GitHub Actions (GitHub Models, gratis) o por reglas si no hay IA.
   Se muestra en Cielo y alimenta al copiloto. Sustituye al antiguo bloque que exigía descargar un modelo local. */
(function(){
const P={data:null};
const ago=t=>{const m=Math.round((Date.now()-Date.parse(t))/60000);return m<60?`hace ${Math.max(1,m)} min`:m<1440?`hace ${Math.round(m/60)} h`:`hace ${Math.round(m/1440)} días`};
function render(){const d=P.data,block=document.querySelector('.ai-block');if(!block)return;
 if(!block.dataset.v13){block.dataset.v13='1';const keep=['#aiStatus','#aiStart','#aiText'].map(s=>block.querySelector(s)).filter(Boolean);const hidden=document.createElement('div');hidden.hidden=true;keep.forEach(e=>hidden.append(e));block.innerHTML='<div id="parteBox" class="parte" aria-live="polite"></div>';block.append(hidden)}
 const box=$('#parteBox');if(!box)return;
 if(!d){box.innerHTML='<div class="sectionhead"><h3>Parte de Picos</h3><span class="spark">✧</span></div><p class="muted">El parte del día aún no está disponible. Pregunta al copiloto: siempre responde con los datos de la app.</p><button type="button" class="quiet" data-parte-ask>✦ Preguntar al copiloto</button>';return}
 const stale=Date.now()-Date.parse(d.generated)>12*3600000;
 box.innerHTML=`<div class="sectionhead"><h3>${esc(d.titular)}</h3><span class="pill">${d.source==='github-models'?'IA · '+esc((d.model||'').split('/').pop()):'Reglas'}</span></div><ol class="parte-lines">${(d.resumen||[]).slice(0,3).map(l=>`<li>${esc(l)}</li>`).join('')}</ol>${d.riesgos?.length?`<div class="parte-risks">${d.riesgos.slice(0,4).map(r=>`<span>${esc(r)}</span>`).join('')}</div>`:''}${d.consejo?`<p class="parte-tip"><b>Consejo:</b> ${esc(d.consejo)}</p>`:''}${d.mejor_momento?`<p class="parte-tip"><b>Mejor momento:</b> ${esc(d.mejor_momento)}</p>`:''}<div class="action-row"><button type="button" class="quiet" data-parte-ask>✦ Profundizar con el copiloto</button></div><p class="footnote">Parte de ${esc(d.zone||'Picos de Europa')} · ${ago(d.generated)}${stale?' · <b>antiguo</b>, actualiza antes de decidir':''}. ${d.source==='github-models'?'Redactado por IA a partir de Open-Meteo, AEMET y DGT; puede equivocarse.':'Calculado por reglas con Open-Meteo, AEMET y DGT.'}</p>`}
async function load(){try{const r=await fetch('data/ai-parte.json?'+Math.floor(Date.now()/600000),{cache:'no-store'});if(r.ok)P.data=await r.json()}catch{}render()}
document.addEventListener('click',e=>{if(e.target.closest('[data-parte-ask]'))globalThis.Copilot?.ask('Dame el parte de hoy para Picos de Europa: veredicto, mejor momento y qué vigilar.',{label:'✦ Parte de hoy'})});
load();
globalThis.TMParte={get data(){return P.data},load,render};
})();
