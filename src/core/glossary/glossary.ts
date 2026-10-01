/*
 * The glossary of abbreviations and training terms.
 *
 * Only the ids and how an abbreviation written in the UI maps to them live
 * here. The texts (what it is, how it helps, an example) are translated, under
 * `glossary.terms.<id>` in the translation file.
 */

import { useTranslation } from "react-i18next";

export const GLOSSARY_TERMS = [
    'oneRm',
    'rir',
    'rpe',
    'doubleProgression',
    'deload',
    'superset',
    'amrap',
    'pr',
    'volume',
    'kcal',
    'macros',
    'nutriScore',
    'nova',
    'movingAverage',
    'hr',
    'stepsPerMinute',
    'bpm',
] as const;

export type GlossaryTerm = typeof GLOSSARY_TERMS[number];

/** The parts of an entry, each a translation key `glossary.terms.<id>.<part>` */
export const GLOSSARY_PARTS = ['what', 'how', 'example'] as const;
export type GlossaryPart = typeof GLOSSARY_PARTS[number];

/** Other ways to write a term, besides its id. Keys are normalized, see `normalizeTerm`. */
const ALIASES: Record<string, GlossaryTerm> = {
    '1rm': 'oneRm',
    'onerepmax': 'oneRm',
    'e1rm': 'oneRm',
    'est1rm': 'oneRm',
    'personalrecord': 'pr',
    'personalbest': 'pr',
    'calories': 'kcal',
    'macronutrients': 'macros',
    'nutriscore': 'nutriScore',
    'movingaverage': 'movingAverage',
    '7daymovingaverage': 'movingAverage',
    '7dayaverage': 'movingAverage',
    'heartrate': 'hr',
    'stepsmin': 'stepsPerMinute',
    'stepspermin': 'stepsPerMinute',
    'cadence': 'stepsPerMinute',
    'repsinreserve': 'rir',
    'ratingofperceivedexertion': 'rpe',
    'beatsperminute': 'bpm',
};

/** Lower case with everything that is not a letter or digit removed: "Steps/min" -> "stepsmin" */
export const normalizeTerm = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

const BY_NORMALIZED: Record<string, GlossaryTerm> = {
    ...Object.fromEntries(GLOSSARY_TERMS.map(term => [normalizeTerm(term), term])),
    ...ALIASES,
};

/** The glossary entry an id or abbreviation stands for, undefined for something that is not in the glossary */
export function resolveTerm(text: string): GlossaryTerm | undefined {
    return BY_NORMALIZED[normalizeTerm(text)];
}

export const glossaryKey = (term: GlossaryTerm, part: 'abbr' | 'name' | GlossaryPart): string =>
    `glossary.terms.${term}.${part}`;

/** Looks up the translated text of a glossary entry */
export function useGlossaryText(): (term: GlossaryTerm, part: 'abbr' | 'name' | GlossaryPart) => string {
    const { t } = useTranslation();
    // The keys are built from the ids, so they cannot be checked against the typed keys of the translation file
    return (term, part) => (t as unknown as (key: string) => string)(glossaryKey(term, part));
}
