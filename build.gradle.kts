// Build de raiz: solo declara los plugins para que cada modulo los aplique.
// "apply false" = se registran las versiones pero no se aplican a este proyecto raiz.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}
