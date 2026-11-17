import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

// In-memory Node rendering only: no browser, DOM, HTTP, server or installed test tooling.
const require = createRequire(import.meta.url);
class ApiError extends Error { constructor(status) { super('Diagnostic fixture'); this.status = status; } }
function loader(locale = 'en') {
    const cache = new Map();
    let dictionary;
    const http = { ApiError, http: new Proxy({}, { get: () => () => { throw new Error('Unexpected HTTP in a rendering test'); } }) };
    function load(file) {
        if (file.pathname.endsWith('/i18n/LocaleContext.tsx')) return { useLocale: () => ({ locale, t: dictionary[locale] }) };
        if (file.pathname.endsWith('/services/http.ts')) return http;
        if (cache.has(file.href)) return cache.get(file.href);
        const exports = {};
        cache.set(file.href, exports);
        const code = ts.transpileModule(readFileSync(file, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
        }).outputText;
        new Function('require', 'exports', code)(name => {
            if (name === 'react-router-dom') return { useSearchParams: () => [new URLSearchParams('skillName=Git'), () => {}] };
            if (!name.startsWith('.')) return require(name);
            const relative = new URL(name, file);
            return load(existsSync(new URL(`${relative.href}.ts`)) ? new URL(`${relative.href}.ts`) : new URL(`${relative.href}.tsx`));
        }, exports);
        return exports;
    }
    const get = path => load(new URL(`../src/${path}`, import.meta.url));
    dictionary = get('i18n/dictionary.ts').DICCIONARIO;
    return { get, dictionary, render: (path, props = {}) => renderToStaticMarkup(createElement(get(path).default, props)) };
}

test('both locales have every key and matching named placeholders', () => {
    const { dictionary } = loader();
    const flatten = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) =>
        typeof value === 'string' ? [[`${prefix}${key}`, value]] : flatten(value, `${prefix}${key}.`));
    const es = Object.fromEntries(flatten(dictionary.es));
    const en = Object.fromEntries(flatten(dictionary.en));
    assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
    for (const key of Object.keys(es)) {
        assert.ok(es[key].trim() && en[key].trim(), key);
        const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
        assert.deepEqual(placeholders(es[key]), placeholders(en[key]), key);
    }
});

test('pagination keeps translated accessible labels, wrapping and button semantics', () => {
    const en = loader().render('components/ui/Pagination.tsx', { page: 2, totalPages: 3, onChange() {} });
    assert.match(en, /aria-label="Pagination"/);
    assert.match(en, /aria-label="Previous page"/);
    assert.match(en, /aria-current="page" aria-label="Page 2"/);
    assert.match(en, /flex-wrap/);
    assert.equal((en.match(/type="button"/g) ?? []).length, 5);
    const es = loader('es').render('components/ui/Pagination.tsx', { page: 2, totalPages: 3, onChange() {} });
    assert.match(es, /aria-label="Paginación"/);
});

test('compact lists render only eight initial items and translate their expansion action', () => {
    const html = loader().render('components/ui/ExpandableItems.tsx', {
        items: Array.from({ length: 10 }, (_, i) => i),
        children: visible => createElement('ul', {}, visible.map(i => createElement('li', { key: i }, `Skill ${i}`))),
    });
    assert.equal((html.match(/<li>/g) ?? []).length, 8);
    assert.match(html, /Show 2 more items/);
    assert.match(html, /aria-expanded="false"/);
    assert.doesNotMatch(html, /Skill 8/);
});

test('visual picker and selected card use English resources without a textual offer select', () => {
    const l = loader();
    const html = l.render('components/ui/JobOfferPickerDialog.tsx', { open: true, selectedId: '', onClose() {}, onSelect() {} });
    assert.match(html, /Select a job offer/);
    assert.match(html, /Search job offers/);
    assert.match(html, /Search complete catalog/);
    assert.doesNotMatch(html, /Seleccionar|Buscar ofertas|<select/);
    const job = { id: 'job1', title: 'Python Developer', company: 'Microsoft', location: 'San José' };
    const selected = l.render('components/ui/JobOfferSelection.tsx', { id: job.id, supplied: job, disabled: false, onChange() {} });
    assert.match(selected, /Microsoft/);
    assert.match(selected, /Change job offer/);
    assert.doesNotMatch(selected, /<select/);
});

test('offer details translate labels, preserve text safely and do not invent employment type', () => {
    const html = loader().render('components/ui/JobOfferPreview.tsx', { job: {
        id: 'job', title: 'Developer', company: 'Company', location: 'CR', modality: 'remote',
        type: 'full-time', typeProvided: false, description: '<script>fixture</script>', requirements: ['English'], skills: ['Python'],
    } });
    assert.match(html, /Remote/);
    assert.match(html, /Description/);
    assert.match(html, /Requirements/);
    assert.match(html, /&lt;script&gt;fixture&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>|Full-time/);
});

test('Courses keeps exact-match translated guidance while offering eight-item pages', () => {
    const l = loader();
    const html = l.render('pages/CoursesPage.tsx');
    assert.ok(html.includes(l.dictionary.en.courses.exactNames));
    assert.doesNotMatch(html, /parte del nombre|texto más corto|partial match/);
    const { courseService } = l.get('services/courseService.ts');
    assert.equal(typeof courseService.getAll, 'function');
});

test('listing error codes localize diagnostics without leaking their Spanish message into English UI', () => {
    const l = loader();
    const { JobListingError } = l.get('services/jobSearch.ts');
    const { jobErrorMessage } = l.get('i18n/jobErrorMessage.ts');
    const error = new JobListingError('unverifiedCatalog', 'Diagnóstico privado en español');
    assert.equal(jobErrorMessage(error, l.dictionary.en, 'Load'), l.dictionary.en.offerPicker.unverifiedCatalog);
    assert.equal(jobErrorMessage(error, l.dictionary.es, 'Cargar'), l.dictionary.es.offerPicker.unverifiedCatalog);
    assert.match(jobErrorMessage(new ApiError(0), l.dictionary.en, 'Load offers'), /connection/);
    const { formatMessage } = l.get('i18n/formatMessage.ts');
    assert.equal(formatMessage(l.dictionary.en.ux.pageOf, { page: 2, total: 5 }), 'Page 2 of 5');
});
