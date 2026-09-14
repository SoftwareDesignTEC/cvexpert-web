// Configuracion del build: aqui se declara de donde salen los plugins y las dependencias.
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    // Ningun modulo puede declarar sus propios repositorios: todos usan estos.
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

// TODO: confirmar nombre comercial de la app (AGENTS.md seccion 10).
rootProject.name = "cvpro-app"
include(":app")
