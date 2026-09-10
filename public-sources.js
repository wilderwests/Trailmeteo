/* Bounded public retrieval. Text is evidence, never executable instructions. */
(function(root){
const cache=new Map();
const normalize=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const generic=new Set('ruta rutas route track gpx senderismo hiking trail trails canal canales picos europa montana circular travesia integral subida bajada por del los las una uno desde hasta con para prueba'.split(' '));
function keywords(query){return [...new Set(normalize(query).split(' ').filter(w=>w.length>=3&&!generic.has(w)))];}
function safeURL(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/(^|\.)(localhost|local|internal)$/.test(u.hostname)||/^\d+\.\d+\./.test(u.hostname))return null;u.hash='';return u.href}catch{return null}}
function family(value){const h=new URL(value).hostname.replace(/^www\./,'');return /(^|\.)wikiloc\.com$/.test(h)?'wikiloc.com':h;}
function canonical(value){const u=new URL(value);if(family(value)==='wikiloc.com'){const id=u.pathname.match(/-(\d+)\/?$/);if(id)return 'wikiloc:'+id[1]}return u.origin+u.pathname.replace(/\/$/,'');}
function clean(s){return s.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/[#*_>|]/g,'').replace(/\s+/g,' ').trim();}
function parseResults(markdown){const results=[],seen=new Set(),pattern=/^(?:#{1,3}\s+|\d+[.)]\s+)?\[([^\n]+?)\]\((https?:\/\/[^\s)]+)\)/gm;for(const m of markdown.matchAll(pattern)){let url;try{const u=new URL(m[2]);url=safeURL(u.searchParams.get('uddg')||u.href)}catch{continue}if(!url)continue;const host=new URL(url).hostname;if(/(^|\.)(wikipedia\.org|duckduckgo\.com|jina\.ai)$/.test(host)||seen.has(canonical(url)))continue;seen.add(canonical(url));results.push({title:clean(m[1]),url,host,family:family(url)})}return results;}
function relevance(item,query){const words=keywords(query),hay=normalize(item.title+' '+decodeURI(item.url));return words.reduce((n,w)=>n+Number((' '+hay+' ').includes(' '+w+' ')),0);}
function extractText(markdown,query){if(/captcha|verify you are human|checking your browser|access denied|making sure you.?re not a bot|enable javascript and cookies/i.test(markdown.slice(0,1800)))return null;
 let body=markdown.split('Markdown Content:').slice(1).join('Markdown Content:')||markdown;const words=keywords(query);if(!words.length)return null;
 const description=body.match(/^## (?:Descripción del itinerario|Trail description|Route description)\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m);if(description){const comments=body.match(/^## (?:Comentarios|Comments) ?\([1-9]\d*\)[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m);body=description[1]+(comments?'\n\nComentarios publicados:\n'+comments[1]:'');}
 const all=body.split(/\n\s*\n/).map(s=>s.replace(/^#{1,6}[^\n]*$/gm,'')).map(clean).filter(s=>s.length>45&&!/cookie|iniciar sesi[oó]n|suscr[ií]b|all rights reserved|change language|sign up|log in|marcar como|no apropiado|ofensivo|dejar un comentario|moderadores:|^foro de/i.test(s));
 const hasWord=s=>words.some(w=>(' '+normalize(s)+' ').includes(' '+w+' '));
 if(!all.some(hasWord))return null;
 const useful=/recorrido|itinerario|ascen|descen|senda|sendero|trepa|destrep|expuest|vertig|paso|pedrer|canal|collad|fuente|desnivel|cumb|majada|refugio|señal|senal|nieve|hielo|barro|resbal|cresta|bosque|puente|desvio|izquierda|derecha|precau|dificult|roca|orientaci|bifurca/i;
 const chosen=new Set();for(let i=0;i<all.length;i++){if(all[i].length>=100&&hasWord(all[i])&&useful.test(all[i])){chosen.add(i);for(let j=i+1;j<=i+2&&j<all.length;j++)if(useful.test(all[j]))chosen.add(j)}}
 if(!chosen.size)return null;
 // Keep continuity rather than isolated paragraphs repeating the route name.
 const result=[...chosen].sort((a,b)=>a-b).map(i=>all[i]).join('\n\n');return result.length>=100?result.slice(0,6500):null;
}
async function read(url,signal,timeout=14000){if(!safeURL(url))throw Error('URL no admitida');const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,timeout);try{const r=await fetch('https://r.jina.ai/'+url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error(r.status===429?'Servicio gratuito temporalmente limitado':'Fuente no accesible ('+r.status+')');const text=await r.text();if(text.length>1500000)throw Error('Página demasiado extensa');return text}catch(e){if(controller.signal.aborted&&!signal?.aborted)throw Error('La fuente tardó demasiado');throw e}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}}
async function search(query,signal,onProgress=()=>{},refresh=false){
 const q=query.trim().slice(0,160),key=normalize(q),saved=cache.get(key);if(!keywords(q).length)throw Error('Añade un lugar concreto al nombre de la ruta.');
 if(!refresh&&saved&&Date.now()-saved.searched<600000){onProgress('Reutilizando consulta reciente');return {...saved,cached:true}}
 const searchURL='https://html.duckduckgo.com/html/?q='+encodeURIComponent(q+' senderismo -site:wikipedia.org');
 let candidates=parseResults(await read(searchURL,signal,20000));
 // Translated Wikiloc mirrors are one provider, not independent evidence.
 if(new Set(candidates.map(x=>x.family)).size<3&&!signal?.aborted){onProgress('Buscando también blogs y otras webs…');try{const extra='https://html.duckduckgo.com/html/?q='+encodeURIComponent(q+' -site:wikiloc.com -site:wikipedia.org');candidates.push(...parseResults(await read(extra,signal,15000)))}catch(e){if(signal?.aborted)throw e}}
 const seen=new Set();candidates=candidates.filter(x=>{const id=canonical(x.url);if(seen.has(id))return false;seen.add(id);return relevance(x,q)>0}).sort((a,b)=>relevance(b,q)-relevance(a,q));
 if(!candidates.length)throw Error('No hay resultados que coincidan con el lugar indicado. Prueba el nombre de la ruta y su municipio.');
 const ordered=[],groups=new Map();for(const c of candidates){if(!groups.has(c.family))groups.set(c.family,[]);groups.get(c.family).push(c)}for(let round=0;round<2;round++)for(const group of groups.values())if(group[round])ordered.push(group[round]);
 const sources=[],readFamilies=new Set();let attempts=0;
 for(let i=0;i<ordered.length&&attempts<6&&readFamilies.size<3&&!signal?.aborted;){const batch=[];while(i<ordered.length&&batch.length<Math.min(2,3-readFamilies.size)&&attempts<6){const item=ordered[i++];if(readFamilies.has(item.family))continue;if(batch.some(x=>x.family===item.family)){i--;break}batch.push(item);attempts++}if(!batch.length)continue;
 onProgress('Leyendo fuentes: '+batch.map(x=>x.host).join(', '));
 const results=await Promise.all(batch.map(async item=>{try{const raw=await read(item.url,signal),text=extractText(raw,q);return {...item,text:text||'',published:(raw.match(/^Published Time: (.+)$/m)||[])[1]||null,status:text?'read':'unusable',fetched:Date.now(),note:text?((text.match(/�/g)||[]).length>3?'La fuente devuelve algunos caracteres dañados; comprueba el original.':'Pasajes recuperados del original; la ruta exacta debe contrastarse.'):'No se recuperó una descripción pertinente.'}}catch(e){return {...item,text:'',status:'failed',fetched:Date.now(),note:signal?.aborted?'Consulta interrumpida':e.message}}}));
 for(const result of results){result.id='F'+(sources.length+1);sources.push(result);if(result.status==='read')readFamilies.add(result.family)}onProgress(readFamilies.size+' fuentes diferentes con texto recuperado');
 }
 const result={query:q,searched:Date.now(),searchURL,sources,incomplete:!!signal?.aborted,cached:false};if(readFamilies.size&&!result.incomplete){cache.set(key,result);if(cache.size>12)cache.delete(cache.keys().next().value)}return result;
}
root.PublicSources={safeURL,parseResults,extractText,search,family,canonical,relevance};if(typeof module!=='undefined')module.exports=root.PublicSources;
})(typeof globalThis!=='undefined'?globalThis:this);
