import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("update_ai", Path(__file__).resolve().parent.parent / "scripts" / "update-ai.py")
ai = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ai)


def day(**k):
    base = {"dia": "2026-10-07", "tmin": 5, "tmax": 12, "lluvia_mm": 0, "prob": 0, "racha": 20, "codigo": 1, "isoterma_min": 3200, "cape_max": 0}
    base.update(k)
    return base


class PartRules(unittest.TestCase):
    def test_risks(self):
        self.assertEqual(ai.risk_of(day()), [])
        r = ai.risk_of(day(racha=75, lluvia_mm=14, cape_max=1200, isoterma_min=1800, tmin=-2))
        self.assertIn("Rachas muy fuertes en crestas", r)
        self.assertIn("Lluvia abundante", r)
        self.assertIn("Posibles tormentas por la tarde", r)
        self.assertTrue(any("1800 m" in x for x in r))
        self.assertIn("Heladas", r)

    def test_rules_text(self):
        data = {"previsiones": [{"zona": "Central", "dias": [day(), day(racha=80, lluvia_mm=40.2)]}]}
        p = ai.rules(data)
        self.assertEqual(p["titular"], "Buena ventana en Picos")
        self.assertEqual(len(p["resumen"]), 3)
        self.assertIn("40,2 mm", p["resumen"][1])
        self.assertTrue(p["resumen"][1].startswith("Mañana, exigente"))


class Normalize(unittest.TestCase):
    def test_variants(self):
        n = ai.normalize({"title": "Viento fuerte", "summary": "Hoy frío. Mañana lluvia. Ojo a crestas.", "risks": "Rachas"})
        self.assertEqual(n["titular"], "Viento fuerte")
        self.assertEqual(len(n["resumen"]), 3)
        self.assertEqual(n["riesgos"], ["Rachas"])
        self.assertIsNone(ai.normalize({"foo": 1}))
        self.assertEqual(ai.normalize({"titular": "T.", "resumen": ["Isoterma a 3400 m.."]})["resumen"], ["Isoterma a 3400 m."])
        self.assertEqual(ai.normalize({"parte": {"titular": "X", "resumen": ["a", "b", "c"]}})["titular"], "X")


class ParseJson(unittest.TestCase):
    def test_fenced_and_wrapped(self):
        self.assertEqual(ai.parse_json('```json\n{"a": 1}\n```'), {"a": 1})
        self.assertEqual(ai.parse_json('Aquí va: {"b": 2} y fin'), {"b": 2})
        self.assertEqual(ai.parse_json('{"c": 3}'), {"c": 3})


if __name__ == "__main__":
    unittest.main()
