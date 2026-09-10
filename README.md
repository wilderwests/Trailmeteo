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


## Actualización 3
Mapa base OpenStreetMap sin clave, interfaz clara y tipografía ampliada, previsión diaria de siete días, amanecer/ocaso, UV e isoterma cero.

La pestaña Montaña incorpora los XML públicos de AEMET, con atribución y fecha de validez. Un workflow consulta nueve zonas cada hora y publica el resultado en Pages. Algunas zonas pueden no tener boletín en la temporada actual; la app indica la ausencia y no realiza el cruce. La comparación de precipitación con los modelos es por reglas, exige datos del mismo día y comprueba proximidad aproximada, no límites oficiales. Las fuentes pueden compartir datos. La IA generativa local sigue siendo opcional y depende del navegador.

## Versión 4: planificador y fuentes por tramo

La pantalla de inicio incluye un menú, accesos a todas las secciones y una ilustración cartográfica animada que respeta la preferencia de movimiento reducido. Las funciones anteriores se conservan.

- Recorrido coloreado según hasta 16 muestras meteorológicas a la hora de paso. Perfil GPX, isoterma cero y temperatura; lectura seleccionable por punto.
- Comparación de salidas desde −4 hasta +12 horas, cada 2 horas, con llegada, datos disponibles, puntos exigentes, máximos de lluvia/rachas y luz solar. No calcula una probabilidad ni certifica seguridad.
- Tres modelos por muestra (ECMWF IFS, ICON y GFS, vía Open-Meteo). Los rangos no son intervalos de confianza.
- Avisos AEMET CAP: se descarga el estado completo de España y se cruza la geometría del GPX y sus horas con los polígonos y periodos. Sin unir segmentos separados. Se excluyen mensajes Test/Cancel/Minor. La copia mayor de 2 h se marca antigua; no se descartan avisos por ausencia de intersecciones. El workflow consulta cada hora y puede retrasarse.
- Progreso manual o GPS en primer plano; recalcula el ritmo y la llegada. No funciona como seguimiento permanente con el teléfono bloqueado. No envía ubicación a contactos. ETA simplificada: ritmo en llano y ascenso; no modela terreno técnico ni futuras paradas.
- Rutas favoritas en IndexedDB, comparación de hasta seis rutas, importación múltiple GPX, parte HTML autónomo y copia JSON. El guardado incluye solo datos ya obtenidos; se muestra si falta cartografía. No se precargan tiles de OSM. El mapa offline dibuja geometrías vectoriales de caminos y GPX, sin relieve ni curvas de nivel. Las copias pueden desaparecer si se borra el almacenamiento del navegador; la exportación permite respaldo.
- Ortofotos PNOA del IGN como opción de mapa (España). No se presentan como satélite meteorológico ni como información actual del suelo o la nieve. Radar RainViewer con ruta superpuesta. Rayos, satélite meteorológico y boletines de aludes mantienen acceso a las páginas oficiales AEMET, sin fabricar capas.

### Tecnicidad: alcance verificable

La ruta se divide en tramos de aproximadamente 250 m. Overpass consulta caminos dentro de la envolvente del recorrido (máximo 150 km / 1.800 km²); el cliente busca geometrías a menos de 25 m de tres muestras por tramo. Un candidato único sigue siendo solo una coincidencia cartográfica. Los cruces y caminos paralelos se muestran como ambiguos. No se atribuye dificultad a tramos sin datos.

Se exponen las etiquetas originales `sac_scale`, `surface`, `trail_visibility`, acceso, anchura, pasamanos, vía ferrata, etc., con enlace al objeto y fecha de edición. La pendiente neta del GPX no se transforma en un grado técnico. El manual de escalas SAC explica los criterios generales, no verifica un itinerario. Wikiloc no ofrece API pública; la app no extrae reseñas ni afirma haberlas consultado. Pueden añadirse varias referencias por intervalo (Wikiloc, manual, federación, observación propia) con autor, fecha y descripción; son aportaciones del usuario sin verificación automática. No se promedian opiniones para producir una dificultad.

### Fuentes y acceso

- AEMET CAP: https://www.aemet.es/es/rss_info/avisos/esp
- OSM / SAC: https://wiki.openstreetmap.org/wiki/Key:sac_scale
- Manual SAC: https://www.sac-cas.ch/en/ausbildung-und-sicherheit/tourenplanung/grading-systems/
- Wikiloc API: https://help.wikiloc.com/article/102-api-for-developers
- Política de mosaicos OSM: https://operations.osmfoundation.org/policies/tiles/
- Ortofotos IGN: https://pnoa.ign.es/pnoa-imagen/ortofotos-pnoa-maxima-actualidad

La geolocalización se usa localmente; las coordenadas meteorológicas se envían a Open-Meteo y la envolvente de la ruta a Overpass. El contacto se guarda solo en el dispositivo y en las exportaciones que pida el usuario. No hay claves privadas. La IA local opcional conserva sus requisitos de navegador y descarga; los resúmenes automáticos por reglas funcionan sin ella.

### Validación

`npm test` comprueba regresiones originales, geometría y temporalidad CAP, ausencia de datos, ambigüedad de caminos, composición de todos los módulos, navegación, almacenamiento, recuperación y comparación offline. `python3 tests/alerts.test.py` comprueba el lector CAP. Los escenarios automatizados usan datos controlados; no sustituyen pruebas sobre terreno ni garantizan continuidad de las APIs gratuitas.
