# AGENTS.md — App Móvil Nativa Android (Kotlin)

> Contexto persistente del proyecto. Léelo completo antes de generar o modificar código.
> Si algo aquí contradice una instrucción del chat, avisa antes de continuar.

---

## 1. Qué es este repositorio

App **nativa Android en Kotlin + Jetpack Compose** para un proyecto universitario del curso
**Diseño de Software** (Instituto Tecnológico de Costa Rica). Equipo de 5 personas.

**Producto:** app de creación de currículums ("CV") orientada a jóvenes con poca experiencia
laboral. Funcionalidades del producto completo:

1. **Perfil único y reutilizable** — datos personales y profesionales (contacto, residencia,
   disponibilidad, sector de interés) guardados una sola vez.
2. **Generación de CV asistida por IA (modo online)** — el usuario escribe experiencias breves
   y se expanden a redacción profesional; captura guiada por preguntas dinámicas; edición previa
   y exportación a PDF. Incluye "traductor de experiencia no laboral" (voluntariados, proyectos
   escolares, trabajos informales).
3. **Modo offline** — catálogo de plantillas preinstaladas, llenado 100% manual sin internet;
   descarga de plantillas nuevas cuando hay conexión.
4. **Búsqueda y recomendación de ofertas laborales** — emparejamiento por ubicación,
   disponibilidad, habilidades y experiencia; panel de detalle de cada oferta.
5. **Análisis de brecha de habilidades** — compara el CV contra el mercado objetivo, recomienda
   cursos, y un rastreador de postulaciones tipo Kanban
   (Aplicado / En proceso / Entrevista / Rechazado).

**Fecha límite de la Fase I: 1 de octubre de 2026, 11:59 p.m.**

---

## 2. ALCANCE DE LA FASE I — LEE ESTO ANTES DE CODIFICAR

Esta fase **no tiene backend real**. Es una entrega de **frontend + infraestructura**.
La IA, la base de datos y los microservicios del diagrama de arquitectura son para fases
posteriores.

**Qué SÍ entra en Fase I:**

- App Android nativa funcionando, navegable, con tema claro y oscuro.
- CRUD completo contra **mocks de Azure API Management (APIM)**, con paginación y búsqueda.
- Validaciones de formularios y manejo de errores (incluye respuestas 400 y 404 de los mocks).
- Google Auth nativo.
- Número de versión visible dentro de la app (requisito de la rúbrica).
- APK firmado, distribuido por **Firebase App Distribution** vía GitHub Actions.

**Qué NO entra en Fase I (no lo implementes, no lo "adelantes"):**

- ❌ Llamadas reales a modelos de IA.
- ❌ Base de datos (MongoDB Atlas / Azure SQL aparecen en el diagrama pero son fase futura).
- ❌ Microservicios Spring Boot / Azure App Service / Storage Queue.
- ❌ Generación real de PDF (a menos que se pida explícitamente).

Si una funcionalidad del producto no se puede cumplir con mocks, se implementa la **UI completa**
y el dato viene del mock. Nunca inventes un backend.

---

## 3. Mi rol dentro del equipo

Yo soy **Andrés Zumbado — Frontend Móvil Nativo**. Este repo/módulo es mío.

| Persona | Rol | Con qué me toca |
| --- | --- | --- |
| Samuel Fajardo | UX/UI | Figma, mockups claro/oscuro, Material Design 3 |
| Justin Mayorga | Arquitectura + Doc. | Diagrama draw.io; desde el 19 sep **co-desarrolla Kotlin conmigo** |
| Gabriel Pérez | Frontend Web | Web responsive; **misma estructura de datos y endpoints que yo** |
| Gabriel Cabrera | DevOps | Azure, APIM mocks, CI/CD, firma de APK, Firebase |

**Reglas de equipo que afectan el código:**

- **Paridad web–móvil obligatoria.** Los modelos de datos, nombres de campos y endpoints deben
  ser idénticos a los de la app web de Gabriel Pérez. Si cambias un nombre de campo, márcalo.
- Los componentes deben seguir **Material Design 3** para respetar el Figma de Samuel.
- El `applicationId` y el build variant son **contrato con DevOps**. No los cambies nunca sin
  que yo lo apruebe explícitamente.

---

## 4. Stack técnico obligatorio

| Área | Decisión |
| --- | --- |
| Lenguaje | Kotlin (última estable) |
| UI | Jetpack Compose + Material 3 (`androidx.compose.material3`) |
| Navegación | Navigation Component para Compose (`navigation-compose`) |
| Arquitectura | MVVM + Repository, capas `ui` / `domain` / `data` |
| Estado | `ViewModel` + `StateFlow`, UI sin estado (stateless composables) |
| Async | Coroutines + Flow |
| Red | Retrofit + OkHttp + kotlinx.serialization (o Moshi, pero sé consistente) |
| DI | Hilt |
| Listas | `LazyColumn` con paginación |
| Build | Gradle con **Kotlin DSL** (`.kts`) + **version catalog** (`libs.versions.toml`) |
| Auth | Credential Manager + Google ID (Google Sign-In nativo) |
| Distribución | APK firmado → Firebase App Distribution |

**No agregues** dependencias fuera de esta lista sin explicarme por qué y esperar aprobación.
Nada de React Native, Flutter, Expo ni KMP: la entrega exige **nativo**.

**`applicationId` definitivo: `com.cvpro.app`** — ya acordado con DevOps. Es inmutable: cambiarlo
rompe la firma del APK y la distribución en Firebase. El `namespace` del módulo `app` usa el mismo
valor, y los paquetes cuelgan de `com.cvpro.app`.

### Configuración de build ya cerrada (NO la vuelvas a discutir)

Decisiones tomadas durante T1. Quedan fijas salvo que yo diga lo contrario:

- `minSdk` 26.
- `compileSdk` / `targetSdk` **37.2** — exigido por las librerías AndroidX en uso.
- **AGP 9.x**, sin el plugin `kotlin-android` (AGP 9 no compila con él).
- `applicationIdSuffix = ".debug"` en el build type debug. El release mantiene
  `com.cvpro.app` intacto, que es el que se firma y se sube a Firebase.
- **Sin dynamic color.** La paleta la define el Figma de Samuel; dynamic color la
  sobrescribiría en Android 12+ y rompería la paridad con la web.
- **Daemon de Gradle fijado en Java 25** vía `gradle/gradle-daemon-jvm.properties`
  (`toolchainVersion=25`). Lo genera Android Studio con su JBR. Está commiteado a propósito:
  es el mecanismo para que todo el equipo compile con el mismo JVM. **No lo borres** — Studio
  lo regenera en el siguiente sync y entrás en un loop.
- `app_name` = "CV Pro" — **placeholder**, pendiente de confirmar con el equipo.

⚠️ Estas versiones son contrato con DevOps: el runner de GitHub Actions debe usar el mismo
AGP, el mismo `compileSdk` y Java 25 declarado explícitamente en `setup-java` (si se deja
auto-provisionar, Gradle baja un JDK entero en cada corrida). Si necesitás subir o bajar alguna, **pará y
avisame primero** — no es una decisión del repo móvil.

No fijes versiones de memoria: usá el version catalog y confirmá lo que realmente resuelve Gradle.

---

## 5. Estructura de carpetas esperada

```
app/src/main/java/com/cvpro/app/
├── MainActivity.kt
├── CvApplication.kt              # @HiltAndroidApp
├── ui/
│   ├── theme/                    # Color.kt, Type.kt, Theme.kt (claro + oscuro)
│   ├── navigation/               # NavGraph.kt, Routes.kt
│   ├── components/               # botones, campos, estados vacíos, loaders
│   └── screens/<feature>/        # <Feature>Screen.kt + <Feature>ViewModel.kt
├── domain/
│   ├── model/                    # modelos limpios
│   └── repository/               # interfaces
└── data/
    ├── remote/                   # Retrofit API, DTOs, mappers
    ├── local/                    # DataStore / Room (modo offline)
    └── repository/               # implementaciones
```

Una pantalla = una carpeta. El `ViewModel` vive junto a su pantalla.

---

## 6. Convenciones de código

- Composables en `PascalCase`; el que tiene estado recibe `ViewModel`, el que pinta recibe
  parámetros planos + lambdas. Siempre `Modifier` como primer parámetro opcional.
- Un solo `UiState` por pantalla: `data class XUiState(val isLoading, val data, val error)`.
  Nada de tres `MutableState` sueltos.
- **Cero colores hardcodeados en Compose.** Todo sale de `MaterialTheme.colorScheme`.
  Única excepción: los recursos de sistema (ícono, splash) no pueden leer el tema, así que el
  hex vive **una sola vez** en `colors.xml` y los drawables lo referencian con `@color/...`.
  Nunca repitas un hex en un drawable.
- Todo string de usuario va a `strings.xml` en **español**.
- Comentarios en español **con tildes**. El código fuente es UTF-8; no hay excusa para
  "configuracion" o "version".
- Toda pantalla debe manejar: **cargando / vacío / error / éxito**. El estado de error muestra
  mensaje entendible y botón de reintentar.
- Comentarios y nombres de commits en español. Código en inglés.
- No generes tests de UI a menos que te los pida; para la Fase I no se exigen.

---

## 7. Integración con APIM (mocks)

- La URL base del APIM la define Gabriel Cabrera. Va en `local.properties` +
  `BuildConfig`, **nunca hardcodeada en código fuente ni en el repo**.
- Los mocks devuelven **200 / 201** en caminos felices y **400 / 404** en errores. Manejá los
  cuatro.
- Los listados vienen **paginados**. Asume una respuesta tipo
  `{ items: [...], page, pageSize, total }` hasta que yo confirme el contrato real.
- Búsqueda por query param.
- Si el contrato de un endpoint no está en este archivo, **no lo inventes en silencio**:
  escribe el modelo que asumiste y márcalo con `// TODO: confirmar con Cabrera/Pérez`.

---

## 8. Mis tareas de la Fase I

Vamos **una por una, en orden**. No adelantes tareas siguientes.

- [ ] **T1 — Scaffold Android.** Proyecto base Kotlin + Compose con `applicationId`
      `com.cvpro.app`, version catalog, Hilt, tema claro/oscuro Material 3, versión visible.
- [ ] **T2 — Pantallas y componentes.** Navigation Component, grafo de navegación, componentes
      base: `LazyColumn`, formularios, botones, feedback visual (loader, snackbar, vacío, error).
- [ ] **T3 — CRUD y Firebase.** Capa de datos contra los mocks del APIM (CRUD + paginación +
      búsqueda) y app lista para Firebase App Distribution.

Fechas internas del equipo: T1 13 sep · Auth+Firebase 16 sep · T2 19–21 sep ·
CRUD 26 sep · validaciones 27 sep · APK final 29 sep.

---

## 9. Cómo quiero que trabajes

1. **Un paso a la vez.** Antes de escribir código, muéstrame el plan y los archivos que vas a
   tocar. Espera mi "dale".
2. **No borres ni reescribas archivos que ya funcionan** sin decirme qué cambia y por qué.
3. Si una decisión tiene dos caminos razonables (ej. Moshi vs kotlinx.serialization), **pregunta**
   en vez de asumir.
4. Al terminar cada tarea, dime el comando exacto para compilar y qué debería ver en el emulador.
5. **Explicá lo que hacés.** Es un proyecto de curso y tengo que poder defender cada línea ante
   el profesor. Si generás algo que yo no entendería, agregá una explicación corta.
6. Nunca subas al repo: `google-services.json`, keystores, `local.properties`, secrets, URLs del
   APIM. Verificá el `.gitignore` antes de cualquier commit.

---

## 10. Pendientes de definir (⚠️ pregúntame, no inventes)

- [x] ~~`applicationId`~~ → **`com.cvpro.app`** (cerrado).
- [ ] Nombre comercial de la app — hoy está "CV Pro" como placeholder en `strings.xml`.
- [ ] URL base del APIM y lista final de endpoints.
- [ ] Entidad principal del CRUD de la Fase I (¿perfil? ¿ofertas? ¿postulaciones?).
- [ ] Proyecto de Firebase y `google-services.json`.
- [ ] Paleta y tipografía finales del Figma de Samuel.
