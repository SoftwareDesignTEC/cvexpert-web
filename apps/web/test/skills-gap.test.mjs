import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Solo funciones de servicio: sin DOM, red, navegador ni infraestructura adicional.
const require = createRequire(import.meta.url);
function loadService(name, http = {}) {
    const file = new URL(`../src/services/${name}.ts`, import.meta.url);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText;
    const exports = {};
    new Function('require', 'exports', code)(path => path === './http'
        ? { http, ApiError: class extends Error {} }
        : path.startsWith('./') ? loadService(path.slice(2), http) : require(path), exports);
    return exports;
}
const { jobGapInput, readJobGap, mergeJobGap, skillsGapService } = loadService('skillsGapService', {
    post: async (path, body) => {
        assert.equal(body.cv.id, 'cv1');
        assert.equal(path, '/skills-gap/evaluate');
        return response();
    },
});
const { toCvInput, withAddedSkill } = loadService('cvService');
const cv = () => ({
    id: 'cv1', userId: 'owner', createdAt: 1, updatedAt: 2, thumbnailUrl: null,
    title: 'Mi CV', templateId: 'template1',
    personalInfo: { id: 'person', fullName: 'Persona', email: 'persona@test.local',
        phone: '123', address: 'Dirección', photoUrl: 'https://photos.test/p', bio: 'Bio', birthDate: null,
        types: ['part-time'], modalities: ['remote'], sectors: ['Tecnología'] },
    workExperiences: [{ id: 'w', company: null, position: 'Dev', startDate: 1, endDate: null, current: true, description: 'Trabajo', type: 'freelance' }],
    education: [{ id: 'e', institution: 'U', degree: 'Grado', field: 'TI', startDate: 1, current: true }],
    skills: [{ id: 's', name: 'Python', level: 'intermediate', category: 'Técnica' }],
    languages: [{ id: 'l', name: 'Español', level: 'native' }],
    certifications: [{ id: 'c', name: 'Cert', issuer: 'U', issuedAt: 1, expiresAt: null, credentialUrl: 'https://cert.test/c' }],
});
const job = { id: 'job1', skills: ['Python', 'Git'], description: 'Python avanzado; Git intermedio.', requirements: [] };
function response() {
    return { cvId: 'cv1', dataSource: 'client_request', results: [{ jobId: 'job1', status: 'partial',
        requiredSkillsCount: 2, documentedMatchesCount: 1, documentedCoveragePercent: 50,
        matchedSkills: [{ name: 'Python', cvLevel: 'intermediate' }], notDocumentedSkills: ['Git'] }] };
}

test('cada endpoint recibe únicamente su proyección contractual', async () => {
    const recommendations = jobGapInput(cv(), job, false);
    assert.deepEqual(recommendations.jobs, [{ id: 'job1', skills: job.skills }]);
    const evaluation = jobGapInput(cv(), job, true);
    assert.equal(evaluation.jobs[0].description, job.description);
    assert.deepEqual(Object.keys(evaluation.cv), ['id', 'skills']);
    assert.deepEqual(Object.keys(evaluation.cv.skills[0]), ['name', 'level']);
    await skillsGapService.evaluateForJob(cv(), job);
    assert.throws(() => jobGapInput({ ...cv(), skills: [{ name: 'Git', level: 'unknown' }] }, job, true), /niveles inválidos/);
});

test('agregar una habilidad preserva cada sección y todos los opcionales del CV', () => {
    const source = cv();
    const before = structuredClone(source);
    const input = withAddedSkill(source, { name: 'Git', level: 'beginner', category: 'Técnica' });
    assert.deepEqual(source, before);
    assert.deepEqual(input, { title: source.title, templateId: source.templateId, personalInfo: source.personalInfo,
        workExperiences: source.workExperiences, education: source.education, languages: source.languages,
        certifications: source.certifications, skills: [...source.skills, { name: 'Git', level: 'beginner', category: 'Técnica' }] });
    assert.equal(toCvInput(source).personalInfo.birthDate, null);
    assert.equal(withAddedSkill(source, { name: ' PÝTHON ', level: 'expert', category: 'Blanda' }).skills.length, 1);
    assert.throws(() => withAddedSkill({ ...source, extraSection: ['dato importante'] }, { name: 'Git' }), /preservar/);
    assert.throws(() => withAddedSkill({ ...source, education: undefined }, { name: 'Git' }), /preservar/);
    assert.throws(() => withAddedSkill({ ...source, personalInfo: { ...source.personalInfo, birthDate: '2000-01-01' } }, { name: 'Git' }), /preservar/);
});

test('cero de cobertura y ausencia de información son estados distintos', () => {
    const raw = response();
    Object.assign(raw.results[0], { documentedMatchesCount: 0, documentedCoveragePercent: 0, matchedSkills: [], notDocumentedSkills: ['Python', 'Git'] });
    assert.equal(readJobGap(raw, 'cv1', 'job1', false).result.documentedCoveragePercent, 0);
    Object.assign(raw.results[0], { status: 'insufficient_information', requiredSkillsCount: 0, documentedCoveragePercent: null, notDocumentedSkills: [] });
    assert.equal(readJobGap(raw, 'cv1', 'job1', false).result.documentedCoveragePercent, null);
    assert.throws(() => readJobGap(raw, 'otro-cv', 'job1', false), /incompatible/);
    raw.results[0].documentedCoveragePercent = 0;
    assert.throws(() => readJobGap(raw, 'cv1', 'job1', false), /incompatible/);
});

test('se conservan niveles desconocidos, evidencia y déficit ordinal del servidor', () => {
    const raw = response();
    raw.results[0].skillLevelAssessments = [
        { name: 'Python', cvLevel: 'intermediate', requiredLevel: 'advanced', evidenceSource: 'description', evidenceText: '<b>Python avanzado</b>', detectionStatus: 'explicit', reason: null, status: 'documented_skill_below_required', deficitSteps: 1 },
        { name: 'Git', cvLevel: null, requiredLevel: null, evidenceSource: null, evidenceText: null, detectionStatus: 'conflict', reason: 'contradictory', status: 'not_documented', deficitSteps: null },
    ];
    raw.results[0].levelAnalysis = { scale: 'cv-skill-v1', comparedSkillsCount: 1, belowRequiredCount: 1, meetsRequiredCount: 0, notDocumentedCount: 1, unknownRequiredLevelCount: 0, conflictCount: 1 };
    const parsed = readJobGap(raw, 'cv1', 'job1', false);
    assert.equal(parsed.result.skillLevelAssessments[1].requiredLevel, null);
    assert.equal(parsed.result.skillLevelAssessments[0].evidenceText, '<b>Python avanzado</b>');
    raw.results[0].skillLevelAssessments[1].requiredLevel = 'expert';
    assert.throws(() => readJobGap(raw, 'cv1', 'job1', false), /incompatible/);
});

test('solo se muestran cursos reales del contrato y se combinan respuestas del mismo contexto', () => {
    const raw = response();
    raw.catalogStatus = 'consulted';
    raw.results[0].recommendations = [{ skillName: 'Git', catalogMatch: 'matched', courses: [{ id: '1', title: 'Git', platform: 'Plataforma', url: 'https://www.coursera.org/learn/git', logoUrl: null, durationHours: null, isPaid: false, skills: ['Git'] }] }];
    const courses = readJobGap(raw, 'cv1', 'job1', true);
    const evaluation = readJobGap(response(), 'cv1', 'job1', false);
    assert.equal(mergeJobGap(courses, evaluation).result.recommendations[0].courses[0].durationHours, null);
    assert.throws(() => mergeJobGap(courses, { ...evaluation, cvId: 'otro' }), /incompatible/);
    raw.results[0].recommendations[0].courses[0].url = 'javascript:alert(1)';
    assert.throws(() => readJobGap(raw, 'cv1', 'job1', true), /incompatible/);
});

test('cursos por déficit usan el filtro real del catálogo y excluyen ejemplos', async () => {
    const course = { id: '1', title: 'Git', platform: 'Plataforma', url: 'https://www.coursera.org/learn/git',
        logoUrl: null, durationHours: null, isPaid: false, skills: ['Git'] };
    const service = loadService('skillsGapService', { get: async path => {
        const url = new URL(path, 'https://api.test');
        assert.equal(url.pathname, '/courses');
        assert.deepEqual(Object.fromEntries(url.searchParams), { page: '1', pageSize: '5', skillName: 'Git' });
        return { items: [course, { ...course, id: '2', title: '[DEMO] Ejemplo' }], page: 1, pageSize: 5, totalRecords: 2 };
    } });
    const page = await service.skillsGapService.coursesForSkill('Git');
    assert.deepEqual(page.items, [course]);
    assert.equal(page.excluded, 1);
    assert.equal(page.totalRecords, 2);
});

const { projectCvForJob } = loadService('jobGapProjection');
const { coursesQuery, readCoursePage, safeCourseUrl } = loadService('courseService');

test('Inglés avanzado se proyecta con la denominación English o Inglés de la oferta, sin mutar el CV', () => {
    const source = cv();
    source.languages = [{ id: 'english', name: 'Inglés', level: 'advanced' }];
    const before = structuredClone(source);
    for (const name of ['English', 'Inglés', ' INGLÉS ']) {
        const projection = projectCvForJob(source, [name]);
        assert.deepEqual(projection.skills, [{ name: 'Python', level: 'intermediate' }, { name, level: 'advanced' }]);
        const offer = { ...job, skills: [name], description: 'Se requiere inglés.', requirements: [] };
        assert.deepEqual(jobGapInput(source, offer, false).cv, projection);
        assert.deepEqual(jobGapInput(source, offer, true).cv, projection);
    }
    assert.deepEqual(source, before);
});

test('las equivalencias humanas son exactas y acotadas; no se alteran las habilidades técnicas', () => {
    for (const [name, required] of [['Español', 'Spanish'], ['Francés', 'French'], ['Portugués', 'Portuguese'], ['Alemán', 'German']]) {
        assert.deepEqual(projectCvForJob({ id: 'cv', skills: [], languages: [{ name, level: 'advanced' }] }, [required]).skills,
            [{ name: required, level: 'advanced' }]);
    }
    const source = { id: 'cv', skills: [{ name: 'Java', level: 'beginner' }, { name: 'JavaScript', level: 'expert' }],
        languages: [{ name: 'Inglés', level: 'advanced' }] };
    assert.deepEqual(projectCvForJob(source, ['JavaScript', 'English literature']).skills, source.skills);
    assert.deepEqual(projectCvForJob(source, ['Java', 'English']).skills,
        [...source.skills, { name: 'English', level: 'advanced' }]);
});

test('los cuatro niveles lingüísticos se adaptan explícitamente sin cambiar el nivel original', () => {
    for (const [original, adapted] of [['basic', 'beginner'], ['intermediate', 'intermediate'], ['advanced', 'advanced'], ['native', 'expert']]) {
        const source = { id: 'cv', skills: [], languages: [{ name: 'Inglés', level: original }] };
        assert.deepEqual(projectCvForJob(source, ['English']).skills, [{ name: 'English', level: adapted }]);
        assert.equal(source.languages[0].level, original);
    }
    assert.throws(() => projectCvForJob({ id: 'cv', skills: [], languages: [{ name: 'Inglés', level: 'expert' }] }, ['English']), /niveles de idioma inválidos/);
});

test('un idioma no documentado sigue ausente y no se proyectan idiomas no exigidos', () => {
    const source = { id: 'cv', skills: [], languages: [{ name: 'Español', level: 'native' }] };
    assert.deepEqual(projectCvForJob(source, ['English']).skills, []);
    assert.deepEqual(projectCvForJob(source, []).skills, []);
});

test('skills tiene precedencia sobre languages, incluso con alias; las repeticiones no generan conflictos', () => {
    const source = { id: 'cv', skills: [{ name: 'Inglés', level: 'beginner' }],
        languages: [{ name: 'English', level: 'advanced' }, { name: 'Inglés', level: 'native' }] };
    for (const required of ['Inglés', 'English']) {
        assert.deepEqual(projectCvForJob(source, [required, required]).skills, [{ name: required, level: 'beginner' }]);
    }
    const languagesOnly = { ...source, skills: [] };
    assert.deepEqual(projectCvForJob(languagesOnly, ['English']).skills, [{ name: 'English', level: 'advanced' }]);
    assert.deepEqual(projectCvForJob(source, ['Inglés', 'English']).skills,
        [{ name: 'Inglés', level: 'beginner' }, { name: 'English', level: 'beginner' }]);
});

test('la proyección no fabrica un requisito de nivel para un idioma', () => {
    const source = { ...cv(), skills: [], languages: [{ name: 'Inglés', level: 'advanced' }] };
    const offer = { ...job, skills: ['English'], description: 'English requerido.', requirements: [] };
    assert.equal(jobGapInput(source, offer, true).jobs[0].description, offer.description);
    const raw = { cvId: source.id, dataSource: 'client_request', results: [{ jobId: offer.id, status: 'complete',
        requiredSkillsCount: 1, documentedMatchesCount: 1, documentedCoveragePercent: 100,
        matchedSkills: [{ name: 'English', cvLevel: 'advanced' }], notDocumentedSkills: [],
        skillLevelAssessments: [{ name: 'English', cvLevel: 'advanced', requiredLevel: null, evidenceSource: null,
            evidenceText: null, detectionStatus: 'unknown', reason: 'no_explicit_evidence', status: 'unknown_required_level', deficitSteps: null }],
        levelAnalysis: { scale: 'cv-skill-v1', comparedSkillsCount: 0, belowRequiredCount: 0, meetsRequiredCount: 0,
            notDocumentedCount: 0, unknownRequiredLevelCount: 1, conflictCount: 0 } }] };
    assert.equal(readJobGap(raw, source.id, offer.id, false).result.skillLevelAssessments[0].requiredLevel, null);
});

test('los filtros del catálogo combinan plataforma, habilidad y precio con URLSearchParams', () => {
    const filters = { platform: 'A & B', skillName: 'C++', isPaid: false };
    assert.deepEqual(Object.fromEntries(coursesQuery(2, 20, filters)), {
        page: '2', pageSize: '20', platform: 'A & B', skillName: 'C++', isPaid: 'false',
    });
    assert.equal(coursesQuery(1, 20, { isPaid: true }).get('isPaid'), 'true');
    assert.equal(coursesQuery(1, 20).has('isPaid'), false);
    assert.equal(coursesQuery(1, 20, { platform: '  ', skillName: '' }).has('platform'), false);
    assert.throws(() => coursesQuery(0, 20), /no es válida/);
    assert.throws(() => coursesQuery(1, 101), /no es válida/);
});

test('el catálogo descarta filas inválidas y de demostración sin alterar la paginación del servidor', () => {
    const course = { id: '1', title: 'Curso de Git', platform: 'Plataforma', url: 'https://www.coursera.org/learn/git',
        logoUrl: null, durationHours: null, isPaid: true, skills: ['Git'] };
    const page = readCoursePage({ page: 2, pageSize: 20, totalRecords: 42, items: [course,
        { ...course, id: '2', url: 'javascript:alert(1)' }, { ...course, id: '3', title: '[DEMO] Ficticio' },
        { ...course, id: '4', url: 'https://example.com/curso' }, { ...course, id: '5', isPaid: null },
        { ...course, id: '6', durationHours: -1 }, course] }, 2, 20);
    assert.deepEqual(page.items, [course]);
    assert.equal(page.excluded, 6);
    assert.equal(page.totalRecords, 42);
    assert.equal(page.page, 2);
    assert.equal(page.pageSize, 20);
    assert.deepEqual(readCoursePage({ page: 1, pageSize: 20, totalRecords: 0, items: [] }, 1, 20).items, []);
    assert.throws(() => readCoursePage({ page: 1, pageSize: 20, totalRecords: 1, items: [course] }, 2, 20), /incompatible/);
    assert.equal(safeCourseUrl('http://platform.org/course'), true);
    assert.equal(safeCourseUrl('https://user:password@platform.org/course'), false);
    assert.equal(safeCourseUrl('data:text/html,course'), false);
});

test('GET /courses utiliza la página y los filtros solicitados; conserva errores para reintento', async () => {
    const { courseService } = loadService('courseService', { get: async path => {
        const url = new URL(path, 'https://api.test');
        assert.equal(url.pathname, '/courses');
        assert.deepEqual(Object.fromEntries(url.searchParams), { page: '3', pageSize: '20', platform: 'Plataforma', skillName: 'Git', isPaid: 'true' });
        return { page: 3, pageSize: 20, totalRecords: 40, items: [] };
    } });
    const page = await courseService.getAll({ page: 3, pageSize: 20, platform: 'Plataforma', skillName: 'Git', isPaid: true });
    assert.equal(page.totalRecords, 40);
    const failed = loadService('courseService', { get: async () => { throw new Error('Catálogo temporalmente no disponible'); } });
    await assert.rejects(() => failed.courseService.getAll(), /temporalmente/);
});
