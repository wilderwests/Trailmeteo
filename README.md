# TrailMeteo 02

PWA estática de meteorología de montaña para uso personal. Abre `index.html` desde un servidor HTTP/HTTPS o publica todos los archivos de la raíz en GitHub Pages.

## Funciones
- Tipografía grande, diseño adaptable, navegación por panorama, radar, GPX y fuentes.
- Búsqueda de localidades/coordenadas y geolocalización con permiso del navegador.
- Previsión horaria y ventanas de tres horas. Resumen por reglas, identificado como tal.
- Comparación ECMWF IFS, DWD ICON, NOAA GFS, Météo-France y ECCC GEM mediante Open-Meteo; MET Norway como segundo proveedor.
- Radar RainViewer: historial observado, reproducción precargada, opacidad, mapa oscuro/calles, cobertura, centrado y vista ampliada.
- GPX con namespaces, tracks/rutas, varios segmentos, validación de coordenadas, altitudes cero y límites de tamaño. Distancia completa, filtro de desnivel de 3 m, perfil y hasta 16 sectores meteorológicos.
- ETA calculada con distancia y desnivel acumulados del track completo. Horas meteorológicas en UTC; presentación por zona horaria. No se extrapola fuera del horizonte.
- IA local: usa LanguageModel si está disponible; activación de WebLLM/Qwen2.5-0.5B en WebGPU como alternativa. Sin cuentas ni claves. La descarga inicial ocupa cientos de MB y puede fallar por incompatibilidad o memoria. La IA puede equivocarse.
- Caché de interfaz propia; no se guardan indefinidamente imágenes de radar ni respuestas meteorológicas mediante el service worker. Copia de última previsión identificada si falla la conexión.

## Límites reales
Los modelos no certifican seguridad en montaña. La concordancia no se convierte en un porcentaje inventado de confianza. El radar público RainViewer tiene zoom nativo máximo 7 y mosaicos cada 10 minutos; no ofrece una garantía de disponibilidad. Las zonas vacías no equivalen a cielo despejado. El GPX necesita altitudes para estimar desnivel y penalización de ascenso. Las ventanas no evalúan terreno, luz solar o preparación personal. Las fuentes gratuitas tienen límites de uso.

## Datos y licencias
- Open-Meteo, uso personal/no comercial: https://open-meteo.com/en/terms ; datos CC BY 4.0.
- MET Norway: https://api.met.no/doc/TermsOfService ; CC BY 4.0. Puede compartir modelos de origen con otros proveedores. Viento medio y rachas separados.
- RainViewer: https://www.rainviewer.com/api/weather-maps-api.html ; uso personal/educativo y atribución.
- OpenStreetMap: https://www.openstreetmap.org/copyright ; CARTO: https://carto.com/attributions
- Leaflet 1.9.4: https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE ; BSD-2-Clause.
- WebLLM: https://webllm.mlc.ai/ ; Qwen: https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC

No se envía el GPX completo a un servidor. La consulta meteorológica envía coordenadas de sectores a Open-Meteo. La IA local no recibe credenciales ni envía la ruta a un proveedor de IA.

## Verificación
Pruebas de cálculo (`tests/core.test.cjs`) y pruebas de integración con DOM simulado (`tests/integration.mjs`, happy-dom y xmldom). Incluyen ceros, nulos, tormenta, fecha fuera de rango, 10.001 puntos, discontinuidades, namespaces, GPX malformado, importación, 16 sectores y falta de conexión. Además se comprueban respuestas reales de las APIs y de imágenes radar. Estas pruebas no equivalen a una validación de campo ni a pruebas en todos los móviles.
