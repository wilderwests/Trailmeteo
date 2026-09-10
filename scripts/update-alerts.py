"""Snapshot complete public AEMET CAP state without retaining historical cancellations."""
import datetime,io,json,pathlib,tarfile,urllib.request,xml.etree.ElementTree as ET
FEED='https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/rss/CAP_AFAE_ATOM.xml'
NS={'a':'http://www.w3.org/2005/Atom','c':'urn:oasis:names:tc:emergency:cap:1.2'}
def get(url):
 if not url.startswith('https://www.aemet.es/'):raise ValueError('Unexpected source')
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'TrailMeteo/4'}),timeout=35) as r:return r.read(20*1024*1024)
def parse_cap(raw):
 root=ET.fromstring(raw)
 def txt(node,key):return node.findtext('c:'+key,'',NS)
 if txt(root,'status')!='Actual' or txt(root,'msgType')=='Cancel':return []
 infos=root.findall('c:info',NS);spanish=[x for x in infos if txt(x,'language').lower().startswith('es')];out=[]
 for info in spanish or infos[:1]:
  if txt(info,'severity') in ('Minor','Unknown'):continue
  for area in info.findall('c:area',NS):
   polygons=[]
   for p in area.findall('c:polygon',NS):
    try:polygons.append([[float(n) for n in pair.split(',')] for pair in p.text.split()])
    except (ValueError,AttributeError):continue
   out.append({'id':txt(root,'identifier'),'sent':txt(root,'sent'),'event':txt(info,'event'),'severity':txt(info,'severity'),'onset':txt(info,'onset') or txt(info,'effective'),'expires':txt(info,'expires'),'headline':txt(info,'headline'),'description':txt(info,'description'),'instruction':txt(info,'instruction'),'area':txt(area,'areaDesc'),'polygons':polygons,'url':txt(info,'web') or 'https://www.aemet.es/es/eltiempo/prediccion/avisos'})
 return out
if __name__=='__main__':
 dest=pathlib.Path(__file__).resolve().parents[1]/'data/alerts.json'
 try:
  feed=ET.fromstring(get(FEED));url=next(x.get('href') for x in feed.findall('a:entry/a:link',NS) if x.get('href','').endswith('.tar.gz'));alerts=[]
  with tarfile.open(fileobj=io.BytesIO(get(url)),mode='r:gz') as archive:
   files=[m for m in archive.getmembers() if m.isfile() and m.name.endswith('.xml')]
   if not files:raise ValueError('Empty CAP archive')
   for member in files:
    if member.size>5*1024*1024:raise ValueError('Oversized CAP')
    alerts.extend(parse_cap(archive.extractfile(member).read()))
  data={'fetched':datetime.datetime.now(datetime.timezone.utc).isoformat(),'updated':feed.findtext('a:updated','',NS),'complete':True,'source':FEED,'alerts':alerts}
  dest.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));print('AEMET CAP:',len(alerts),'alerts')
 except Exception as e:
  if not dest.exists():dest.write_text(json.dumps({'complete':False,'alerts':[],'error':'No se pudo consultar AEMET'}))
  print('Retaining previous alert snapshot:',type(e).__name__)
