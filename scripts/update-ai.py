#!/usr/bin/env python3
"""Parte de montaña redactado por IA para Picos de Europa: data/ai-parte.json.

Lo ejecuta GitHub Actions en cada despliegue. Usa GitHub Models con el GITHUB_TOKEN del
workflow (gratuito, sin claves propias). Si no hay token o el servicio falla, redacta el
parte con reglas a partir de los mismos datos, para que la app siempre tenga uno.
Solo usa la librería estándar.
"""
import json
import os
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "ai-parte.json"
POINTS = [
    ("Macizo Central (Fuente Dé · Urriellu)", 43.18, -4.82),
    ("Macizo Occidental (Covadonga · Vega de Ario)", 43.25, -4.98),
    ("Desfiladero del Cares (Poncebos · Caín)", 43.25, -4.85),
]
MODELS = ["openai/gpt-4.1-mini", "openai/gpt-4o-mini"]
UA = {"User-Agent": "TrailMeteo/13 (+https://github.com)"}


def get_json(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def forecast():
    lats = ",".join(str(p[1]) for p in POINTS)
    lons = ",".join(str(p[2]) for p in POINTS)
    url = (
        "https://api.open-meteo.com/v1/forecast?latitude=" + lats + "&longitude=" + lons
        + "&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,"
        "wind_gusts_10m_max,weather_code,sunrise,sunset&hourly=freezing_level_height,cape"
        "&timezone=Europe%2FMadrid&forecast_days=3"
    )
    data = get_json(url)
    if isinstance(data, dict):
        data = [data]
    out = []
    for (name, lat, lon), d in zip(POINTS, data):
        days = []
        dd = d.get("daily", {})
        hh = d.get("hourly", {})
        for i, day in enumerate(dd.get("time", [])):
            fl = [v for t, v in zip(hh.get("time", []), hh.get("freezing_level_height", [])) if t.startswith(day) and v is not None]
            cape = [v for t, v in zip(hh.get("time", []), hh.get("cape", [])) if t.startswith(day) and v is not None]
            days.append({
                "dia": day,
                "tmin": dd["temperature_2m_min"][i], "tmax": dd["temperature_2m_max"][i],
                "lluvia_mm": dd["precipitation_sum"][i], "prob": dd["precipitation_probability_max"][i],
                "racha": dd["wind_gusts_10m_max"][i], "codigo": dd["weather_code"][i],
                "isoterma_min": min(fl) if fl else None, "cape_max": max(cape) if cape else None,
                "amanecer": (dd.get("sunrise") or [None] * 9)[i], "ocaso": (dd.get("sunset") or [None] * 9)[i],
            })
        out.append({"zona": name, "lat": lat, "lon": lon, "dias": days})
    return out


def aemet():
    try:
        d = json.loads((DATA / "mountain.json").read_text("utf-8"))
        z = next((z for z in d.get("zones", []) if z.get("code") == "peu1"), None) or (d.get("zones") or [None])[0]
        if not z:
            return None
        return {"zona": z.get("name"), "valido_desde": z.get("from"), "emitido": z.get("issued"),
                "campos": {f["title"]: f["text"][:400] for f in z.get("fields", [])[:10]}}
    except Exception:
        return None


def dgt():
    try:
        d = json.loads((DATA / "dgt.json").read_text("utf-8"))
        inc = d.get("incidents", [])
        snow = [i for i in inc if any(k in json.dumps(i, ensure_ascii=False).lower() for k in ("nieve", "cadena", "hielo", "snow", "chain"))]
        return {"incidencias": d.get("count", len(inc)), "nieve_o_cadenas": len(snow)}
    except Exception:
        return None


def risk_of(day):
    r = []
    if (day.get("racha") or 0) >= 60:
        r.append("Rachas muy fuertes en crestas")
    elif (day.get("racha") or 0) >= 40:
        r.append("Viento en zonas expuestas")
    if (day.get("lluvia_mm") or 0) >= 10:
        r.append("Lluvia abundante")
    elif (day.get("lluvia_mm") or 0) >= 1:
        r.append("Lluvia y roca mojada")
    if (day.get("cape_max") or 0) >= 800 or (day.get("codigo") or 0) >= 95:
        r.append("Posibles tormentas por la tarde")
    if day.get("isoterma_min") is not None and day["isoterma_min"] < 2400:
        r.append(f"Isoterma 0 °C hacia {int(day['isoterma_min'])} m: hielo en cotas altas")
    if (day.get("tmin") or 10) <= 0:
        r.append("Heladas")
    return r


def rules(data):
    central = data["previsiones"][0]["dias"]
    hoy, man = central[0], central[1] if len(central) > 1 else central[0]

    def line(d):
        rs = risk_of(d)
        state = "exigente" if any("muy fuertes" in x or "abundante" in x or "tormentas" in x for x in rs) else ("con precauciones" if rs else "favorable")
        mm = f"{d['lluvia_mm']:.1f}".replace(".", ",")
        return f"{state.capitalize()}: {d['tmin']:.0f}–{d['tmax']:.0f} °C, rachas {d['racha']:.0f} km/h, lluvia {mm} mm" + (f". {rs[0]}." if rs else ".")

    rs = risk_of(hoy)
    titular = ("Día exigente en Picos" if len(rs) >= 2 else "Día con precauciones en Picos" if rs else "Buena ventana en Picos")
    return {
        "titular": titular,
        "resumen": [line(hoy), "Mañana, " + line(man)[0].lower() + line(man)[1:], "Revisa el boletín de AEMET y el estado de la carretera antes de salir."],
        "riesgos": rs[:4],
        "consejo": "Madruga: las condiciones suelen empeorar por la tarde en montaña." if rs else "Aprovecha la ventana, sin olvidar frontal y capa de abrigo.",
    }


def parse_json(text):
    """Acepta JSON puro, envuelto en ```json … ``` o con texto alrededor."""
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t[3:]
        t = t.rsplit("```", 1)[0]
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        i, j = t.find("{"), t.rfind("}")
        if i >= 0 and j > i:
            return json.loads(t[i:j + 1])
        raise


def ask_models(data, token):
    system = (
        "Eres un meteorólogo y guía de montaña de Picos de Europa. Redacta un parte breve, concreto y útil para "
        "excursionistas a partir SOLO de los datos JSON. No inventes cifras. Español de España. "
        "Devuelve JSON con: titular (máx. 70 caracteres), resumen (lista de exactamente 3 frases cortas: hoy, mañana, "
        "y la clave del día), riesgos (lista de 0-4 frases cortas), consejo (una frase), mejor_momento (frase corta)."
    )
    body = {
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": json.dumps(data, ensure_ascii=False)[:12000]}],
        "temperature": 0.3, "max_tokens": 700, "response_format": {"type": "json_object"},
    }
    last = None
    for model in MODELS:
        try:
            req = urllib.request.Request(
                "https://models.github.ai/inference/chat/completions",
                data=json.dumps({**body, "model": model}).encode("utf-8"),
                headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json", **UA},
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.loads(r.read().decode("utf-8"))
            text = d["choices"][0]["message"]["content"] or ""
            parsed = parse_json(text)
            if parsed.get("titular") and isinstance(parsed.get("resumen"), list):
                return model, parsed
        except Exception as e:  # noqa: BLE001 - se informa y se prueba el siguiente
            last = f"{model}: {e}" + (f" · respuesta: {text[:160]!r}" if "text" in locals() and text else "")
    raise RuntimeError(f"GitHub Models no disponible: {last}")


def main():
    now = datetime.now(timezone.utc)
    try:
        data = {"generado": now.isoformat(), "previsiones": forecast(), "aemet": aemet(), "dgt": dgt()}
    except Exception as e:  # noqa: BLE001
        print(f"Parte IA: sin previsión ({e}); se omite")
        return 0
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_MODELS_TOKEN")
    source, model = "reglas", None
    parte = rules(data)
    if token:
        try:
            model, parte = ask_models(data, token)
            source = "github-models"
        except Exception as e:  # noqa: BLE001
            print(f"Parte IA: {e}; uso reglas")
    out = {"generated": now.isoformat(), "valid_until": (now + timedelta(hours=6)).isoformat(), "source": source,
           "model": model, "zone": "Picos de Europa", **parte,
           "data": {"zonas": [{"zona": p["zona"], "hoy": p["dias"][0]} for p in data["previsiones"]]}}
    DATA.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), "utf-8")
    print(f"Parte IA: {source}{' · ' + model if model else ''} · «{out['titular']}»")
    return 0


if __name__ == "__main__":
    sys.exit(main())
