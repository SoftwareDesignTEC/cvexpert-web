# Explicación de la estructura del monorepo

## Carpetas principales

| Carpeta              | Responsable          | Descripción |
|----------------------|----------------------|-----------|
| `apps/web`           | Gabriel Pérez        | Aplicación web (React + Vite recomendado) |
| `apps/mobile`        | Andrés Zumbado       | Aplicación móvil (React Native Expo o Flutter) |
| `packages/shared`    | Todos (opcional)     | Tipos, interfaces, constantes y utilidades compartidas |
| `.github/workflows`  | Gabriel Cabrera      | Pipelines de CI/CD |
| `docs`               | Justin Mayorga       | Documentación adicional |

## Cómo empezar

1. Clonar el repositorio
2. Cada persona trabaja principalmente en su carpeta
3. Los mocks de Azure APIM los configura Gabriel Cabrera
4. El diseño de Figma lo mantiene Samuel Fajardo

## Próximos pasos recomendados

1. Decidir stack definitivo (React Native Expo vs Flutter)
2. Inicializar realmente los proyectos (`npm create vite@latest` en web, `npx create-expo-app` en mobile, etc.)
3. Configurar los secrets en GitHub (Azure token, Firebase, etc.)
4. Completar los workflows de CI/CD
