import { GLOSSARY_TERMS, glossaryKey, normalizeTerm, resolveTerm } from "@/core/glossary/glossary";
import translations from "../../../public/locales/en/translation.json";

describe('glossary', () => {
    test('has the terms of the contract', () => {
        expect(GLOSSARY_TERMS).toHaveLength(17);
    });

    test('every term has all its texts in the translation file', () => {
        const terms = translations.glossary.terms as Record<string, Record<string, string>>;
        for (const term of GLOSSARY_TERMS) {
            for (const part of ['abbr', 'name', 'what', 'how', 'example']) {
                expect(terms[term]?.[part], `${term}.${part}`).toBeTruthy();
            }
        }
    });

    test('normalizes terms', () => {
        expect(normalizeTerm('Steps/min')).toBe('stepsmin');
        expect(normalizeTerm('7-day moving average')).toBe('7daymovingaverage');
    });

    test('resolves ids and the abbreviations written in the UI', () => {
        expect(resolveTerm('RIR')).toBe('rir');
        expect(resolveTerm('rir')).toBe('rir');
        expect(resolveTerm('1RM')).toBe('oneRm');
        expect(resolveTerm('Nutri-Score')).toBe('nutriScore');
        expect(resolveTerm('7-day moving average')).toBe('movingAverage');
        expect(resolveTerm('Steps/min')).toBe('stepsPerMinute');
        expect(resolveTerm('double progression')).toBe('doubleProgression');
        expect(resolveTerm('BPM')).toBe('bpm');
    });

    test('returns undefined for unknown terms', () => {
        expect(resolveTerm('normal')).toBeUndefined();
        expect(resolveTerm('')).toBeUndefined();
    });

    test('builds the translation keys', () => {
        expect(glossaryKey('rir', 'what')).toBe('glossary.terms.rir.what');
    });
});
