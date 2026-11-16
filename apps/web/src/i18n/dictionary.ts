import type { Locale } from '../components/cv/cvLabels';

/**
 * Los textos de la interfaz, en los dos idiomas.
 *
 * Las claves describen dónde vive el texto, no lo que dice: si mañana
 * "Mis Currículums" pasa a llamarse de otra forma, la clave sigue sirviendo.
 * Agrupadas por pantalla para poder traducir una sin recorrer el archivo entero.
 *
 * Esto cubre la interfaz. Las etiquetas del documento del currículum —títulos
 * de sección, niveles de idioma, tipos de experiencia— ya vivían traducidas en
 * `cvLabels`, porque el renderizador y el PDF las necesitan aunque no haya
 * nadie mirando la pantalla.
 */
export type Dict = typeof es;

const es = {
    common: {
        cancel: 'Cancelar',
        save: 'Guardar cambios',
        saving: 'Guardando…',
        close: 'Cerrar',
        back: 'Atrás',
        next: 'Siguiente',
        retry: 'Reintentar',
        loading: 'Cargando…',
        search: 'Buscar',
        seeAll: 'Ver todas',
        edit: 'Editar',
        view: 'Ver',
        delete: 'Eliminar',
        download: 'Descargar',
        yes: 'Sí',
        no: 'No',
    },

    nav: {
        dashboard: 'Panel Principal',
        cvs: 'Mis Currículums',
        profile: 'Mi Perfil',
        skillsGap: 'Análisis de Brechas',
        templates: 'Plantillas / Offline',
        jobs: 'Ofertas Laborales',
        applications: 'Postulaciones',
        notifications: 'Notificaciones',
        notificationTemplates: 'Plantillas de avisos',
        settings: 'Configuración',
        tagline: 'Tu carrera, más clara',
        openMenu: 'Abrir menú',
        closeMenu: 'Cerrar menú',
        version: 'Versión',
    },

    account: {
        myAccount: 'Mi cuenta',
        profile: 'Mi Perfil',
        settings: 'Configuración',
        logout: 'Cerrar sesión',
    },

    settings: {
        title: 'Configuración',
        eyebrow: 'Tu espacio',
        appearance: 'Apariencia',
        appearanceSubtitle: 'Personaliza cómo se ve la aplicación.',
        theme: 'Tema',
        themeLight: 'Claro',
        themeDark: 'Oscuro',
        language: 'Idioma',
        languageHint: 'Cambia el idioma de la aplicación y el de tus notificaciones.',
        timezone: 'Zona Horaria',
        notifications: 'Notificaciones',
        notificationsSubtitle: 'Elige qué novedades quieres recibir.',
        applicationStatus: 'Estado de Postulación',
        courseRecommendation: 'Recomendación de Curso',
        jobAlerts: 'Alertas de Empleo',
        data: 'Datos',
        dataSubtitle: 'Controla tus datos y documentos legales.',
        exportData: 'Descargar mis datos',
        deleteAccount: 'Eliminar Cuenta',
        privacy: 'Políticas de Privacidad',
        terms: 'Términos y Condiciones',
        account: 'Cuenta',
        accountSubtitle: 'Administra tu acceso y seguridad.',
        notAvailable: 'Todavía no disponible',
    },

    languages: {
        es: 'Español',
        en: 'Inglés',
    },
};

const en: Dict = {
    common: {
        cancel: 'Cancel',
        save: 'Save changes',
        saving: 'Saving…',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        retry: 'Try again',
        loading: 'Loading…',
        search: 'Search',
        seeAll: 'See all',
        edit: 'Edit',
        view: 'View',
        delete: 'Delete',
        download: 'Download',
        yes: 'Yes',
        no: 'No',
    },

    nav: {
        dashboard: 'Dashboard',
        cvs: 'My Resumes',
        profile: 'My Profile',
        skillsGap: 'Skills Gap',
        templates: 'Templates / Offline',
        jobs: 'Job Offers',
        applications: 'Applications',
        notifications: 'Notifications',
        notificationTemplates: 'Notice templates',
        settings: 'Settings',
        tagline: 'Your career, clearer',
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
        version: 'Version',
    },

    account: {
        myAccount: 'My account',
        profile: 'My Profile',
        settings: 'Settings',
        logout: 'Sign out',
    },

    settings: {
        title: 'Settings',
        eyebrow: 'Your space',
        appearance: 'Appearance',
        appearanceSubtitle: 'Customize how the app looks.',
        theme: 'Theme',
        themeLight: 'Light',
        themeDark: 'Dark',
        language: 'Language',
        languageHint: 'Changes the language of the app and of your notifications.',
        timezone: 'Time zone',
        notifications: 'Notifications',
        notificationsSubtitle: 'Choose which updates you want to receive.',
        applicationStatus: 'Application status',
        courseRecommendation: 'Course recommendation',
        jobAlerts: 'Job alerts',
        data: 'Data',
        dataSubtitle: 'Manage your data and legal documents.',
        exportData: 'Download my data',
        deleteAccount: 'Delete account',
        privacy: 'Privacy Policy',
        terms: 'Terms and Conditions',
        account: 'Account',
        accountSubtitle: 'Manage your access and security.',
        notAvailable: 'Not available yet',
    },

    languages: {
        es: 'Spanish',
        en: 'English',
    },
};

export const DICCIONARIO: Record<Locale, Dict> = { es, en };
