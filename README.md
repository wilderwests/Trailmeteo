# TrailMeteo 14

**https://wilderwests.github.io/Trailmeteo/** · PWA estática de meteorología y planificación de rutas de montaña. Abre `index.html` desde un servidor HTTP/HTTPS o publica todos los archivos de la raíz en GitHub Pages.

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

## Versión 5: Qwen y documentación
Qwen local se reutiliza entre plan de ruta, evidencias cartográficas, boletín AEMET y documentación. Generación solo al pulsar, exclusión mutua con la IA anterior y caché de 12 explicaciones para datos idénticos. El texto generado puede equivocarse y se separa de la documentación original. No consume créditos de Codex al funcionar en el dispositivo del visitante.

Primera ficha revisada: Canal de Trea, con resúmenes atribuidos al refugio Vega de Ario, una reseña Wikiloc y un aviso histórico del Parque. Selección por nombre, no identidad geográfica del GPX. Las rutas sin ficha pueden buscar contexto enciclopédico mediante la API pública de Wikipedia; no equivale a búsqueda web universal ni a una reseña técnica. Las fichas no se actualizan automáticamente, conservan fecha de revisión y límites.

## Versión 8: interfaz HUD, Wikiloc, canales y copiloto IA
- **Arranque y navegación**: pantalla de inicio animada con sonido (Web Audio sintetizado, sin archivos; botón para silenciar) que entra directamente al planificador. Menú inferior fijo en móvil con iconos: Ruta, Tiempo, Radar, Montaña, Canales, Modelos.
- **Diseño**: tema oscuro futurista, tipografía grande (Space Grotesk / Inter), animaciones que respetan «reducir movimiento». Fondos fotográficos difuminados de Wikimedia Commons, elegidos por sección, con autor y licencia visibles en el pie. Si no cargan, se usa un fondo generado.
- **Wikiloc**: búsqueda de rutas públicas (DuckDuckGo vía Jina Reader). Al cargar una ruta se intenta leer su trazado de la página pública y se añaden altitudes del modelo digital (Open-Meteo). Wikiloc no tiene API pública: si exige sesión, la app guía la descarga del GPX en 3 pasos. También admite enlaces directos a `.gpx`.
- **Canales del Cares**: guía visual con 15 fichas, filtros por sector, agua, trepada y duración, buscador, perfil de cotas citadas, pasos delicados, itinerario paso a paso, mapa de referencias (Nominatim), fuentes para contrastar e investigación IA del estado actual. Trea incluye la documentación complementaria fechada (refugio, reseña de 2026, avisos del Parque tras el incendio de 2025). El texto íntegro de 2003 se conserva debajo.
- **Copiloto IA** (botón ✦): chat con el contexto real de la app (previsión, ruta y sectores, salidas alternativas, avisos, boletín AEMET, canal abierta, fuentes web recuperadas). Incluye atajos, dictado y lectura por voz. Usa **Gemini mediante Firebase AI Logic** (gratuito, con búsqueda en Google y fuentes citadas) si se configura en `firebase-config.js` o en ⚙ Ajustes del copiloto. Si no, recurre a un servicio comunitario gratuito (Pollinations); como opción queda la IA en el dispositivo. Los botones de explicación existentes usan el mismo motor.
- **Semáforo GO / OJO / STOP**, **mochila según la previsión** (agua, luz, impermeable, isoterma frente a la cota máxima…) y **compartir plan**.
- Pruebas nuevas: `tests/v8.mjs`.

## Versión 9: diseño claro y modo «En ruta» para alta montaña
- **Diseño**: claro y limpio, sin recuadros: secciones separadas por líneas finas, cifras grandes tipo instrumento, curvas de nivel animadas, foto difuminada en la cabecera, aparición al desplazar, contadores animados, onda al pulsar y menú inferior con 5 accesos (Ruta, En ruta, Tiempo, Radar, Más). Temas **Día**, **Noche** (rojo, conserva la visión nocturna y ahorra batería en OLED) y **Sol** (máximo contraste). Botón **SOS** fijo en la barra superior.
- **En ruta** (`field.js`, cálculos en `field-core.js` sin conexión):
  - Cabina GPS: altitud, recorrido hecho y restante, llegada estimada con el ritmo real, luz restante, distancia al track, desnivel, tiempo en marcha y ritmo.
  - Avisos con sonido y vibración: fuera de ruta (umbral configurable), hora de retorno y vigilancia meteorológica cada 20 minutos en tu posición (tormenta, rachas, lluvia intensa). Pantalla siempre encendida (Wake Lock).
  - Hora límite de retorno (ida y vuelta o travesía), con margen antes del ocaso. Sol, crepúsculo, hora dorada y fase lunar calculados en el dispositivo.
  - Brújula (sensor del teléfono o rumbo GPS) que apunta al inicio, al final o a puntos guardados (coche, cruce…).
  - Contador relámpago-trueno con distancia, tendencia y pautas de la regla 30/30.
  - Grabación del track con recuperación si se cierra la web, exportación GPX y opción de usarlo como ruta.
  - SOS: coordenadas en grados, UTM y GMS, llamada al 112, SMS con la posición, compartir, silbato y luz SOS en morse, y ficha para el rescate guardada solo en el dispositivo.
- **Agua y refugios** (`pois.js`): fuentes, puntos de agua y refugios de OpenStreetMap a menos de 400 m del track, con su kilómetro, tramo más largo sin agua y marcadores en los mapas. Se guardan con la ruta.
- Límite: con el teléfono bloqueado, iOS pausa el GPS de las webs; el seguimiento funciona con la app en primer plano.
- Pruebas nuevas: `tests/field.test.cjs` (sol, UTM, rumbos, retorno, luna, track) y comprobaciones v9 en `tests/v8.mjs`.

## Versión 10: planificar y decidir, con atmósfera
Se retiran las funciones para usar durante la marcha (seguimiento GPS, grabación de track, brújula y SOS). La app se centra en **decidir antes de salir**.
- **Estética**: clara y sin recuadros. Unbounded (titulares), IBM Plex Sans (texto) e IBM Plex Mono (datos); auroras difuminadas, grano fino, botones de cristal con borde iridiscente, apariciones con desenfoque y dock flotante. Navegación: **Planificar · Cielo · Terreno · Canales · Más**. Cielo agrupa previsión, radar, modelos y AEMET.
- **Mapa de la semana** (`week.js`): calendario día × hora de salida para tu ruta, valorado con la previsión en cada sector, la luz y tu ritmo. Mejores ventanas destacadas; al tocar una casilla se replanifica.
- **Mar de nubes** (`sky.js`): base y techo de la capa nubosa por niveles de presión (Open-Meteo), comparados con tu cota; diagrama y evolución en 24 h.
- **Terreno** (`relief.js`): sol y sombra por sector a tu hora de paso con pendiente, orientación y horizonte reales (MDT Copernicus 90 m); riesgo de hielo y de calor; lluvia y nieve de 72 h, heladas, isoterma y cota de nieve aproximada; agua y refugios.
- **Tu ritmo real** (`pace.js`): ajusta min/km y min/100 m a partir de un GPX tuyo con tiempos.
- **Ensayo 3D** (`flyover.js`): vuelo sobre el relieve (MapLibre + AWS Terrain Tiles, ortofoto PNOA) con hora de paso y previsión de cada sector.
- **Parte para el grupo** (`card.js`): imagen vertical con ruta, hora, semáforo, cifras, perfil coloreado, material y avisos.
- **Canales de los tres macizos** (`canales.js`): catálogo de OpenStreetMap agrupado en Occidental, Central y Oriental. Ficha con mapa IGN (topográfico, ortofoto u OSM), perfil real, longitud, desnivel y pendiente máxima. Incluye accesos por abajo y por arriba (lugares, collados, refugios, pueblo y aparcamiento más cercanos), caminos que la cruzan con su km y dificultad, enlaces con otras canales, agua, horas de sol dentro de la canal para un día concreto, previsión, vuelo 3D, planificación y estado actual con IA. Las 15 fichas del Cares (Pyrenaica 2003) se integran en su canal.

## Versión 11: cine de montaña, nieve, más modelos y cuentas
Se retiran los avisos de mastines compartidos.
- **Estética**: clara y limpia. Archivo (ancho variable) y JetBrains Mono. Detrás, fotografías propias de Picos (`img/`: mar de nubes desde una canal, niebla en la cresta y nieve recién caída; sin metadatos ni GPS) difuminadas con un lento movimiento de cámara, grano fino y **partículas en tiempo real** (`fx.js`): nieve con profundidad de campo, lluvia, niebla o motas de luz según el tiempo actual del lugar, con ráfagas de viento. Respeta «reducir movimiento» y se pausa en segundo plano.
- **Sonido**: síntesis Web Audio con sala (reverberación generada), nuevos efectos y **viento ambiente** opcional (Más → Viento ambiente).
- **Más modelos** (`modelsx.js`): además de ECMWF, ICON, GFS, Météo-France, GEM y MET Norway, se añaden UK Met Office, JMA, CMA, BOM, ECMWF AIFS (IA), AROME 1,5 km y HARMONIE, pedidos uno a uno para que un fallo no tumbe al resto. **Conjuntos** ECMWF ENS (51), GFS ENS (31) e ICON EPS (40): abanico P10–P90 de temperatura, probabilidad de lluvia y de rachas ≥ 50 km/h, con la franja de tu ruta. **Meteograma multimodelo** de 72 h con mediana.
- **Nieve** (`snow.js`, en Terreno): espesor actual, nevada de los últimos 7 días y de los próximos 7 a la cota máxima de tu ruta, horas de fusión, **cota de nieve hora a hora** frente a tus cotas, **nieve sector a sector** a tu hora de paso, y **satélite** NASA GIBS (MODIS/VIIRS color real y cubierta de nieve NDSI) con selector de día. En la ficha de cada canal: nieve en su parte alta.
- **Más fuentes de rutas** (`trails.js`): senderos señalizados GR/PR/SL de OpenStreetMap con trazado completo cargable, enlaces a Waymarked Trails, y búsqueda en Komoot, Outdooractive y AllTrails.
- **Canales**: en la ficha, senderos señalizados que la recorren, tracks de Wikiloc superpuestos en el mapa y planificables, **pendiente coloreada** sobre el trazado con marcas de kilómetro, capa OpenTopoMap y capa de senderos PR·GR.
- **Cuentas opcionales** (`account.js`): entra con Google para guardar tus rutas en la nube y sincronizarlas entre dispositivos, o usa la app **sin registrarte** (todo se guarda en el dispositivo).
- **Buzón de sugerencias y contacto** (`contact.js`): Más → Buzón y contacto, y pie de página. Envía por correo a mariawilderwest@gmail.com y, si Firebase está configurado, también lo guarda en Firestore.

### Activar las cuentas (gratis, plan Spark)
1. Firebase → Authentication → Sign-in method → activa **Google**.
2. Authentication → Settings → Dominios autorizados → añade el dominio de GitHub Pages (`wilderwests.github.io`).
3. Firestore Database → crear (modo producción) y pega estas reglas:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{db}/documents {
      match /users/{uid}/routes/{id} {
        allow read, delete: if request.auth != null && request.auth.uid == uid;
        allow create, update: if request.auth != null && request.auth.uid == uid
          && request.resource.data.poly is string && request.resource.data.poly.size() < 600000;
      }
      match /feedback/{id} {
        allow create: if request.resource.data.keys().hasOnly(['type','message','email','at','uid','page','ua'])
          && request.resource.data.message is string && request.resource.data.message.size() < 4000;
      }
    }
  }
  ```
4. La misma configuración web de Firebase del Copiloto (`firebase-config.js` o Copiloto → ⚙ Ajustes) sirve para las cuentas.

## Versión 14: revista de montaña, menú completo, instrucciones y combustible

- **Estilo «revista de montaña»**: títulos en Source Serif 4, texto en Source Sans 3, maquetación editorial con líneas finas en lugar de cajas y la fotografía de fondo.
- **Bienvenida sin adornos** (sin los círculos): qué hace la app en tres líneas (Decide · Contrasta · Prepárate).
- **Portada** que explica la app en cuatro pasos y todo lo que incluye.
- **Menú superior con todas las opciones**, agrupadas (Ruta · Tiempo · Montaña · Ayuda), y el menú ☰ completo en el móvil.
- **Planificar**: primero «Importa tu GPX» (recomendado) y después «¿No tienes el GPX? Búscala», con una nota que explica por qué es mejor el GPX. Se elimina la ruta a medida entre dos puntos.
- **Resumen de resultados agrupado**: Recorrido · Duración · Meteorología en ruta · Agua. La mejor salida solo propone horas con luz (06:00–16:00).
- **Instrucciones**: guía completa de todas las secciones (`shell.js`).
- **Combustible** (`fuel.js`): busca alimentos por nombre y marca con los datos reales de **Open Food Facts** (por ejemplo «pan Bimbo natural» o «membrillo Hacendado»), añade cantidades y suma energía, hidratos, azúcares, fibra, proteínas, grasas, sal y micronutrientes. Lo compara con lo que pide tu salida (hidratos y sodio por hora, agua, gasto estimado según peso e intensidad). Incluye básicos sin marca, lector de código de barras (si el navegador lo admite) y respuestas del copiloto sobre comida.
- **Ensayo 3D**: arreglado. El contenedor del mapa no tenía altura y además la ruta solo se dibujaba cuando cargaban todas las teselas. Ahora se dibuja en cuanto el estilo está listo, sobre la imagen de satélite de Esri, y la ortofoto del IGN queda de respaldo.
- **Gemini**: se usan los modelos vigentes (`gemini-flash-lite-latest` y siguientes); si uno da error de cuota se prueba el siguiente. Firebase AI Logic tiene App Check aplicado: para usar Gemini desde la web hay que registrar la app en App Check (reCAPTCHA) o no aplicarlo para AI Logic.

## Versión 13: decidir de un vistazo, IA que siempre responde y rutas que se cargan solas

- **Tipografía Geist** (texto y cifras) en lugar de Archivo expandida: más legible, sin espaciados exagerados. Las etiquetas en mayúsculas pasan a sans seminegrita.
- **Resultados ordenados para decidir** (`results.js`). Arriba, un resumen con veredicto GO / OJO / STOP, la hora de salida y la de llegada y diez cifras clave: distancia, desnivel, tu estimación, **horario MIDE**, cota máxima, temperatura, racha, lluvia, isoterma y **agua recomendada**. También muestra los riesgos principales con su km y hora, y las horas clave: **mejor salida** (se aplica con un toque), puesta de sol, **hora límite en la cota máxima** y aviso de regreso. Debajo van las secciones numeradas con navegación fija: Decisión · Cuándo salir · Mapa y perfil · Tramo a tramo · Riesgos y avisos · Mochila y agua · En ruta y seguridad.
- **Plan de seguridad**: mensaje listo para WhatsApp o SMS con la ruta, el punto de salida (enlace de mapa), la hora de llegada y la hora a la que hay que llamar al 112. Incluye un **aviso en el calendario** (.ics con alarma). La app no envía nada por su cuenta.
- **Buscar ruta con carga automática** (`finder.js`). Busca en los senderos de OpenStreetMap (relaciones PR, GR y SL y sendas con nombre) y en el catálogo de canales. Un toque carga el trazado, añade altitudes y lo analiza. Si los tramos con nombre están sueltos, los une siguiendo la red real de senderos con **BRouter**. Por ejemplo, la Ruta del Cares sale con unos 10,5 km.
- **Ruta a medida**: de un punto a otro (por ejemplo, Poncebos → Caín), con ida y vuelta opcional, trazada por senderos con BRouter.
- **Wikiloc**: Wikiloc bloquea la lectura automática de sus tracks (Cloudflare). Con un enlace suyo, TrailMeteo deduce el nombre de la ruta y **carga el mismo sendero desde OpenStreetMap**. Si quieres el track exacto del autor, descarga el GPX e impórtalo.
- **Compartir a TrailMeteo**: en Android, «Compartir → TrailMeteo» desde la app de Wikiloc o desde Archivos carga el GPX o el enlace. En escritorio, los .gpx se abren con la app instalada (`share_target` y `file_handlers`).
- **GPX para tu reloj**: exporta la ruta cargada o generada.
- **Copiloto que siempre responde** (`copilot-expert.js`). Prueba en cadena Gemini (Firebase AI Logic) → **Gemini Nano integrado en Chrome** → IA comunitaria (Pollinations) → **motor propio**. El motor propio razona sin red con los datos reales de la app: tiempo, hora de salida, material, plan B, viento, lluvia, nieve, tormentas, AEMET, ritmo MIDE y carretera. Los fallos de configuración de Firebase ya no provocan esperas. En ⚙ Ajustes se elige el proveedor y se puede activar Gemini Nano.
- **Parte del día con IA** (`scripts/update-ai.py`, `parte.js`). En cada despliegue, GitHub Actions redacta el parte de Picos con **GitHub Models**, gratis con el `GITHUB_TOKEN` del workflow (permiso `models: read`). Parte de Open-Meteo, AEMET y DGT. Si no hay IA, se calcula por reglas. Se muestra en Cielo y lo usa el copiloto.
- **Paleta de comandos** `⌘K` / `Ctrl+K` / `/`: cualquier sección, buscar ruta o lugar y preguntar al copiloto.
- Pruebas nuevas: `tests/ai.test.py` y el bloque v13 de `tests/v8.mjs`.

## Versión 12: carretera, DGT y cadenas
- **Cómo llegar** (`road.js`, en Más → Carretera, desde Planificar y desde la ficha de cada canal): escribe de dónde sales (o usa tu ubicación) y a dónde vas; por defecto el destino es el inicio de la ruta cargada. Si el nombre es ambiguo, se muestran los lugares candidatos para elegir el exacto (Nominatim/OpenStreetMap). Trayecto por carretera con alternativas (OSRM; Valhalla de respaldo), carreteras usadas, tiempo y hora de llegada, aviso si la carretera termina antes del destino y aparcamiento cartografiado más cercano.
- **Avisos de la DGT en tu trayecto**: nieve, hielo, **niveles de cadenas** (verde, amarillo, rojo, negro), cortes, obras y accidentes sobre tu recorrido, con su km y la hora a la que pasarías; además, nieve, cadenas y cortes a menos de 25 km. Se marca si un aviso no estará vigente a tu hora y se recomienda la alternativa con menos avisos.
- **Tiempo en la carretera**: previsión en puntos del trayecto a la hora de paso (temperatura, nieve, hielo probable, niebla, lluvia y viento), perfil coloreado y puntos altos o puertos. «Llegar a la hora de mi ruta» calcula la salida en coche.
- **Datos DGT**: `scripts/update-dgt.py` lee el feed DATEX II oficial (Punto de Acceso Nacional y, de respaldo, infocar) y publica `data/dgt.json` con las incidencias del norte peninsular en cada despliegue, cada 20 minutos. Si la DGT no responde, la app lo indica en lugar de mostrar datos viejos.
