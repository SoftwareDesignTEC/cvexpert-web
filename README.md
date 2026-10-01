# CV Master

**Curso:** Diseño de Software — Profesor Marcos Rodríguez
**Entrega:** Fase I — 1 de octubre de 2026

CV Master es una aplicación para crear y gestionar currículums, descubrir ofertas laborales y analizar la brecha entre las habilidades propias y las que pide el mercado. Se compone de una aplicación web responsive y una aplicación móvil Android, ambas con la misma funcionalidad y consumiendo los mismos Mock Services publicados en Azure API Management.

Esta fase no incluye backend real: toda la información proviene de mocks configurados en APIM.

**Aplicación web en producción:** https://victorious-mushroom-0cd000a10.5.azurestaticapps.net

---

## Integrantes y roles

| Persona | Rol |
|---|---|
| Samuel Fajardo | UX/UI y diseño en Figma |
| Justin Mayorga | Arquitectura y documentación |
| Gabriel Pérez | Frontend web |
| Andrés Zumbado | Frontend móvil |
| Gabriel Cabrera | DevOps, Mock Services e integración |

---

## Estructura del repositorio

```
cv-master/
├── .github/
│   └── workflows/
│       ├── azure-static-web-apps-victorious-mushroom-0cd000a10.yml   # CI/CD web
│       └── mobile-ci-cd.yml                                          # CI/CD móvil
├── apps/
│   ├── web/                    # Aplicación web (React + Vite + TypeScript)
│   │   ├── public/
│   │   │   └── staticwebapp.config.json   # Fallback de rutas del SPA en Azure
│   │   └── src/
│   │       ├── components/ui/  # Componentes reutilizables (Card, Button, SkillsRadar…)
│   │       ├── context/        # AuthContext y ThemeContext
│   │       ├── hooks/          # useApi, useOnlineStatus
│   │       ├── layouts/        # MainLayout (sidebar + header)
│   │       ├── pages/          # Una pantalla por archivo
│   │       ├── router/         # Rutas y ProtectedRoute
│   │       ├── services/       # Cliente HTTP y servicios por recurso
│   │       ├── types/          # Tipos del dominio
│   │       └── config.ts       # Origen de autenticación central
│   └── mobile/                 # Aplicación Android (Kotlin + Jetpack Compose)
├── docs/
│   └── estructura.md
├── package.json
└── README.md
```

---

## Despliegue local

### Aplicación web

Requiere Node.js 20 o superior.

```bash
cd apps/web
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`.

Antes de levantarla hay que crear el archivo `apps/web/.env.local` con estas dos variables:

```
VITE_APIM_BASE_URL=<URL base del APIM>
VITE_GOOGLE_CLIENT_ID=<Client ID de Google OAuth>
```

Ese archivo está en `.gitignore` y **no se versiona**. Los valores se piden al encargado de DevOps; en los despliegues automáticos se inyectan desde las variables de GitHub Actions.

`http://localhost:5173` está registrado como origen autorizado tanto en Google Cloud Console como en la política CORS del APIM, así que el inicio de sesión funciona en local sin configuración extra.

Otros comandos disponibles:

```bash
npm run build     # Verificación de tipos y compilación de producción
npm run lint      # Análisis estático con ESLint
npm run preview   # Sirve la compilación de producción localmente
```

### Aplicación móvil

Requiere JDK 17 y Android Studio.

```bash
cd apps/mobile
./gradlew assembleDebug
```

---

## Capturas de pantalla

<!-- Reemplazar cada línea por la captura correspondiente, por ejemplo:
     ![Panel principal](docs/capturas/panel-principal.png)
     Guardar las imágenes en docs/capturas/ -->

| Pantalla | Escritorio | Móvil |
|---|---|---|
| Panel principal | _pendiente_ | _pendiente_ |
| Mis currículums | _pendiente_ | _pendiente_ |
| Perfil | _pendiente_ | _pendiente_ |
| Ofertas laborales | _pendiente_ | _pendiente_ |
| Postulaciones | _pendiente_ | _pendiente_ |
| Análisis de brechas | _pendiente_ | _pendiente_ |
| Plantillas | _pendiente_ | _pendiente_ |
| Configuración (tema claro y oscuro) | _pendiente_ | _pendiente_ |

---

## Funcionalidad implementada en la web

- **Autenticación con Google.** El inicio de sesión devuelve un `id_token` que APIM valida con una política `validate-jwt`. Las rutas de la aplicación están protegidas y redirigen a `/login` cuando no hay sesión válida.
- **Panel principal** con currículums recientes, ofertas recomendadas y el análisis de brecha de habilidades.
- **Mis currículums**, con paginación incremental.
- **Ofertas laborales**, con paginación y búsqueda.
- **Postulaciones**, organizadas por estado en un tablero.
- **Análisis de brechas**, con gráfico de radar y cursos recomendados.
- **Plantillas** de currículum.
- **Perfil**, con datos personales, preferencias y análisis de habilidades.
- **Configuración**, con cambio de tema.
- **Tema claro y oscuro** con persistencia en `localStorage`, respetando la preferencia del sistema en el primer ingreso.
- **Diseño responsive** en todas las pantallas.
- **Manejo de errores** con estados de carga, mensajes de error y opción de reintentar en cada pantalla que consume datos.
- **Indicador de conexión** en el encabezado, basado en el estado de red del navegador.

### Autenticación desde entornos de vista previa

Google exige registrar cada origen autorizado, y Azure Static Web Apps genera una URL distinta por cada Pull Request. Como no es posible registrarlas todas de antemano, sólo el dominio de producción y `localhost` están autorizados.

Cuando alguien intenta iniciar sesión desde una vista previa, la aplicación lo redirige al dominio de producción, donde el inicio de sesión sí está permitido, y desde ahí regresa al origen de la vista previa con el token. El destino de ese retorno se valida contra los dominios propios del proyecto antes de reenviar el token.

---

## Integración con Azure API Management

Todas las llamadas pasan por un cliente HTTP único (`apps/web/src/services/http.ts`) que adjunta el `id_token` en el encabezado `Authorization` y centraliza el manejo de errores. Una respuesta `401` cierra la sesión y devuelve al inicio de sesión.

Los endpoints de lista responden con metadatos de paginación:

```json
{
  "totalRecords": 42,
  "page": 1,
  "pageSize": 10,
  "items": []
}
```

Ningún dato que se muestra en pantalla está escrito en el código: todo proviene de APIM.

---

## Integración continua y despliegue

| Workflow | Qué hace | Cuándo se activa |
|---|---|---|
| `azure-static-web-apps-…yml` | Instala dependencias, compila y despliega en Azure Static Web Apps | Push a `main` (producción) y Pull Requests hacia `main` (vista previa) |
| `mobile-ci-cd.yml` | Compila el APK de release y lo sube a Firebase App Distribution | Cambios en `apps/mobile/**` |

Cada Pull Request abierto contra `main` genera un entorno de vista previa con URL propia, que se elimina automáticamente al cerrarlo. Los despliegues a producción salen únicamente de `main`.

### Gestión de secretos

Ninguna URL ni credencial está versionada. Los valores se inyectan en tiempo de compilación desde las variables y secretos de GitHub Actions (`vars.APIM_BASE_URL`, `vars.GOOGLE_WEB_CLIENT_ID`, `secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_…`).

---

## Créditos de herramientas y librerías

### Aplicación web

| Librería | Uso |
|---|---|
| [React 19](https://react.dev/) | Biblioteca de interfaz |
| [Vite 5](https://vite.dev/) | Empaquetado y servidor de desarrollo |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Tailwind CSS 4](https://tailwindcss.com/) | Estilos |
| [React Router 7](https://reactrouter.com/) | Enrutamiento del SPA |
| [@react-oauth/google](https://github.com/MomenSherif/react-oauth) | Inicio de sesión con Google |
| [jwt-decode](https://github.com/auth0/jwt-decode) | Lectura del `id_token` |
| [Lucide React](https://lucide.dev/) | Iconos |
| [@dnd-kit/core](https://dndkit.com/) | Arrastrar y soltar en el tablero de postulaciones |
| [ESLint](https://eslint.org/) | Análisis estático |

### Aplicación móvil

| Herramienta | Uso |
|---|---|
| [Kotlin](https://kotlinlang.org/) | Lenguaje |
| [Jetpack Compose](https://developer.android.com/compose) | Interfaz declarativa |
| [Hilt](https://dagger.dev/hilt/) | Inyección de dependencias |
| [Retrofit](https://square.github.io/retrofit/) | Cliente HTTP |

### Infraestructura y diseño

| Herramienta | Uso |
|---|---|
| [Azure Static Web Apps](https://azure.microsoft.com/products/app-service/static) | Alojamiento de la web sobre HTTPS |
| [Azure API Management](https://azure.microsoft.com/products/api-management) | Mock Services y validación del token |
| [GitHub Actions](https://github.com/features/actions) | Integración y despliegue continuos |
| [Firebase App Distribution](https://firebase.google.com/products/app-distribution) | Distribución del APK a testers |
| [Google Identity Services](https://developers.google.com/identity) | Autenticación |
| [Figma](https://www.figma.com/) | Wireframes y maquetas |
| [Draw.io](https://www.drawio.com/) | Diagrama de arquitectura |

---

## Notas sobre el alcance

- Este repositorio corresponde únicamente a la **Fase I**: la información proviene de Mock Services, sin backend real.
- El `id_token` de Google tiene una vigencia de una hora y no se renueva automáticamente; al expirar, la aplicación cierra la sesión y solicita iniciar sesión de nuevo.
