import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, mocks) {
    const exports = {};
    const code = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    new Function('require', 'exports', code)(name => {
        if (name in mocks) return mocks[name];
        if (name.startsWith('.')) return { default: () => null };
        return require(name);
    }, exports);
    return exports;
}
const course = id => ({ id, title: 'Python', platform: 'Microsoft Learn', url: `https://learn.microsoft.com/training/${id}`,
    logoUrl: null, durationHours: null, isPaid: false, skills: ['Python', 'GitHub'] });

test('service sends partial and literal filters to the server with eight-item pagination', async () => {
    for (const filters of [{ platform: 'Microsoft Learn' }, { platform: 'micro' }, { platform: 'MICRO' },
        { platform: 'cour' }, { skillName: 'Python' }, { skillName: 'python' }, { skillName: 'pyth' }, { skillName: 'git' },
        { platform: 'micro', skillName: 'git', isPaid: false }, { platform: '100%_!\\' }]) {
        let calls = 0;
        const { courseService } = load('services/courseService.ts', { './http': { http: { async get(path) {
            calls++;
            const url = new URL(path, 'https://api.test');
            assert.equal(url.pathname, '/courses');
            assert.deepEqual(Object.fromEntries(url.searchParams), { page: '2', pageSize: '8',
                ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, String(v)])) });
            return { items: [course('9')], page: 2, pageSize: 8, totalRecords: 9 };
        } } } });
        const result = await courseService.getAll({ page: 2, ...filters });
        assert.equal(calls, 1);
        assert.equal(result.items.length, 1);
        assert.equal(result.totalRecords, 9);
        assert.equal(result.pageSize, 8);
    }
});

test('service preserves empty results and totals beyond the last page, and propagates failures', async () => {
    for (const totalRecords of [0, 19]) {
        const { courseService } = load('services/courseService.ts', { './http': { http: { async get() {
            return { items: [], page: 4, pageSize: 8, totalRecords };
        } } } });
        assert.deepEqual(await courseService.getAll({ page: 4, platform: 'missing' }),
            { items: [], page: 4, pageSize: 8, totalRecords, excluded: 0 });
    }
    const { courseService } = load('services/courseService.ts', { './http': { http: { async get() { throw new Error('offline'); } } } });
    await assert.rejects(courseService.getAll(), /offline/);
});

const { DICCIONARIO } = load('i18n/dictionary.ts', {});
function pageHarness(initial, locale = 'es') {
    let params = new URLSearchParams(initial);
    let states = [], index = 0, effect;
    const calls = [];
    let response = { items: [], page: 3, pageSize: 8, totalRecords: 0, excluded: 0 };
    const hooks = {
        useState(value) { const i = index++; if (!(i in states)) states[i] = value; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
        useEffect(fn) { effect = fn; },
    };
    const { default: Page } = load('pages/CoursesPage.tsx', {
        react: hooks,
        '../i18n/LocaleContext': { useLocale: () => ({ locale, t: DICCIONARIO[locale] }) },
        'react-router-dom': { useSearchParams: () => [params, next => { params = typeof next === 'function' ? next(params) : next; }] },
        '../services/courseService': { courseService: { async getAll(query) { calls.push(query); if (response instanceof Error) throw response; return response; } } },
        '../services/http': { describeError: () => 'Error de carga' },
        '../components/ui/Feedback': { LoadingSpinner: 'spinner', ErrorMessage: 'error' },
    });
    return { page: () => Page(), params: () => params, calls,
        render(element, fresh = false) { if (fresh) states = []; index = 0; return element.type(element.props); },
        async fetch() { effect(); await new Promise(resolve => setImmediate(resolve)); },
        response(value) { response = value; },
    };
}
const content = element => JSON.stringify(element);

test('page keeps filters in URL, resets page on apply and clear, and preserves filters when paging', () => {
    const h = pageHarness('platform=micro&skillName=git&isPaid=false&page=3');
    const tree = h.page();
    const form = tree.props.children[2];
    const results = tree.props.children[3];
    results.props.onPage(2);
    assert.deepEqual(Object.fromEntries(h.params()), { platform: 'micro', skillName: 'git', isPaid: 'false', page: '2' });
    form.props.onApply({ platform: ' MICRO ', skillName: ' python ', isPaid: true });
    assert.deepEqual(Object.fromEntries(h.params()), { platform: 'MICRO', skillName: 'python', isPaid: 'true' });
    form.props.onApply({});
    assert.equal(h.params().toString(), '');
    assert.match(content(h.render(form, true)), /parte del nombre/);
});

test('results request only one server page and display loading, no matches, error and retry', async () => {
    const h = pageHarness('platform=micro&skillName=git&isPaid=false&page=3');
    const results = h.page().props.children[3];
    assert.equal(h.render(results, true).type, 'spinner');
    await h.fetch();
    assert.deepEqual(h.calls, [{ page: 3, pageSize: 8, platform: 'micro', skillName: 'git', isPaid: false }]);
    assert.match(content(h.render(results)), /texto más corto/);
    h.response(new Error('offline'));
    h.render(results, true);
    await h.fetch();
    const error = h.render(results);
    assert.equal(error.type, 'error');
    error.props.onRetry();
    assert.equal(h.render(results).type, 'spinner');
    h.response({ items: [course('17')], page: 3, pageSize: 8, totalRecords: 17, excluded: 0 });
    await h.fetch();
    const loaded = h.render(results);
    assert.equal(loaded.props.children[0].props.children.join(''), 'Página 3 · 17 cursos en el catálogo con estos filtros.');
    assert.equal(loaded.props.children[4].props.totalPages, 3);
    assert.equal(h.calls.length, 3);
});


test('partial search descriptions and empty results are available in Spanish and English', async () => {
    for (const locale of ['es', 'en']) {
        const h = pageHarness('platform=micro', locale);
        const tree = h.page();
        const form = h.render(tree.props.children[2], true);
        const text = content(form);
        assert.ok(text.includes(DICCIONARIO[locale].courses.partialNames));
        assert.match(text, locale === 'es' ? /sin distinguir mayúsculas/ : /regardless of capitalization/);
        assert.match(text, locale === 'es' ? /acentos se conservan/ : /Accents are preserved/);
        const results = tree.props.children[3];
        h.render(results, true);
        await h.fetch();
        assert.ok(content(h.render(results)).includes(DICCIONARIO[locale].courses.noneWithFilters));
    }
});
