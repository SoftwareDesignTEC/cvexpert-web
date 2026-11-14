/**
 * Currículum de ejemplo para las vistas previas de las plantillas.
 *
 * Existe porque un recuadro gris con el nombre encima no deja ver en qué se
 * diferencian las plantillas: todas se ven iguales y hay que elegir a ciegas.
 * Dibujando este currículum con el diseño de cada una se ve de una lo que
 * importa —una o dos columnas, dónde va la foto, qué color usa, qué secciones
 * muestra— sin pedirle al servicio ninguna imagen.
 *
 * Los datos son inventados a propósito y no se parecen a los de nadie del
 * equipo: es un ejemplo, no el currículum de una persona real.
 *
 * Las claves son las mismas que usa el servicio de currículums, empezando por
 * `workExperiences`, y las fechas van en epoch de milisegundos, que es lo que
 * el renderizador espera. Si se escribieran como texto ISO, las fechas saldrían
 * vacías justo en la pantalla que existe para mostrar cómo queda el documento.
 */

// Silueta neutra en SVG, incrustada. Las plantillas que piden foto tienen que
// mostrar algo en ese lugar, y un enlace a una imagen remota dejaría el hueco
// vacío cuando no hay conexión, que es justo donde más se usa esta pantalla.
const FOTO_EJEMPLO =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">' +
        '<rect width="160" height="160" fill="#dbe2ea"/>' +
        '<circle cx="80" cy="62" r="28" fill="#9aa8bb"/>' +
        '<path d="M24 160c0-31 25-50 56-50s56 19 56 50z" fill="#9aa8bb"/>' +
        '</svg>',
    );

const fecha = (iso: string) => Date.parse(iso);

export const CV_MUESTRA: Record<string, unknown> = {
    id: 'muestra',
    title: 'Currículum de ejemplo',
    personalInfo: {
        fullName: 'Ana Quirós Méndez',
        email: 'ana.quiros@ejemplo.com',
        phone: '+506 8888 0000',
        address: 'San José, Costa Rica',
        birthDate: fecha('1998-04-12'),
        photoUrl: FOTO_EJEMPLO,
        bio: 'Desarrolladora con cuatro años de experiencia en aplicaciones web. '
            + 'Me interesa el trabajo cercano a las personas usuarias y la calidad '
            + 'del producto más que la cantidad de funciones.',
    },
    workExperiences: [
        {
            position: 'Desarrolladora de software',
            company: 'Tecnología Verde S.A.',
            type: 'formal',
            startDate: fecha('2023-02-01'),
            endDate: null,
            current: true,
            description: 'Desarrollo del portal de clientes y de su panel de reportes. '
                + 'Reduje a la mitad el tiempo de carga de la pantalla principal.',
        },
        {
            position: 'Desarrolladora junior',
            company: 'Consultora Delta',
            type: 'formal',
            startDate: fecha('2021-06-01'),
            endDate: fecha('2023-01-31'),
            current: false,
            description: 'Mantenimiento de sistemas internos y automatización de reportes mensuales.',
        },
    ],
    education: [
        {
            degree: 'Bachillerato en Ingeniería en Computación',
            field: 'Computación',
            institution: 'Instituto Tecnológico de Costa Rica',
            startDate: fecha('2017-03-01'),
            endDate: fecha('2021-12-15'),
            current: false,
        },
    ],
    skills: [
        { name: 'TypeScript',        category: 'technical', level: 'advanced' },
        { name: 'React',             category: 'technical', level: 'advanced' },
        { name: 'Bases de datos',    category: 'technical', level: 'intermediate' },
        { name: 'Trabajo en equipo', category: 'soft',      level: 'advanced' },
        { name: 'Comunicación',      category: 'soft',      level: 'expert' },
    ],
    languages: [
        { name: 'Español', level: 'native' },
        { name: 'Inglés',  level: 'advanced' },
    ],
    certifications: [
        {
            name: 'Scrum Foundation Professional',
            issuer: 'CertiProf',
            issuedAt: fecha('2024-05-20'),
        },
    ],
};
