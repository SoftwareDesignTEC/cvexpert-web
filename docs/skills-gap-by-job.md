# Análisis contextual de brechas en Web

La sección `/skills-gap` permite elegir un CV y una oferta, con carga paginada de ambas listas. El detalle de cualquier oferta enlaza a `/skills-gap?jobId=...`. Se conservan el radar, los componentes comunes y las tarjetas de cursos de la web.

## Solicitudes

- `GET /cvs`, `GET /jobs`: selectores paginados.
- `GET /cvs/{id}`, `GET /jobs/{id}`: detalles antes de analizar.
- `POST /skills-gap/recommendations`: únicamente `cv: {id, skills: [{name, level}]}` y `jobs: [{id, skills}]`.
- `POST /skills-gap/evaluate`: misma proyección, agregando `description` y `requirements` a la oferta.
- `GET /courses?skillName=...&page=...&pageSize=5`: consulta voluntaria para habilidades con déficit explícito de nivel. Son asociaciones del catálogo, sin garantía de alcanzar ese nivel.
- `GET /courses?page=...&pageSize=20`: catálogo independiente con filtros opcionales `platform`, `skillName` e `isPaid`.
- `PUT /cvs/{id}`: agregar una habilidad al CV elegido.

Las recomendaciones se conservan si falla la evaluación de niveles; el reintento repite únicamente esa evaluación. Un `503 CATALOG_UNAVAILABLE` ofrece evaluación pura sin afirmar que se consultaron cursos. Las respuestas se validan antes de presentarlas y deben corresponder al mismo CV y oferta. Cambiar de selección desmonta el análisis anterior e invalida sus respuestas pendientes.

## Proyección de idiomas

`projectCvForJob()` es una función pura compartida por ambos POST a través de `jobGapInput()`. Construye una nueva proyección `{id, skills: [{name, level}]}`. No modifica `cv.skills`, `cv.languages`, sus nombres o niveles, ni ejecuta escrituras. Solo incorpora idiomas de `languages` que estén exigidos por nombre en `jobs[].skills`; no extrae habilidades o requisitos de la descripción.

Los alias explícitos son Inglés/English, Español/Spanish, Francés/French, Portugués/Portuguese, Alemán/German, Italiano/Italian, Ruso/Russian, Mandarín/Mandarin, Japonés/Japanese, Coreano/Korean, Árabe/Arabic y Lengua de señas costarricense/Costa Rican Sign Language. Se comparan nombres completos normalizados por espacios, mayúsculas y acentos; no hay subcadenas ni coincidencia aproximada. Otros idiomas conservan coincidencia por el mismo nombre normalizado, sin traducirlo. Java y JavaScript no son alias de ningún idioma humano.

La proyección usa la denominación de la oferta para los idiomas equivalentes. Por ejemplo, Inglés avanzado produce `{name: "English", level: "advanced"}` si la oferta solicita English. Si una oferta enumera dos denominaciones distintas del mismo idioma, ambas se proyectan con el mismo nivel para responder a los dos nombres que el backend considera requisitos; nunca se repite una clave de nombre normalizada.

Política de niveles:

| Nivel original en languages | Nivel enviado en cv-skill-v1 |
| --- | --- |
| basic | beginner |
| intermediate | intermediate |
| advanced | advanced |
| native | expert |

`native → expert` ocupa el cuarto escalón únicamente como equivalencia operativa exigida por el contrato. No afirma equivalencia universal de competencia lingüística, acreditación ni un nivel CEFR. La interfaz explica esta adaptación. Un nivel inválido se rechaza, sin asignar uno por defecto. El backend sigue determinando cobertura, niveles requeridos, conflictos y déficits; nunca se modifica su porcentaje.

Precedencia determinista: una entrada en `skills` prevalece sobre `languages`, incluso cuando usan alias distintos. Entre entradas del mismo idioma prevalece la primera, sin elegir un nivel máximo. Las habilidades técnicas conservan nombre y nivel; si se repiten con niveles contradictorios, se bloquea el análisis en lugar de ocultar el conflicto. La adaptación no cambia el mapeo Kotlin de Android.

## Presentación de resultados y calidad del catálogo

«Competencias consideradas» cuenta las habilidades de la proyección HTTP, incluyendo idiomas exigidos por la oferta, en lugar de limitarse a `cv.skills.length`. Este número no equivale al total de requisitos de la oferta.

Si una recomendación contiene un curso inválido, inseguro, de demostración o repetido dentro de su grupo, se descarta solamente ese curso y se informa el número de exclusiones: la cobertura, los niveles y las otras recomendaciones siguen visibles. Se continúa rechazando una estructura de análisis o un sobre de recomendaciones incompatibles. En la vista resumida y en la galería, cursos repetidos entre varias habilidades se presentan una sola vez por ID y conservan los nombres de todas las habilidades asociadas.

## Catálogo independiente

`/courses` es una ruta protegida accesible desde el menú Cursos. Reutiliza las tarjetas de brechas y los componentes de cabecera, botones, feedback y paginación existentes. Ofrece filtros de plataforma, habilidad y precio (todos/gratis/de pago), aplicación y limpieza de filtros, páginas de 20 registros y reintento ante errores.

Los filtros aplicados y la página quedan en la URL. Los enlaces desde brechas incluyen `/courses?skillName=...`; el filtro se aplica al abrir y se conserva al paginar. Las coincidencias de habilidad y plataforma son exactas y sensibles a mayúsculas según el contrato, sin búsqueda aproximada ni scraping. El catálogo general no sustituye las recomendaciones contextualizadas.

Se validan enlaces HTTP/HTTPS sin credenciales y se abren con `noopener noreferrer`. Duración y logo nulos se conservan como desconocidos. Se ocultan registros inválidos, duplicados, marcadores `[DEMO]`/`[TEST]` y dominios reservados de ejemplo, informando cuántos se omitieron sin modificar `totalRecords`. Una página completamente descartada permite continuar a otras páginas. A diferencia del mapeador Android, la web puede conservar las filas válidas de una página que incluya filas malformadas; un sobre de paginación incompatible sí produce error.

## Guardado

El diálogo exige elegir el nivel real y utiliza las categorías Técnica/Blanda del editor. Cancelar no escribe. Antes del PUT se obtiene nuevamente el detalle del CV; se preservan todas sus secciones y la información personal opcional, incluyendo `types`, `modalities`, `sectors` y fechas nulas. Se evita duplicar nombres equivalentes, sin cambiar el nivel de una habilidad ya existente.

Se bloquea el guardado si faltan secciones o aparecen campos fuera del contrato que podrían perderse. Después de un PUT exitoso se vuelve a obtener el CV y a analizar con la misma oferta. Si falla ese paso, el aviso conserva la confirmación de guardado y el reintento no repite el PUT.

El contrato existente de CV no ofrece ETag/If-Match ni actualización parcial. Leer inmediatamente antes de escribir evita usar el CV antiguo del análisis, pero no permite garantizar exclusión atómica frente a una edición simultánea entre GET y PUT desde otro cliente.

## Validación ligera

Desde `apps/web`, con las dependencias existentes:

```sh
node --test test/skills-gap.test.mjs
npm run build
npm run lint
```

Las pruebas de servicio usan respuestas simuladas en memoria. No requieren navegador, servidor ni integración real.

## Revisión manual pendiente

1. Seleccionar CV y oferta, incluyendo elementos de páginas posteriores y acceso desde Ofertas.
2. Verificar 0 % frente a información insuficiente, niveles conocidos/desconocidos, conflictos y evidencia como texto.
3. Agregar Git, cancelar, intentar un duplicado y comprobar en el editor todas las secciones del CV, especialmente los campos opcionales.
4. Cambiar selecciones durante un análisis pendiente y confirmar que no aparece un resultado anterior.
5. Simular fallas de catálogo, evaluación y consulta posterior a un guardado confirmado; revisar los reintentos.
6. Revisar escritorio, móvil, modo oscuro y las acciones originales de postulaciones.
7. Analizar Inglés avanzado de `languages` contra Inglés/English, y Nativo contra una oferta con o sin nivel explícito. Confirmar que no se agregó ninguna habilidad persistente.
8. Abrir Cursos desde el menú y desde una habilidad de brechas; aplicar plataforma/habilidad/precio, limpiar, cambiar páginas, volver con el navegador y comprobar enlaces externos.
9. Verificar catálogo vacío, error/reintento y páginas con datos de demostración, sin alterar el total informado por el servidor.

La documentación backend consultada en GitHub `develop` señala publicación de rutas en APIM pendiente. La disponibilidad real del gateway y las operaciones autenticadas requieren validación de integración por el usuario. No se modifican microservicios, Dashboard ni los consumidores restantes del análisis antiguo.
