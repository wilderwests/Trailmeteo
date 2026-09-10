import importlib.util,pathlib,unittest
spec=importlib.util.spec_from_file_location('alerts',pathlib.Path(__file__).parents[1]/'scripts/update-alerts.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class CAP(unittest.TestCase):
 def test_actual_spanish_and_geometry(self):
  raw=b'<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><status>Actual</status><msgType>Alert</msgType><identifier>x</identifier><info><language>es-ES</language><event>Lluvia</event><severity>Severe</severity><onset>2026-09-10T10:00:00+02:00</onset><expires>2026-09-10T12:00:00+02:00</expires><area><areaDesc>Zona</areaDesc><polygon>43,-4 43.1,-4 43,-4.1 43,-4</polygon></area></info></alert>'
  result=mod.parse_cap(raw);self.assertEqual(result[0]['polygons'][0][0],[43,-4]);self.assertEqual(result[0]['event'],'Lluvia');self.assertEqual(mod.parse_cap(raw.replace(b'Actual',b'Test')),[]);self.assertEqual(mod.parse_cap(raw.replace(b'<msgType>Alert',b'<msgType>Cancel')),[]);self.assertEqual(mod.parse_cap(raw.replace(b'Severe',b'Minor')),[])
if __name__=='__main__':unittest.main()
