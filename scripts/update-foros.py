"""Foros y noticias de montaña para la sección «Foros, boletines y noticias».

Foros (RSS públicos):
  · Foro de Tiempo.com (Meteored): mensajes recientes de todo el foro; se quedan los hilos de seguimiento del norte
    (Galicia, Asturias, Cantabria y País Vasco), Castilla y León y los reportajes o temas que hablan de la Cordillera.
  · Nevasport, foros «Meteorología y nieve» y «Free & Ride»: hilos con actividad reciente (seguimiento, ronda informativa)
    y los que nombran la Cordillera Cantábrica.
Noticias: Google News (RSS) por temas — nieve, aludes, avisos, rescates, carreteras y puertos, esquí, refugios y Picos.

Solo se guarda el título, la fecha, la fuente, el enlace al original y un extracto corto (máx. 220 caracteres); el texto
completo se lee en la web de origen. Escribe data/foros.json. Si una fuente falla se conserva lo anterior de esa fuente.
"""
import datetime, email.utils, html, json, pathlib, re, sys, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

UA = 'TrailMeteo/18 (+https://github.com/wilderwests/Trailmeteo)'
DEST = pathlib.Path(__file__).resolve().parents[1] / 'data/foros.json'
NOW = datetime.datetime.now(datetime.timezone.utc)

ZONE = re.compile(r'picos|cant[aá]bric|asturias|asturies|cantabria|castilla y le[oó]n|\ble[oó]n\b|palencia|palentina|ubi[nñ]a|mampodre|'
                  r'somiedo|pajares|riaño|riano|valdeón|valdeon|liébana|liebana|cabrales|covadonga|urriellu|naranjo de bulnes|'
                  r'alto campoo|san isidro|valgrande|fuentes de invierno|leitariegos|curavacas|espigüete|espiguete|peña prieta|'
                  r'fuentes carrionas|norte peninsular|noroeste|\bnorte\b', re.I)

FORUMS = [
    {'id': 'tiempo', 'name': 'Foro de Tiempo.com', 'by': 'Meteored', 'home': 'https://foro.tiempo.com/',
     'url': 'https://foro.tiempo.com/index.php?action=.xml;type=rss2;limit=255', 'kind': 'posts'},
    {'id': 'nevasport', 'name': 'Nevasport · Meteorología y nieve', 'by': 'Nevasport', 'home': 'https://www.nevasport.com/phorum/list.php?48',
     'url': 'https://www.nevasport.com/phorum/feed.php?48,type=rss', 'kind': 'threads'},
    {'id': 'nevasport', 'name': 'Nevasport · Free & Ride', 'by': 'Nevasport', 'home': 'https://www.nevasport.com/phorum/list.php?86',
     'url': 'https://www.nevasport.com/phorum/feed.php?86,type=rss', 'kind': 'threads', 'zone_only': True},
]
# Para el texto de los mensajes, solo nombres inequívocos de la Cordillera («norte» o «León» sueltos dan falsos positivos).
ZONE_STRICT = re.compile(r'picos de europa|cordillera cant[aá]brica|asturias|asturies|cantabria|palencia|palentina|ubi[nñ]a|mampodre|'
                         r'somiedo|pajares|riaño|valdeón|valdeon|liébana|liebana|cabrales|covadonga|urriellu|naranjo de bulnes|'
                         r'alto campoo|san isidro|valgrande|fuentes de invierno|leitariegos|curavacas|espigüete|peña prieta|fuentes carrionas|'
                         r'montaña (leonesa|palentina|central asturiana|oriental)', re.I)
# Hilos de seguimiento útiles aunque no nombren la zona en el título.
FOLLOW = re.compile(r'seguimiento resto de zonas|ronda informativa', re.I)

NEWS = [
    ('nieve', '(nieve OR nevadas OR nevada) (Asturias OR Cantabria OR León OR Palencia) montaña'),
    ('aludes', 'aludes OR avalancha (Picos de Europa OR Cordillera Cantábrica OR Asturias OR León OR Cantabria)'),
    ('avisos', 'aviso (nieve OR temporal OR viento OR frío) AEMET (Asturias OR Cantabria OR León)'),
    ('rescates', 'rescate OR rescatado OR accidente montaña (Picos de Europa OR Asturias OR Cantabria OR León)'),
    ('carreteras', '(puerto OR carretera OR cadenas) nieve (Pajares OR "San Glorio" OR Tarna OR Pontón OR Leitariegos OR Piedrasluengas OR Somiedo OR "San Isidro" OR Panderrueda)'),
    ('esquí', '(esquí OR estación) ("San Isidro" OR "Alto Campoo" OR Valgrande OR "Fuentes de Invierno" OR Leitariegos)'),
    ('refugios', 'refugio (Picos de Europa OR Urriellu OR Vegarredonda OR Ándara OR "Collado Jermoso" OR "Vega de Ario")'),
    ('montaña', '"Picos de Europa"'),
    ('previsión', 'site:tiempo.com (nieve OR temporal OR frío OR borrasca) (norte OR Cantábrico OR Asturias OR Cantabria OR León)'),
]
TAGS = {
    'nieve': r'niev|nevad|nevar|copos|cota de nieve|manto',
    'aludes': r'alud|avalanch',
    'avisos': r'aviso|alerta|amarillo|naranja|\brojo\b|aemet',
    'rescates': r'rescat|accident|herid|fallec|desaparec|evacu|helicóptero|helicoptero|enriscad|atrapad',
    'carreteras': r'carreter|puerto|cadenas|dgt|cortad|\bcorte\b|cerrad[oa] al tráfico|quitanieves|\b(le|ast|ca|n|a|p)-\d',
    'esquí': r'esqu[ií]|estaci[oó]n de|pistas|forfait|snow',
    'refugios': r'refugio|guarda',
    'montaña': r'picos de europa|montañ|cumbre|ascensi|senderis|alpinis|escalad',
    'previsión': r'previsi|borrasca|\bdana\b|frío|frio|temporal|ola de|bajo cero|helad|lluvia|viento|meteored',
}
MAX_AGE = {'posts': 10, 'threads': 30, 'news': 21}  # días


def get(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def text(s, n=220):
    """HTML del mensaje → texto corto: sin citas de otros mensajes, sin firmas ni enlaces sueltos."""
    s = re.sub(r'(?is)<(blockquote|div class="quote[^"]*"|div class="quoteheader[^"]*")[^>]*>.*?</(blockquote|div)>', ' ', s or '')
    s = re.sub(r'(?is)<br\s*/?>|</p>', ' ', s)
    s = html.unescape(re.sub(r'(?s)<[^>]+>', ' ', s))
    s = re.sub(r'(?i)\b(cita de|quote from)\b[^\n]{0,120}?(en|on)\b[^\n]{0,40}?\d{1,2}:\d{2}', ' ', s)
    s = re.sub(r'https?://\S+', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[:n].rsplit(' ', 1)[0].rstrip(',;:.') + '…'


def first_image(s):
    m = re.search(r'''<img[^>]+src=["'](https://[^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']''', s or '', re.I)
    return m.group(1) if m else None


def when(s):
    try:
        d = email.utils.parsedate_to_datetime(s)
        return (d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)).astimezone(datetime.timezone.utc)
    except Exception:
        return None


def items(xml):
    root = ET.fromstring(xml)
    for it in root.iter('item'):
        g = lambda tag: (it.findtext(tag) or '').strip()
        src = it.find('source')
        yield {'title': html.unescape(g('title')), 'link': g('link'), 'date': when(g('pubDate')), 'category': g('category'),
               'desc': g('description'), 'source': (src.text or '').strip() if src is not None else '', 'source_url': src.get('url') if src is not None else ''}


def safe(u):
    try:
        p = urllib.parse.urlsplit(u)
        return u if p.scheme == 'https' and p.hostname and not p.username else None
    except Exception:
        return None


def fresh(d, days):
    return d is not None and (NOW - d).days < days and d <= NOW + datetime.timedelta(hours=2)


def thread_of(title):
    return re.sub(r'^\s*re\s*:\s*', '', title, flags=re.I).strip()


def forum_posts(f, xml):
    out = []
    for it in items(xml):
        url = safe(it['link'])
        if not url or not fresh(it['date'], MAX_AGE[f['kind']]):
            continue
        thread = thread_of(it['title'])
        if f['kind'] == 'threads':
            thread = re.sub(r'\s*\((?:sin respuestas|\d+ respuestas?)\)\s*$', '', thread)
        blob = thread + ' ' + text(it['desc'], 2000)
        zone_title = bool(ZONE.search(thread))
        if f['kind'] == 'posts':
            # Hilos de seguimiento por regiones: solo el del norte y el de Castilla y León; el resto, si habla de la Cordillera.
            if re.search(r'canarias|madrid|cataluña|catalu|valenciana|murcia|baleares|andaluc|arag[oó]n|navarra|resto del mundo', thread, re.I) and not zone_title:
                continue
            if not (zone_title or ZONE_STRICT.search(blob)):
                continue
        else:
            if f.get('zone_only') and not ZONE_STRICT.search(blob):
                continue
            if not (zone_title or FOLLOW.search(thread) or ZONE_STRICT.search(blob)):
                continue
        replies = re.search(r'\((\d+) respuestas?\)', it['title'])
        # En los foros por hilos (Nevasport) la descripción es el primer mensaje del hilo, no el último: no se muestra.
        excerpt = text(it['desc']) if f['kind'] == 'posts' else None
        out.append({'forum': f['id'], 'forumName': f['name'], 'thread': thread, 'board': it['category'] or None, 'url': url,
                    'date': it['date'].isoformat(), 'excerpt': excerpt or None, 'img': first_image(it['desc']) if f['kind'] == 'posts' else None,
                    'replies': int(replies.group(1)) if replies else None, 'zone': zone_title})
    return out


def tags_for(title, base=None):
    """Etiquetas por lo que dice el titular (no por la búsqueda que lo trajo): así una noticia sobre el paro que
    Google devuelve por el nombre del medio («Radio Montaña Leonesa») no queda como «nieve»."""
    return sorted(k for k, rx in TAGS.items() if re.search(rx, title, re.I))


def news_items(tag, xml):
    out = []
    for it in items(xml):
        url = safe(it['link'])
        if not url or not fresh(it['date'], MAX_AGE['news']):
            continue
        title, source = it['title'], it['source']
        if source and title.endswith(' - ' + source):
            title = title[:-len(source) - 3]
        tags = tags_for(title)
        # Debe tratar de un tema de montaña y, salvo búsquedas ya acotadas a lugares concretos, nombrar la zona.
        if not tags or (not ZONE.search(title) and tag not in ('carreteras', 'esquí', 'refugios', 'montaña')):
            continue
        if tags == ['previsión'] and not ZONE.search(title):
            continue
        dom = urllib.parse.urlsplit(it['source_url'] or url).hostname or ''
        out.append({'title': title.strip(), 'source': source or dom, 'domain': dom.removeprefix('www.'), 'url': url,
                    'date': it['date'].isoformat(), 'tags': tags})
    return out


def norm(s):
    return re.sub(r'[^a-z0-9]+', ' ', html.unescape(s).lower()).strip()


def dedupe_news(lst):
    seen, out = {}, []
    """Mismo titular → una sola noticia. La misma historia contada por varios medios (palabras clave muy parecidas, a menos
    de dos días) → una noticia con «también en» y el enlace de cada medio."""
    stop = set('de la el en los las del a y un una al con por para tras se su es que o lo como más mas sus este esta'.split())
    words = lambda t: {w for w in norm(t).split() if len(w) > 2 and w not in stop}
    for n in sorted(lst, key=lambda x: x['date'], reverse=True):
        k = norm(n['title'])[:90]
        if k in seen:
            seen[k]['tags'] = sorted(set(seen[k]['tags']) | set(n['tags']))
            continue
        w, d = words(n['title']), datetime.datetime.fromisoformat(n['date'])
        twin = next((o for o in out if abs((datetime.datetime.fromisoformat(o['date']) - d).total_seconds()) < 172800
                     and len(w & o['_w']) >= 3 and len(w & o['_w']) / max(1, len(w | o['_w'])) >= .34), None)
        if twin:
            if n['domain'] != twin['domain'] and all(n['domain'] != a['domain'] for a in twin.setdefault('also', [])):
                twin['also'].append({'source': n['source'], 'domain': n['domain'], 'url': n['url']})
            twin['tags'] = sorted(set(twin['tags']) | set(n['tags']))
            seen[k] = twin
            continue
        n['_w'] = w
        seen[k] = n
        out.append(n)
    for o in out:
        o.pop('_w', None)
        if not o.get('also'):
            o.pop('also', None)
    return out


def main():
    old = {}
    try:
        old = json.loads(DEST.read_text())
    except Exception:
        pass
    posts, news, errors, ok_forums = [], [], [], set()
    for f in FORUMS:
        try:
            posts += forum_posts(f, get(f['url']))
            ok_forums.add(f['url'])
        except Exception as e:
            errors.append(f"{f['name']}: {e}")
    if old.get('posts'):  # conserva lo de las fuentes que hoy han fallado
        failed = {f['id'] for f in FORUMS if f['url'] not in ok_forums}
        posts += [p for p in old['posts'] if p.get('forum') in failed and fresh(when_iso(p.get('date')), 30)]
    ok_news = 0
    for tag, q in NEWS:
        url = 'https://news.google.com/rss/search?' + urllib.parse.urlencode({'q': q + ' when:14d', 'hl': 'es', 'gl': 'ES', 'ceid': 'ES:es'})
        try:
            news += news_items(tag, get(url))[:20]
            ok_news += 1
        except Exception as e:
            errors.append(f'Noticias ({tag}): {e}')
    if not ok_news and old.get('news'):
        news = old['news']
    seen, uniq = set(), []
    for p in sorted(posts, key=lambda x: x['date'], reverse=True):
        if p['url'] in seen:
            continue
        seen.add(p['url'])
        uniq.append(p)
    data = {'fetched': NOW.isoformat(), 'note': 'Títulos, fechas y extractos breves con enlace al original. El contenido es de sus autores.',
            'forums': [{'id': f['id'], 'name': f['name'], 'by': f['by'], 'home': f['home']} for f in FORUMS],
            'posts': uniq[:80], 'news': dedupe_news(news)[:90], 'errors': errors}
    if not data['posts'] and not data['news']:
        sys.exit('Sin foros ni noticias nuevas: se conserva lo anterior. ' + '; '.join(errors))
    DEST.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print('Foros:', len(data['posts']), 'mensajes · Noticias:', len(data['news']), '·', len(errors), 'errores')


def when_iso(s):
    try:
        return datetime.datetime.fromisoformat(s)
    except Exception:
        return None


if __name__ == '__main__':
    main()
