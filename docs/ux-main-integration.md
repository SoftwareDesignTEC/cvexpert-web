# Integración del selector visual en main actual

Rama: `feat/web-ux-selector-ofertas-release`. Base: `688d0c2`, que contiene las traducciones y adaptaciones recientes de main. Operación existente: cherry-pick de `034bb591ee8dd7bf8d34eb0f69232a0d51daf6a7`. Se resolvió esa operación; no se inició otro cherry-pick ni se integró una rama adicional.

## Resolución semántica

| Archivo con conflicto | Causa | Resolución |
| --- | --- | --- |
| `Pagination.tsx` | Etiquetas traducidas de main frente a controles accesibles y responsive del selector | Se conserva `useLocale`, se añade el ajuste de línea y se traduce también la etiqueta numerada. Se mantienen botones de tipo button. |
| `CoursesPage.tsx` | Filtros traducidos frente a nuevos mensajes que afirmaban búsqueda parcial | Se conservan las traducciones y el contrato de coincidencia exacta. Se integran páginas de 8; no se afirma soporte parcial en frontend. |
| `DashboardPage.tsx` | Radar y estados históricos traducidos frente a su eliminación | Se elimina únicamente ese bloque y su GET. La nueva tarjeta de acceso se traduce. Se conservan CV recientes, ofertas, editor, visor, PDF con idioma activo y el error de PDF separado del error de carga de CV. |
| `JobsPage.tsx` | Helper antiguo de carga y etiquetas traducidas frente a carga verificada/búsqueda global | Se usa la carga completa verificable, búsqueda parcial local con debounce y páginas de 8, manteniendo todos los filtros, textos y orden global por preferencias. |
| `SkillsGapPage.tsx` | Selector textual/resultados traducidos frente a selector visual/expansión | Se conservan los recursos de main y se aplican a los componentes nuevos, con un único modal de lista/detalle, tarjeta de selección, CV paginado, expansión de resultados y galería paginada. |

También se revisaron los archivos que Git había aplicado sin conflicto. Se localizaron las etiquetas, fechas, avisos, acciones de expansión y errores del selector en español e inglés mediante el `LocaleContext` y el diccionario existentes. Los códigos de error del listado permiten traducir el diagnóstico sin hacer depender los servicios HTTP de React. No se eliminaron claves o traducciones anteriores del diccionario.

Se conservó íntegro el modal de main con encabezado, toolbar y footer independientes de la zona desplazable; solo se tradujo su etiqueta de cierre. No se modificaron sidebar, autenticación, editor, proyección de idiomas, persistencia del CV ni los contratos o cálculos del análisis. Los valores persistentes de categorías de habilidades permanecen iguales; solo sus etiquetas son traducidas.

## Funcionalidades verificadas en código

- `/skills-gap` conserva `jobId`, selección de CV y análisis explícito. Abrir/cancelar el selector no modifica la selección ni ejecuta el análisis.
- Lista y detalle comparten un modal. Los detalles se obtienen por ID y se comprueba que la respuesta corresponda a la oferta.
- La búsqueda del selector usa el servidor, debounce de 350 ms y respuestas acotadas a 8. La alternativa local solo se habilita sobre un catálogo completo verificado. No se presenta una página filtrada como búsqueda global.
- Se preservan los filtros, preferencias y acciones de postulaciones de Ofertas.
- Dashboard no importa ni consulta el servicio histórico de brechas. Solo conserva el enlace al nuevo análisis.
- Cursos conserva filtros exactos, URL, precio, paginación y estados traducidos. El comentario incorrecto de búsqueda parcial del servicio se corrigió sin cambiar el contrato.

## Pruebas realizadas

- `npm run lint`: correcto, sin errores ni advertencias.
- `npm run build`: correcto. Se mantienen los avisos de anotaciones de SignalR y tamaño del bundle.
- `node --test test/job-selection.test.mjs test/skills-gap.test.mjs test/ux-i18n-integration.test.mjs`: 34 pruebas aprobadas, sin omitidas.
- Las siete pruebas adicionales comprueban claves/variables de ambos idiomas, paginación accesible, límite inicial de ocho elementos, textos del selector, descripción escapada, conservación de filtros exactos en Cursos y errores localizados. El render se ejecuta en memoria con Node/React, sin navegador, DOM ni HTTP.
- `git diff --check` y búsqueda de marcadores de conflicto: correctos antes de finalizar la operación.

`apps/web/test/courses.test.mjs` es un archivo local ajeno al cherry-pick. Se inspeccionó y se conservó sin editar ni añadir al staging: su SHA-256 sigue siendo `BB739F1C821B2FA1C4296222021BF4241B529B3C290D407142549CB8AFC90F1D`. Sus pruebas de página presuponen mensajes de búsqueda parcial y un harness anterior a LocaleContext; no se incorporaron a esta tarea. El comportamiento actual de Cursos se cubre en las pruebas de integración traducidas y de servicio existentes.

No se utilizaron navegadores, Docker, máquinas virtuales ni servicios reales. La validación visual e integración con APIM continúan a cargo del usuario. No se hizo push, PR nuevo ni merge a main; únicamente se finaliza el commit autorizado del cherry-pick.
