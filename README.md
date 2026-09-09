# TrailMeteo PWA

PWA mobile-first para iPhone orientada a trail running.

## Incluye
- búsqueda geográfica y GPS
- forecast horario
- Trail Score 0–100
- ventanas óptimas para correr
- comparación ECMWF / ICON / GFS / GEM
- radar animado RainViewer
- importación GPX
- cálculo de distancia y desnivel
- ETA por tramo configurable por ritmo y ascenso
- consulta meteorológica a lo largo de la ruta
- búsqueda de mejor hora de salida
- almacenamiento local de claves opcionales
- service worker para shell offline

## Servir
Una PWA necesita HTTPS (o localhost). Para desarrollo: cualquier servidor estático. Para iPhone, súbela a GitHub Pages, Cloudflare Pages, Netlify, Vercel o un hosting HTTPS.

## Fuentes
Open-Meteo (forecast, geocoding y modelos); RainViewer (radar). AEMET OpenData y meteoblue requieren integración con credenciales; para una publicación pública conviene un backend/proxy para no exponer claves.
