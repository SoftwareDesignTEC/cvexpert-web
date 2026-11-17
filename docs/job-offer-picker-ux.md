# Selector visual de ofertas y Dashboard

Base: `feat/web-brechas-por-oferta` en `f623b62`, igual al HEAD del PR #51 al iniciar. El PR seguía abierto y sin fusionar; el árbol local estaba limpio. Rama nueva: `feat/web-ux-selector-ofertas`. No se integra main ni se modifica el análisis o la proyección de idiomas.

## Selección y paginación

En Análisis de Brechas se conserva el CV elegido. Su selector solicita páginas de 8 currículums y mantiene el título de la selección aunque esta no esté en la página visible.

El botón de oferta abre `JobOfferPickerDialog`, un único modal con transición entre lista y detalle. Reutiliza `JobCard`, `CompanyLogo`, `Modal`, feedback y `Pagination`. Muestra hasta 8 ofertas por página, con la información disponible y sin inventar tipo de contratación cuando el servicio lo omite. El detalle obtiene `GET /jobs/{id}`, comprueba el ID y muestra descripción, requisitos y habilidades como texto. No incluye acciones de postulaciones.

Solo «Seleccionar para analizar» confirma la oferta. Cancelar conserva la selección anterior. El ID se escribe con `URLSearchParams`, preservando los otros parámetros. `/skills-gap?jobId=...` muestra la tarjeta de la oferta sin abrir el modal. Abrir, cancelar o seleccionar no ejecuta el análisis: se conserva el botón explícito Analizar.

Las páginas sustituyen los elementos visibles; no se acumulan ni se montan todas las páginas para ocultarlas. La selección se conserva al paginar. El cambio de búsqueda restablece la página 1 y las respuestas anteriores se ignoran al desmontar su consulta. Al paginar se mueve el foco y el scroll al listado. El modal contiene el foco y lo devuelve al salir; lista y detalle no usan modales anidados. El paginador compartido permite envolver controles en pantallas angostas.

Los resultados del análisis muestran inicialmente hasta 8 habilidades/evidencias/accesos por sección con expansión explícita. Los indicadores permanecen completos. El radar identifica las primeras 8 comparaciones y remite a la lista completa; no se recalculan resultados. La galería de recomendaciones pagina de 8 en 8. Los cursos por déficit mantienen su contrato existente de 5 por consulta, pero reemplazan la página visible.

## Búsqueda y compatibilidad con APIM

Se revisaron en `cvexpert-ms-ofertas-postulaciones`, rama `main`, estos archivos:

- `src/main/java/com/cvexpert/ofertas/adapter/in/web/JobController.java`
- `src/main/java/com/cvexpert/ofertas/application/JobOfferService.java`
- `src/main/java/com/cvexpert/ofertas/adapter/out/persistence/JobOfferJpaRepository.java`
- `src/main/java/com/cvexpert/ofertas/adapter/out/persistence/QuerySupport.java`

El backend recibe `search`, usa `LIKE %texto%` sin distinguir mayúsculas y consulta puesto, empresa y ubicación. También escapa los comodines SQL del texto. Esto documenta el código fuente, no certifica lo que esté desplegado en APIM.

El selector prefiere `GET /jobs?page=...&pageSize=8&search=...`, construido con `URLSearchParams`. Tiene debounce de 350 ms. No filtra localmente esa página ni altera sus totales. Si la respuesta carece de metadatos verificables, muestra un aviso y no inventa páginas. Si devuelve ofertas ajenas al texto, advierte que el servicio podría estar ignorando el filtro. No se puede detectar automáticamente un falso negativo (por ejemplo, falta de normalización de acentos en el servidor).

La opción «Buscar en catálogo completo» solicita una carga sin búsqueda, página por página, en lotes de hasta 100 y como máximo 20 páginas. Comprueba metadatos, totales estables y ausencia de IDs repetidos. Solo habilita la búsqueda local cuando se recibieron todos los registros. Si no puede demostrarlo, informa el error y no afirma que un subconjunto sea global. Cerrar el selector invalida la carga y evita solicitar páginas adicionales. El catálogo completo se conserva durante la vida de esta pantalla, sin caché global entre sesiones de usuario.

La búsqueda local usa `normalizeJobSearch` y coincidencias parciales por puesto, empresa o ubicación. Normaliza espacios, mayúsculas y acentos comunes, conservando ñ y puntuación. No utiliza IA, sinónimos, scraping o dependencias adicionales.

En Ofertas Laborales se mantiene la carga completa para conservar los filtros y el orden global por preferencias existentes. Ahora se verifica que realmente esté completa y se carga una sola vez por montaje/reintento, no por cada búsqueda. Buscar y cambiar filtros trabaja sobre ese conjunto en memoria y restablece página 1. Solo se montan las 8 ofertas de la página visible. Un gateway antiguo sin totales verificables provoca un error explícito en lugar de mostrar filtros parciales como globales.

## Dashboard

Se elimina su llamada a `GET /skills-gap`, radar histórico, indicadores, estados e imports asociados. El bloque pasa a ser una tarjeta compacta «Analizar mi CV» hacia `/skills-gap`. La fila deja de imponer la altura común del radar; las miniaturas de CV conservan altura propia. Se mantienen CV recientes, visor, editor, descargas, ofertas recomendadas y postulaciones.

## Validación pendiente del usuario

- Revisar modal, foco, scroll y paginación en móvil/escritorio/modo oscuro.
- Buscar micro/MICRO, pyth, develop y san jos con datos reales.
- Comprobar que el gateway respeta search, page y pageSize; verificar el modo local con un catálogo completo.
- Probar 7, 8, 9 y muchas ofertas; cambios de búsqueda/filtros en páginas posteriores y respuestas lentas.
- Ver detalles, cancelar, confirmar, conservar CV y abrir desde «Analizar con mi CV».
- Confirmar que Dashboard no consulta skills-gap y conserva visor, editor y postulaciones.

Las pruebas automatizadas son unitarias con Node y servicios simulados, sin red ni navegador. No se iniciaron servidores, herramientas visuales o servicios reales.

## Archivos y verificaciones realizadas

Modificados:

- `apps/web/src/pages/SkillsGapPage.tsx`
- `apps/web/src/pages/JobsPage.tsx`
- `apps/web/src/pages/DashboardPage.tsx`
- `apps/web/src/components/ui/JobCard.tsx`
- `apps/web/src/components/ui/Pagination.tsx`
- `apps/web/src/components/ui/GalleryDialog.tsx`
- `apps/web/src/services/otherServices.ts`
- `apps/web/src/types/models.ts`

Añadidos:

- `apps/web/src/components/ui/JobOfferPickerDialog.tsx`
- `apps/web/src/components/ui/JobOfferPreview.tsx`
- `apps/web/src/components/ui/JobOfferSelection.tsx`
- `apps/web/src/components/ui/CvAnalysisPicker.tsx`
- `apps/web/src/components/ui/ExpandableItems.tsx`
- `apps/web/src/hooks/useDebouncedValue.ts`
- `apps/web/src/services/jobSearch.ts`
- `apps/web/src/services/jobCatalogService.ts`
- `apps/web/test/job-selection.test.mjs`
- `docs/job-offer-picker-ux.md`

Resultados reales:

- `node --test test/skills-gap.test.mjs test/job-selection.test.mjs`: 27 pruebas aprobadas, sin omitidas. Diez son nuevas y las otras diecisiete cubren el análisis existente.
- `npm run build`: correcto en una ejecución. Avisos de anotaciones de SignalR y tamaño del bundle, sin errores.
- `npm run lint`: verificación final limpia. Se corrigió localmente un nombre que parecía hook y una advertencia de referencia en cleanup antes de una única repetición.
- `git diff --check`: correcto. Se comprobó que Dashboard solo conserva la ruta de navegación a `/skills-gap`, y que proyección de idiomas, servicios de análisis y persistencia de CV no cambiaron.
- Estado final: 8 archivos modificados y 10 añadidos, sin stage, commit, push, merge ni PR nuevo.
