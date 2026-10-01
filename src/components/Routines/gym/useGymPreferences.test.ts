import {
    DEFAULT_GYM_PREFERENCES,
    GYM_PREFERENCES_KEY,
    loadGymPreferences,
    useGymPreferences
} from "@/components/Routines/gym/useGymPreferences";
import { act, renderHook } from "@testing-library/react";

describe('gym preferences', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('are all on by default', () => {
        expect(loadGymPreferences()).toEqual({ soundEnabled: true, warningEnabled: true, autoAdvance: true });
    });

    test('are read from the storage', () => {
        window.localStorage.setItem(
            GYM_PREFERENCES_KEY,
            JSON.stringify({ soundEnabled: false, warningEnabled: true, autoAdvance: false })
        );

        expect(loadGymPreferences()).toEqual({ soundEnabled: false, warningEnabled: true, autoAdvance: false });
    });

    test('use the defaults for what is missing or of the wrong type', () => {
        window.localStorage.setItem(GYM_PREFERENCES_KEY, JSON.stringify({ soundEnabled: 'no', autoAdvance: false }));

        expect(loadGymPreferences()).toEqual({ soundEnabled: true, warningEnabled: true, autoAdvance: false });
    });

    test('use the defaults for garbage', () => {
        window.localStorage.setItem(GYM_PREFERENCES_KEY, '{not json');

        expect(loadGymPreferences()).toEqual(DEFAULT_GYM_PREFERENCES);
    });

    test('use the defaults when the storage can not be read', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        expect(loadGymPreferences()).toEqual(DEFAULT_GYM_PREFERENCES);
    });

    test('changes are stored', () => {
        const { result } = renderHook(() => useGymPreferences());

        act(() => result.current[1]({ autoAdvance: false }));

        expect(result.current[0]).toEqual({ soundEnabled: true, warningEnabled: true, autoAdvance: false });
        expect(JSON.parse(window.localStorage.getItem(GYM_PREFERENCES_KEY)!)).toEqual(result.current[0]);
    });

    test('still change when the storage can not be written', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });
        const { result } = renderHook(() => useGymPreferences());

        act(() => result.current[1]({ soundEnabled: false }));

        expect(result.current[0].soundEnabled).toBe(false);
    });
});
