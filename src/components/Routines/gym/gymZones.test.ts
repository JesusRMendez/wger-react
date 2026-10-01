import { ZoneOrderItem } from "@/components/Locations";
import { createGymState, gymReducer } from "@/components/Routines/gym/gymSession";
import {
    countZoneChanges,
    effectiveBudgetMinutes,
    estimateSessionSeconds,
    estimateSetSeconds,
    estimateWorkSeconds,
    matchZoneItems,
    missingEquipmentFor,
    movesToReach,
    REP_SET_SECONDS,
    secondsToMinutes,
    suggestedKeyOrder,
    suggestSetDrops,
    zoneNamesByKey,
} from "@/components/Routines/gym/gymZones";
import { gymBenchPress, gymExercises, gymSquats, gymTimed } from "@/tests/gymTestData";

const item = (slotEntryId: number, exerciseId: number, zone: string | null, plannedIndex: number): ZoneOrderItem => ({
    slotId: slotEntryId,
    slotEntryId,
    exerciseId,
    zoneId: zone === null ? null : zone.length,
    zoneName: zone,
    plannedIndex,
});

// Planned: squats (rack), bench (bench), curls (rack). Suggested: squats, curls, bench
const items = [
    item(1, gymSquats.exerciseId, 'Rack', 0),
    item(3, gymTimed.exerciseId, 'Rack', 2),
    item(2, gymBenchPress.exerciseId, 'Bench area', 1),
];

describe('zones', () => {
    test('matches the items by slot entry', () => {
        const matched = matchZoneItems(gymExercises, items);

        expect(matched.get(gymSquats.key)).toBe(items[0]);
        expect(matched.get(gymBenchPress.key)).toBe(items[2]);
        expect(matched.get(gymTimed.key)).toBe(items[1]);
    });

    test('falls back to the exercise id, using each item once', () => {
        const twin = { ...gymSquats, key: 'twin', slotEntryId: 99 };
        const matched = matchZoneItems([gymSquats, twin], [item(1, gymSquats.exerciseId, 'Rack', 0)]);

        expect(matched.get(gymSquats.key)).toBeDefined();
        expect(matched.has('twin')).toBe(false);

        const byExercise = matchZoneItems([twin], [item(1000, gymSquats.exerciseId, 'Rack', 0)]);
        expect(byExercise.get('twin')?.zoneName).toBe('Rack');
    });

    test('names the zones, leaving out the exercises without one', () => {
        const matched = matchZoneItems(gymExercises, [item(1, gymSquats.exerciseId, 'Rack', 0), item(2, gymBenchPress.exerciseId, null, 1)]);

        expect(zoneNamesByKey(matched)).toEqual({ [gymSquats.key]: 'Rack' });
    });

    test('orders the keys as suggested, what is unknown goes last in its order', () => {
        const keys = [gymSquats.key, gymBenchPress.key, gymTimed.key, 'extra'];
        const matched = matchZoneItems(gymExercises, items);

        expect(suggestedKeyOrder(keys, matched, items)).toEqual([gymSquats.key, gymTimed.key, gymBenchPress.key, 'extra']);
    });

    test('counts the zone changes, ignoring exercises without a zone', () => {
        const zones = { a: 'Rack', b: 'Bench', c: 'Rack', d: 'Rack' };

        expect(countZoneChanges(['a', 'b', 'c', 'd'], zones)).toBe(2);
        expect(countZoneChanges(['a', 'c', 'd', 'b'], zones)).toBe(1);
        expect(countZoneChanges(['a', 'x', 'c'], zones)).toBe(0);
        expect(countZoneChanges([], zones)).toBe(0);
    });

    test('the moves reach the target through the reducer', () => {
        const target = [gymSquats.key, gymTimed.key, gymBenchPress.key];
        const moves = movesToReach(gymExercises.map(e => e.key), target);
        expect(moves.length).toBeGreaterThan(0);

        let state = createGymState(gymExercises, 0);
        for (const move of moves) {
            state = gymReducer(state, { type: 'move', ...move });
        }

        expect(state.order).toEqual(target);
    });

    test('no moves when the order is already right', () => {
        const keys = gymExercises.map(e => e.key);
        expect(movesToReach(keys, keys)).toEqual([]);
    });

    test('moves a longer reversal', () => {
        const keys = ['a', 'b', 'c', 'd'];
        const target = ['d', 'c', 'b', 'a'];
        const state = movesToReach(keys, target).reduce((order, move) => {
            const i = order.indexOf(move.key);
            const copy = [...order];
            [copy[i], copy[i - 1]] = [copy[i - 1], copy[i]];
            return copy;
        }, keys);

        expect(state).toEqual(target);
    });

    test('lists the missing equipment of the exercises of the session', () => {
        const result = missingEquipmentFor(gymExercises, [
            { exerciseId: gymBenchPress.exerciseId, equipment: [{ id: 8, name: 'Bench' }, { id: 9, name: 'Barbell' }] },
            { exerciseId: 12345, equipment: [{ id: 1, name: 'Other' }] },
            { exerciseId: gymSquats.exerciseId, equipment: [] },
        ]);

        expect(result).toEqual([{ key: gymBenchPress.key, exerciseId: gymBenchPress.exerciseId, equipment: ['Bench', 'Barbell'] }]);
    });
});

describe('time budget', () => {
    test('timed sets take their planned time, others a typical set', () => {
        expect(estimateWorkSeconds(gymTimed)).toBe(30);
        expect(estimateWorkSeconds({ ...gymTimed, repetitionUnit: { id: 4, name: 'Minutes' }, repetitions: 2 })).toBe(120);
        expect(estimateWorkSeconds(gymSquats)).toBe(REP_SET_SECONDS);
    });

    test('a set is work plus rest, with the default rest when the plan has none', () => {
        expect(estimateSetSeconds(gymSquats)).toBe(REP_SET_SECONDS + 120);
        expect(estimateSetSeconds(gymBenchPress)).toBe(REP_SET_SECONDS + 90);
        expect(estimateSetSeconds(gymTimed)).toBe(30 + 45);
    });

    test('the session is sets times work plus rest', () => {
        // squats 2 x 160, bench 1 x 130, curls 2 x 75
        expect(estimateSessionSeconds(gymExercises)).toBe(320 + 130 + 150);
        expect(estimateSessionSeconds(gymExercises, e => e.key === gymSquats.key ? 1 : 0)).toBe(160);
    });

    test('the budget is the smaller one of the location and the choice', () => {
        expect(effectiveBudgetMinutes(null, null)).toBeNull();
        expect(effectiveBudgetMinutes(40, null)).toBe(40);
        expect(effectiveBudgetMinutes(null, 30)).toBe(30);
        expect(effectiveBudgetMinutes(40, 30)).toBe(30);
        expect(effectiveBudgetMinutes(20, 30)).toBe(20);
    });

    test('rounds the minutes up', () => {
        expect(secondsToMinutes(600)).toBe(10);
        expect(secondsToMinutes(601)).toBe(11);
    });

    describe('suggestSetDrops', () => {
        const items = [
            { key: 'a', remainingSets: 4, setSeconds: 100 },
            { key: 'b', remainingSets: 3, setSeconds: 100 },
            { key: 'c', remainingSets: 3, setSeconds: 100 },
        ];

        test('drops nothing when it fits', () => {
            expect(suggestSetDrops(items, 1000)).toEqual({ drops: [], remainingSeconds: 1000, fits: true });
        });

        test('trims the exercise with the most sets first, the later one on a tie', () => {
            // 1000 s planned, budget 800: two sets go: a (4 -> 3), then a tie of 3, 3, 3 -> the last one
            const result = suggestSetDrops(items, 800);

            expect(result.drops).toEqual([{ key: 'a', sets: 1 }, { key: 'c', sets: 1 }]);
            expect(result.remainingSeconds).toBe(800);
            expect(result.fits).toBe(true);
        });

        test('keeps a set of each exercise as long as that is enough', () => {
            const result = suggestSetDrops(items, 300);

            expect(result.drops).toEqual([{ key: 'a', sets: 3 }, { key: 'b', sets: 2 }, { key: 'c', sets: 2 }]);
            expect(result.fits).toBe(true);
        });

        test('leaves exercises out, last first, when one set each is too much', () => {
            const result = suggestSetDrops(items, 150);

            expect(result.drops).toEqual([{ key: 'a', sets: 3 }, { key: 'b', sets: 3 }, { key: 'c', sets: 3 }]);
            expect(result.remainingSeconds).toBe(100);
            expect(result.fits).toBe(true);
        });

        test('reports when nothing is enough', () => {
            const result = suggestSetDrops([{ key: 'a', remainingSets: 2, setSeconds: 100 }], -1);

            expect(result.drops).toEqual([{ key: 'a', sets: 2 }]);
            expect(result.remainingSeconds).toBe(0);
            expect(result.fits).toBe(false);
        });

        test('ignores exercises with no sets left', () => {
            const result = suggestSetDrops([{ key: 'a', remainingSets: 0, setSeconds: 100 }], 0);

            expect(result).toEqual({ drops: [], remainingSeconds: 0, fits: true });
        });

        test('applied through the reducer, the sets are gone and the done ones stay', () => {
            let state = createGymState(gymExercises, 0);
            state = gymReducer(state, { type: 'logSet', repetitions: 5, weight: 80, now: 0 });
            state = gymReducer(state, { type: 'dropSets', drops: [{ key: gymSquats.key, sets: 5 }, { key: gymTimed.key, sets: 2 }] });

            expect(state.exercises.find(e => e.key === gymSquats.key)!.nrOfSets).toBe(1);
            expect(state.exercises.find(e => e.key === gymTimed.key)!.nrOfSets).toBe(0);
            // The squats are complete now, so the session goes on with the next exercise
            expect(state.currentKey).toBe(gymBenchPress.key);
        });
    });
});
