import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function loadSource(path, mocks = {}, timers = {}) {
    const file = new URL(`../src/${path}`, import.meta.url);
    const cache = new Map();
    function load(url) {
        if (cache.has(url.href)) return cache.get(url.href);
        const exports = {};
        cache.set(url.href, exports);
        const code = ts.transpileModule(readFileSync(url, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
        }).outputText;
        new Function('require', 'exports', 'setTimeout', 'clearTimeout', code)(
            name => mocks[name] ?? (name.startsWith('.') ? load(new URL(`${name}.ts`, url)) : require(name)),
            exports, timers.setTimeout ?? setTimeout, timers.clearTimeout ?? clearTimeout);
        return exports;
    }
    return load(file);
}
const { normalizeJobSearch, matchesJobSearch, paginateItems } = loadSource('services/jobSearch.ts');
const job = (id = '1') => ({ id, title: 'Python Developer', company: 'Microsoft', location: 'San José', modality: 'remote', requirements: [], skills: [] });
const httpModule = get => ({ http: { get }, toPaginated: (raw, pageSize, page) => Array.isArray(raw)
    ? { items: raw, page, pageSize, totalRecords: raw.length } : raw });

test('búsqueda parcial por título, empresa y ubicación, sin distinguir mayúsculas o acentos comunes', () => {
    for (const query of ['micro', 'MICRO', 'pyth', 'develop', 'san jos', 'SAN JOSE', '  San   José  '])
        assert.equal(matchesJobSearch(job(), query), true, query);
    assert.equal(matchesJobSearch(job(), 'otra empresa'), false);
    assert.equal(matchesJobSearch(job(), ''), true);
    assert.equal(normalizeJobSearch('  MÍcrÖ   soft '), 'micro soft');
    assert.equal(normalizeJobSearch('España'), 'españa');
    assert.equal(matchesJobSearch({ ...job(), title: 'C++ Developer' }, 'C++'), true);
});

test('páginas de hasta ocho reemplazan elementos y contemplan límites de 0, 7, 8 y 9', () => {
    for (const length of [0, 7, 8, 9]) {
        const items = Array.from({ length }, (_, i) => job(String(i)));
        const first = paginateItems(items, 1);
        assert.equal(first.items.length, Math.min(8, length));
        assert.equal(first.totalPages, length > 8 ? 2 : 1);
        if (length === 9) assert.deepEqual(paginateItems(items, 2).items, [items[8]]);
    }
    const items = Array.from({ length: 25 }, (_, i) => job(String(i)));
    const selected = items[2];
    const second = paginateItems(items, 2);
    assert.deepEqual(second.items.map(item => item.id), ['8', '9', '10', '11', '12', '13', '14', '15']);
    assert.equal(paginateItems(items, 4).items.length, 1);
    assert.equal(paginateItems(items, 99).page, 4);
    assert.equal(selected, items[2]);
    assert.equal(paginateItems(items.filter(item => item.id === '2'), 1).page, 1);
});

test('GET jobs codifica search y usa página 8 sin incluir el texto en la ruta', async () => {
    const search = 'micro & C++ 100%_';
    const { jobService } = loadSource('services/otherServices.ts', { './http': httpModule(async path => {
        const url = new URL(path, 'https://api.test');
        assert.equal(url.pathname, '/jobs');
        assert.deepEqual(Object.fromEntries(url.searchParams), { page: '2', pageSize: '8', search });
        return { page: 2, pageSize: 8, totalRecords: 9, items: [job()] };
    }) });
    const result = await jobService.getAll({ page: 2, pageSize: 8, search });
    assert.equal(result.paginationVerified, true);
    assert.equal(result.items[0].typeProvided, false);
});

test('respuestas sin metadatos o que ignoran pageSize no se consideran paginación verificable', async () => {
    for (const raw of [[job()], { page: 1, pageSize: 8, totalRecords: 9, items: Array.from({ length: 9 }, (_, i) => job(String(i))) },
        { page: 2, pageSize: 8, totalRecords: 1, items: [job()] }]) {
        const { jobService } = loadSource('services/otherServices.ts', { './http': httpModule(async () => raw) });
        assert.equal((await jobService.getAll({ page: 1, pageSize: 8 })).paginationVerified, false);
    }
});

test('el detalle conserva el ID opaco correctamente codificado', async () => {
    const { jobService } = loadSource('services/otherServices.ts', { './http': httpModule(async path => {
        assert.equal(path, '/jobs/job%2Fid%3F1');
        return job('job/id?1');
    }) });
    assert.equal((await jobService.getById('job/id?1')).id, 'job/id?1');
    const wrong = loadSource('services/otherServices.ts', { './http': httpModule(async () => job('otro-id')) });
    await assert.rejects(() => wrong.jobService.getById('job/id?1'), /otra oferta/);
});

function catalogLoader() {
    return loadSource('services/jobCatalogService.ts', { './otherServices': { jobService: {} } }).loadCompleteJobCatalog;
}

test('la búsqueda local solo recibe un catálogo completo sin descargarlo por cada consulta', async () => {
    const calls = [];
    const all = await catalogLoader()(async params => {
        calls.push(params);
        const start = (params.page - 1) * 100;
        return { page: params.page, pageSize: 100, totalRecords: 105, paginationVerified: true,
            items: Array.from({ length: Math.min(100, 105 - start) }, (_, i) => job(String(start + i))) };
    });
    assert.equal(all.length, 105);
    assert.deepEqual(calls, [{ page: 1, pageSize: 100 }, { page: 2, pageSize: 100 }]);
    for (const query of ['micro', 'pyth', 'san jose']) assert.equal(all.filter(item => matchesJobSearch(item, query)).length, 105);
    assert.equal(calls.length, 2);
});

test('un catálogo incompleto, repetido o cambiante nunca se presenta como global', async () => {
    const load = catalogLoader();
    await assert.rejects(() => load(async () => ({ items: [job()], paginationVerified: false })), /no informa una paginación verificable/);
    await assert.rejects(() => load(async () => ({ items: [job()], totalRecords: 2, paginationVerified: true })), /repitió ofertas/);
    await assert.rejects(() => load(async ({ page }) => ({ items: [job(String(page))], totalRecords: page === 1 ? 2 : 3, paginationVerified: true })), /cambió durante la carga/);
    await assert.rejects(() => load(async () => ({ items: [], totalRecords: 2, paginationVerified: true })), /No pudimos completar/);
    await assert.rejects(() => load(async ({ page }) => ({ items: [job(String(page))], totalRecords: 21, paginationVerified: true })), /límite de carga/);
});

test('cerrar o invalidar una carga detiene las páginas siguientes', async () => {
    let current = true;
    let calls = 0;
    await assert.rejects(() => catalogLoader()(async () => {
        calls++; current = false;
        return { items: [job()], totalRecords: 5, paginationVerified: true };
    }, () => current), /cancelada/);
    assert.equal(calls, 1);
});

test('los errores se propagan y un reintento vuelve a consultar sin devolver datos parciales', async () => {
    const load = catalogLoader();
    await assert.rejects(() => load(async () => { throw new Error('Servicio no disponible'); }), /no disponible/);
    const all = await load(async () => ({ items: [job()], totalRecords: 1, paginationVerified: true }));
    assert.equal(all.length, 1);
});

test('debounce de 350 ms cancela el texto anterior antes de publicar el nuevo', () => {
    const tasks = new Map();
    const updates = [];
    let cleanup;
    let nextId = 0;
    const { useDebouncedValue } = loadSource('hooks/useDebouncedValue.ts', {
        react: {
            useState: () => ['', value => updates.push(value)],
            useEffect: effect => { cleanup = effect(); },
        },
    }, { setTimeout: (callback, delay) => { assert.equal(delay, 350); tasks.set(++nextId, callback); return nextId; }, clearTimeout: id => tasks.delete(id) });
    useDebouncedValue('micro');
    assert.deepEqual(updates, []);
    cleanup();
    useDebouncedValue('microsoft');
    assert.equal(tasks.size, 1);
    [...tasks.values()].forEach(callback => callback());
    assert.deepEqual(updates, ['microsoft']);
    cleanup();
});
