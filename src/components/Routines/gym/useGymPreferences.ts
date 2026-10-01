import { useCallback, useState } from "react";

export const GYM_PREFERENCES_KEY = 'wger-gym-mode-preferences';

export interface GymPreferences {
    soundEnabled: boolean,
    warningEnabled: boolean,
    autoAdvance: boolean,
}

export const DEFAULT_GYM_PREFERENCES: GymPreferences = {
    soundEnabled: true,
    warningEnabled: true,
    autoAdvance: true,
};

/** Reads the stored preferences. Storage can be blocked or hold garbage, so anything unusable means the defaults. */
export function loadGymPreferences(): GymPreferences {
    try {
        const raw = window.localStorage.getItem(GYM_PREFERENCES_KEY);
        if (raw === null) {
            return DEFAULT_GYM_PREFERENCES;
        }

        const parsed = JSON.parse(raw);
        const pick = (key: keyof GymPreferences) =>
            typeof parsed?.[key] === 'boolean' ? parsed[key] as boolean : DEFAULT_GYM_PREFERENCES[key];
        return {
            soundEnabled: pick('soundEnabled'),
            warningEnabled: pick('warningEnabled'),
            autoAdvance: pick('autoAdvance'),
        };
    } catch {
        return DEFAULT_GYM_PREFERENCES;
    }
}

export function saveGymPreferences(preferences: GymPreferences): void {
    try {
        window.localStorage.setItem(GYM_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
        // Not being able to remember is fine, the toggles still work for this visit
    }
}

export function useGymPreferences(): [GymPreferences, (changes: Partial<GymPreferences>) => void] {
    const [preferences, setPreferences] = useState<GymPreferences>(loadGymPreferences);

    const update = useCallback((changes: Partial<GymPreferences>) => {
        setPreferences(previous => {
            const next = { ...previous, ...changes };
            saveGymPreferences(next);
            return next;
        });
    }, []);

    return [preferences, update];
}
