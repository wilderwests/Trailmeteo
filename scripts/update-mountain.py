"""Fetch AEMET's public, attributed XML bulletins; no API key or proxy required."""
import concurrent.futures, datetime, html, json, pathlib, re, urllib.request, urllib.parse, xml.etree.ElementTree as ET
BASE='https://www.aemet.es'
ZONES={'peu1':'Picos de Europa','arn1':'Pirineo Aragonés','cat1':'Pirineo Catalán','nav1':'Pirineo Navarro','arn2':'Ibérica Aragonesa','rio1':'Ibérica Riojana','gre1':'Sierra de Gredos','nev1':'Sierra Nevada','mad2':'Guadarrama y Somosierra'}
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'TrailMeteo/3 (https://github.com/wilderwests/Trailmeteo)'})
 with urllib.request.urlopen(req,timeout=25) as r:return r.read()
def bulletin(item):
 code,name=item;page=BASE+'/es/eltiempo/prediccion/montana?p='+code
 try:
  source=get(page).decode('iso-8859-1');links=re.findall(r'href=[\"\']([^\"\']+\.xml)[\"\']',source);link=next(x for x in links if '/xml/montana/' in x and code in x)
  url=urllib.parse.urljoin(BASE,html.unescape(link));root=ET.fromstring(get(url));fields=[];places=[]
  for section in root.findall('seccion'):
   for a in section.findall('apartado'):fields.append({'section':section.get('nombre'),'key':a.get('nombre'),'title':a.findtext('cabecera',''),'text':' '.join(' '.join(a.itertext()).split()) if a.find('texto') is None else ''.join(a.find('texto').itertext()).strip()})
   for p in section.findall('lugar'):places.append({'name':p.get('nombre'),'elevation':p.get('altitud'),**{c.tag:c.text for c in p}})
  return {'code':code,'name':name,'url':page,'xml':url,'issued':root.findtext('elaborado'),'from':root.findtext('validez_ini'),'to':root.findtext('validez_fin'),'fields':fields,'places':places}
 except Exception as e:return {'code':code,'name':name,'url':page,'error':str(e)}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:zones=list(pool.map(bulletin,ZONES.items()))
 if not any(z.get('fields') for z in zones):raise SystemExit('No current bulletin obtained; retaining prior data')
 dest=pathlib.Path(__file__).resolve().parents[1]/'data/mountain.json';dest.parent.mkdir(exist_ok=True)
 dest.write_text(json.dumps({'fetched':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'AEMET','zones':zones},ensure_ascii=False,indent=2))
 print('AEMET bulletins:',sum(bool(z.get('fields')) for z in zones),'/',len(zones))
