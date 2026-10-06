"""Instantánea de incidencias de tráfico de la DGT (DATEX II) en el norte peninsular: nieve, hielo, cadenas, cortes,
obras y accidentes. Lee el Punto de Acceso Nacional (DATEX II v3) y, si falla, el servicio clásico de infocar (v1).
El formato se interpreta por nombres locales de etiqueta, así que sirve para ambas versiones."""
import datetime,gzip,json,pathlib,re,sys,urllib.request,xml.etree.ElementTree as ET
FEEDS=['https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml',
       'https://infocar.dgt.es/datex2/dgt/SituationPublication/all/content.xml']
# Asturias, Cantabria, León, Palencia, Burgos, Lugo y alrededores.
BBOX=(41.6,-7.7,44.0,-2.4)
DETAIL_TAGS={'poorEnvironmentType','environmentalObstructionType','roadMaintenanceType','winterEquipmentManagementType',
 'causeType','accidentType','obstructionType','roadOrCarriagewayOrLaneManagementType','abnormalTrafficType',
 'trafficConstrictionType','complianceOption','vehicleObstructionType','constructionWorkType','networkManagementType',
 'generalNetworkManagementType','roadworksType','detailedCauseType','weatherRelatedRoadConditionType','roadSurfaceConditionType'}
LEVELS={'verde':'verde','amarillo':'amarillo','rojo':'rojo','negro':'negro','green':'verde','yellow':'amarillo','red':'rojo','black':'negro'}
def local(tag):return tag.rsplit('}',1)[-1] if isinstance(tag,str) else ''
def xsi_type(el):
 for k,v in el.attrib.items():
  if local(k)=='type':return v.split(':')[-1]
 return ''
def texts(el,names):return [(c.text or '').strip() for c in el.iter() if local(c.tag) in names and (c.text or '').strip()]
def first(el,names):
 t=texts(el,names);return t[0] if t else ''
def num(s):
 try:return float(str(s).replace(',','.'))
 except ValueError:return None
def classify(rtype,details,blob):
 low=(rtype+' '+' '.join(details)+' '+blob).lower()
 if re.search(r'snowchain|snow ?chains|usesnowchains|cadena',low) or rtype=='WinterDrivingManagement':kind='chains'
 elif re.search(r'roadclosed|carriagewayclosures|closed|cortad|cerrad',low):kind='closed'
 elif re.search(r'snow|nieve|nevad',low):kind='snow'
 elif re.search(r'ice|hielo|helad|blackice|freezing',low):kind='ice'
 elif re.search(r'fog|niebla|visibility',low):kind='fog'
 elif re.search(r'accident|accidente|collision',low):kind='accident'
 elif re.search(r'maintenance|roadworks|construction|obras',low):kind='works'
 elif re.search(r'flood|inund|rockfall|landslide|desprend|obstruct',low):kind='obstruction'
 else:kind='other'
 m=re.search(r'nivel\s+(verde|amarillo|rojo|negro)|(verde|amarillo|rojo|negro)\b|\b(green|yellow|red|black)\b',low) if kind in ('chains','snow','ice','closed') else None
 level=LEVELS.get(next(g for g in m.groups() if g)) if m else ''
 return kind,level
def parse(raw):
 root=ET.fromstring(raw);out=[]
 for rec in root.iter():
  if local(rec.tag)!='situationRecord':continue
  coords=[];lats=[num(x) for x in texts(rec,{'latitude'})];lons=[num(x) for x in texts(rec,{'longitude'})]
  for la,lo in zip(lats,lons):
   if la is not None and lo is not None and -90<=la<=90 and -180<=lo<=180:coords.append((round(la,5),round(lo,5)))
  if not coords:continue
  inside=[c for c in coords if BBOX[0]<=c[0]<=BBOX[2] and BBOX[1]<=c[1]<=BBOX[3]]
  if not inside:continue
  rtype=xsi_type(rec);details=sorted(set(texts(rec,DETAIL_TAGS)))
  comments=[t for t in texts(rec,{'value'}) if len(t)>3]
  status=first(rec,{'validityStatus'})
  if status and status.lower() not in ('active','planned','definedbyvaliditytimespec'):continue
  kms=[n for n in (num(x) for x in texts(rec,{'kilometerPoint','referentPointDistance','pointNumericalValue'})) if n is not None]
  road=first(rec,{'roadNumber','roadName','roadIdentifier'})
  kind,level=classify(rtype,details,' '.join(comments))
  out.append({'id':rec.get('id') or '', 'type':rtype,'kind':kind,'level':level,'road':road[:40],
   'km':[round(kms[0],1),round(kms[-1],1)] if kms else [],
   'dir':first(rec,{'directionRelative','tpegDirection','directionBound','tpegDirectionRoad','direction'})[:30],
   'severity':first(rec,{'severity','overallSeverity'}),
   'start':first(rec,{'overallStartTime'}),'end':first(rec,{'overallEndTime'}),
   'updated':first(rec,{'situationRecordVersionTime','situationRecordCreationTime'}),
   'lat':coords[0][0],'lon':coords[0][1],'lat2':coords[-1][0],'lon2':coords[-1][1],
   'place':', '.join(dict.fromkeys(texts(rec,{'municipality','province','autonomousCommunity'})))[:120],
   'details':details[:6],'text':' · '.join(dict.fromkeys(comments))[:400]})
 seen=set();uniq=[]
 for x in out:
  key=(x['id'],x['lat'],x['lon'],x['kind'])
  if key in seen:continue
  seen.add(key);uniq.append(x)
 return uniq
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'TrailMeteo/12 (+https://github.com/drmariasanabria/trailmeteo)','Accept-Encoding':'gzip'})
 with urllib.request.urlopen(req,timeout=60) as r:
  raw=r.read(200*1024*1024)
  return gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw
if __name__=='__main__':
 dest=pathlib.Path(__file__).resolve().parents[1]/'data/dgt.json';errors=[]
 for url in FEEDS:
  try:
   incidents=parse(get(url))
   data={'fetched':datetime.datetime.now(datetime.timezone.utc).isoformat(),'complete':True,'source':url,'bbox':BBOX,'count':len(incidents),'incidents':incidents}
   dest.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
   print(f'DGT: {len(incidents)} incidencias en la zona ({url})');sys.exit(0)
  except Exception as e:errors.append(f'{url}: {e}')
 # Sin datos nuevos: se publica un estado explícito de fallo (la app lo muestra) en lugar de datos viejos sin aviso.
 dest.write_text(json.dumps({'fetched':datetime.datetime.now(datetime.timezone.utc).isoformat(),'complete':False,'errors':errors,'incidents':[]},ensure_ascii=False),encoding='utf-8')
 print('DGT no disponible:',*errors,sep='\n')
