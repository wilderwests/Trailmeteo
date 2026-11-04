"""Foros y noticias: filtros por zona, hilos de seguimiento, extractos, fechas, etiquetas y duplicados. Sin red."""
import datetime, importlib.util, pathlib
spec = importlib.util.spec_from_file_location('foros', pathlib.Path(__file__).resolve().parents[1] / 'scripts/update-foros.py')
F = importlib.util.module_from_spec(spec); spec.loader.exec_module(F)
F.NOW = datetime.datetime(2026, 11, 4, 18, 0, tzinfo=datetime.timezone.utc)

TIEMPO = '''<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Foro de Tiempo.com</title>
<item><title>Re:Galicia, Asturias, Cantabria y País Vasco. Noviembre de 2026.</title><link>https://foro.tiempo.com/index.php?topic=153114.msg3727555#msg3727555</link>
<description><![CDATA[De nuevo día fresco.<br><br>Van abriéndose los cielos por Oviedo tras una mañana muy oscura y tenemos 12.7ºC.<br><img src="https://i.imgur.com/abc.jpg" alt=""><br>Estará fresco hasta el viernes...]]></description>
<category>Foro General de Seguimiento</category><pubDate>Wed, 04 Nov 2026 14:43:30 GMT</pubDate></item>
<item><title>Re:Islas Canarias. Noviembre de 2026.</title><link>https://foro.tiempo.com/index.php?topic=153116.msg1#msg1</link><description>Calima en Lanzarote</description><category>Foro General de Seguimiento</category><pubDate>Wed, 04 Nov 2026 17:58:00 GMT</pubDate></item>
<item><title>Re:Castilla y León. Noviembre de 2026.</title><link>https://foro.tiempo.com/index.php?topic=153118.msg3727552#msg3727552</link><description><![CDATA[<div class="quoteheader">Cita de: alguien en hoy a las 12:00</div><blockquote>texto citado largo</blockquote>Pues si, ya empezamos a ver registros propios de estas fechas. En mi terraza hoy -1,4]]></description><category>Foro General de Seguimiento</category><pubDate>Wed, 04 Nov 2026 13:40:47 GMT</pubDate></item>
<item><title>Pico Robiñera (3003 m), 02/11/26</title><link>https://foro.tiempo.com/index.php?topic=153121.msg3727523#msg3727523</link><description>Subida por el valle de Pineta</description><category>Reportajes de viajes, pueblos, naturaleza y montaña</category><pubDate>Wed, 04 Nov 2026 00:23:00 GMT</pubDate></item>
<item><title>Ruta por los Lagos de Covadonga, 01/11/26</title><link>https://foro.tiempo.com/index.php?topic=153122.msg9#msg9</link><description>Primeras nieves en Picos de Europa vistas desde el Mirador de la Reina</description><category>Reportajes de viajes, pueblos, naturaleza y montaña</category><pubDate>Tue, 03 Nov 2026 20:00:00 GMT</pubDate></item>
<item><title>Re:Asturias. Octubre de 2026.</title><link>https://foro.tiempo.com/index.php?topic=1.msg2#msg2</link><description>antiguo</description><category>Foro General de Seguimiento</category><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>Re:Seguimiento de actividad eléctrica</title><link>http://foro.tiempo.com/index.php?topic=2.msg3#msg3</link><description>rayos en León</description><category>Meteorología general</category><pubDate>Wed, 04 Nov 2026 11:04:00 GMT</pubDate></item>
</channel></rss>'''

NEVA = '''<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Nevasport.com - Meteorología y nieve</title>
<item><title>Seguimiento resto de zonas [Temporada 2026-2027] (sin respuestas)</title><link>https://www.nevasport.com/phorum/read.php?48,4698614,4698614#msg-4698614</link><description><![CDATA[ En este tema se hablará <b>únicamente</b> de normas...]]></description><category>Meteorología y nieve</category><pubDate>Wed, 28 Oct 2026 10:12:56 +0200</pubDate></item>
<item><title>Ronda informativa [Temporada 2026-2027] (11 respuestas)</title><link>https://www.nevasport.com/phorum/read.php?48,4698613,4698613#msg-4698613</link><description>Hilo para informar</description><category>Meteorología y nieve</category><pubDate>Wed, 04 Nov 2026 14:57:02 +0100</pubDate></item>
<item><title>Seguimiento Pirineos [Temporada 2026-2027] (10 respuestas)</title><link>https://www.nevasport.com/phorum/read.php?48,4698611,4698611#msg-4698611</link><description>Pirineos</description><category>Meteorología y nieve</category><pubDate>Mon, 02 Nov 2026 12:49:32 +0100</pubDate></item>
<item><title>Nieve en San Isidro este puente? (2 respuestas)</title><link>https://www.nevasport.com/phorum/read.php?48,5,5#msg-5</link><description>Pregunta</description><category>Meteorología y nieve</category><pubDate>Mon, 02 Nov 2026 09:00:00 +0100</pubDate></item>
<item><title>Ronda informativa [Temporada 2025-2026] (32 respuestas)</title><link>https://www.nevasport.com/phorum/read.php?48,4636698,4636698#msg-4636698</link><description>vieja</description><category>Meteorología y nieve</category><pubDate>Fri, 15 May 2026 12:45:42 +0200</pubDate></item>
</channel></rss>'''

NEWS = '''<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
<item><title>Primera nevada del otoño en Picos de Europa: la cota baja a 1.400 metros - El Comercio</title><link>https://news.google.com/rss/articles/CBMiAAA?oc=5</link><pubDate>Wed, 04 Nov 2026 07:00:00 GMT</pubDate><source url="https://www.elcomercio.es">El Comercio</source></item>
<item><title>Primera nevada del otoño en Picos de Europa: la cota baja a 1.400 metros - La Nueva España</title><link>https://news.google.com/rss/articles/CBMiBBB?oc=5</link><pubDate>Wed, 04 Nov 2026 06:00:00 GMT</pubDate><source url="https://www.lne.es">La Nueva España</source></item>
<item><title>Nieve en Sierra Nevada este fin de semana - Ideal</title><link>https://news.google.com/rss/articles/CBMiCCC?oc=5</link><pubDate>Wed, 04 Nov 2026 05:00:00 GMT</pubDate><source url="https://www.ideal.es">Ideal</source></item>
<item><title>Rescatan a dos montañeros en la canal de Trea, en Picos de Europa - El Diario Montañés</title><link>https://news.google.com/rss/articles/CBMiDDD?oc=5</link><pubDate>Mon, 02 Nov 2026 18:00:00 GMT</pubDate><source url="https://www.eldiariomontanes.es">El Diario Montañés</source></item>
<item><title>Noticia vieja de Asturias - LNE</title><link>https://news.google.com/rss/articles/CBMiEEE?oc=5</link><pubDate>Mon, 05 Oct 2026 18:00:00 GMT</pubDate><source url="https://www.lne.es">LNE</source></item>
</channel></rss>'''

posts = F.forum_posts(F.FORUMS[0], TIEMPO.encode())
threads = [p['thread'] for p in posts]
assert 'Galicia, Asturias, Cantabria y País Vasco. Noviembre de 2026.' in threads and 'Castilla y León. Noviembre de 2026.' in threads, threads
assert not any('Canarias' in t or 'Robiñera' in t for t in threads), 'fuera otras regiones y el Pirineo'
assert 'Ruta por los Lagos de Covadonga, 01/11/26' in threads, 'un reportaje que habla de Picos entra'
assert not any('Octubre' in t for t in threads), 'más de 10 días: fuera'
assert not any(p['url'].startswith('http:') for p in posts), 'solo enlaces https'
gal = next(p for p in posts if p['thread'].startswith('Galicia'))
assert gal['img'] == 'https://i.imgur.com/abc.jpg' and 'Oviedo' in gal['excerpt'] and '<' not in gal['excerpt']
cyl = next(p for p in posts if p['thread'].startswith('Castilla'))
assert 'citado' not in cyl['excerpt'] and cyl['excerpt'].startswith('Pues si'), cyl['excerpt']

nv = F.forum_posts(F.FORUMS[1], NEVA.encode())
names = [p['thread'] for p in nv]
assert names == ['Seguimiento resto de zonas [Temporada 2026-2027]', 'Ronda informativa [Temporada 2026-2027]', 'Nieve en San Isidro este puente?'], names
assert nv[1]['replies'] == 11 and nv[0]['excerpt'] is None, 'en hilos no se muestra el primer mensaje (son normas)'
assert F.forum_posts(F.FORUMS[2], NEVA.encode())[0]['thread'] == 'Nieve en San Isidro este puente?', 'Free & Ride: solo lo que nombra la Cordillera'

ns = F.dedupe_news(F.news_items('nieve', NEWS.encode()) + F.news_items('rescates', NEWS.encode()))
titles = [n['title'] for n in ns]
assert titles == ['Primera nevada del otoño en Picos de Europa: la cota baja a 1.400 metros', 'Rescatan a dos montañeros en la canal de Trea, en Picos de Europa'], titles
assert ns[0]['source'] == 'El Comercio' and ns[0]['domain'] == 'elcomercio.es' and 'nieve' in ns[0]['tags'] and 'montaña' in ns[0]['tags']
assert 'rescates' in ns[1]['tags']
assert F.text('a ' * 300).endswith('…') and len(F.text('a ' * 300)) <= 222
tw = F.dedupe_news([{'title': 'Rescatan en helicóptero a dos montañeros enriscados en el pico Arenizas, en Valdeón', 'source': 'ILEON', 'domain': 'ileon.eu', 'url': 'https://a', 'date': '2026-11-03T10:00:00+00:00', 'tags': ['rescates']},
                     {'title': 'Rescatan en helicóptero a dos montañeros atrapados en la cima del pico Arenizas', 'source': 'León 24 Horas', 'domain': 'leon24horas.com', 'url': 'https://b', 'date': '2026-11-03T09:00:00+00:00', 'tags': ['rescates', 'montaña']},
                     {'title': 'La borrasca trae nieve a Pajares', 'source': 'LNE', 'domain': 'lne.es', 'url': 'https://c', 'date': '2026-11-03T08:00:00+00:00', 'tags': ['nieve']}])
assert len(tw) == 2 and tw[0]['also'][0]['source'] == 'León 24 Horas' and 'montaña' in tw[0]['tags'] and 'also' not in tw[1], 'la misma historia en varios medios va junta'
print('Foros y noticias: zona, hilos de seguimiento, extractos sin citas, imágenes, fechas, etiquetas y duplicados.')
