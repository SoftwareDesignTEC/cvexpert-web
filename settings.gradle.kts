// Configuración del build: aquí se declara de dónde salen los plugins y las dependencias.
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    // Ningún módulo puede declarar sus propios repositorios: todos usan estos.
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

// TODO: confirmar nombre comercial de la app (AGENTS.md sección 10).
rootProject.name = "cvpro-app"
include(":app")
