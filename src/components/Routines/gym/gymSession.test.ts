import {
    buildGymPlan,
    canMove,
    createGymState,
    DEFAULT_REST_SECONDS,
    describePlannedSet,
    doneSetsOf,
    exerciseName,
    findExercise,
    formatClock,
    formatNumber,
    formatRepetitions,
    formatWeight,
    gymReducer,
    GymState,
    hasLoggableValue,
    isMaxRepsUnit,
    needsRepetitionCount,
    isAllDone,
    isComplete,
    isOutOfOrder,
    isTimeKind,
    latestLogFor,
    nextPending,
    orderedExercises,
    parseNumberInput,
    progressOf,
    repetitionUnitKind,
    restAlertsBetween,
    restRemaining,
    restSecondsFor,
    secondsToValue,
    toLogEntries,
    valueToSeconds,
    weightUnitKind,
} from "@/components/Routines/gym/gymSession";
import { Day } from "@/components/Routines/models/Day";
import { Routine } from "@/components/Routines/models/Routine";
import { RoutineDayData } from "@/components/Routines/models/RoutineDayData";
import { SetConfigData } from "@/components/Routines/models/SetConfigData";
import { SlotData } from "@/components/Routines/models/SlotData";
import { logsPayload } from "@/components/Routines/widgets/forms/sessionLogsFormData";
import { yyyymmddToDate } from "@/core/lib/date";
import { testExerciseSquats } from "@/tests/exerciseTestdata";
import {
    gymBenchPress,
    gymExercises,
    gymRepUnitFailure,
    gymRepUnitKilometers,
    gymRepUnitMinutes,
    gymRepUnitRepetitions,
    gymRepUnitSeconds,
    gymSquats,
    gymTimed,
    gymWeightUnitBodyWeight,
    gymWeightUnitKg,
    gymWeightUnitKmh,
    gymWeightUnitLb,
    gymWeightUnitPlates,
} from "@/tests/gymTestData";
import { DateTime } from "luxon";

const T0 = 1_000_000;

const startState = () => createGymState(gymExercises, T0);

/** Logs `count` sets of whatever is current */
const logSets = (state: GymState, count: number, now = T0): GymState => {
    for (let i = 0; i < count; i++) {
        state = gymReducer(state, { type: 'logSet', repetitions: 5, weight: 80, now });
    }
    return state;
};

describe('unit helpers', () => {
    test.each([
        [{ id: 1, name: 'Repetitions' }, 'repetitions'],
        [{ id: 2, name: 'Until Failure' }, 'failure'],
        [{ id: 3, name: 'Seconds' }, 'seconds'],
        [{ id: 4, name: 'Minutes' }, 'minutes'],
        [{ id: 5, name: 'Miles' }, 'distance'],
        [{ id: 6, name: 'Kilometers' }, 'distance'],
        [{ id: 7, name: 'Max Reps' }, 'repetitions'],
        [{ id: 8, name: 'Meters' }, 'distance'],
        [{ id: 99, name: 'Something new' }, 'other'],
        // Unknown names fall back to the ids the app knows
        [{ id: 1, name: '???' }, 'repetitions'],
        [{ id: 2, name: '???' }, 'failure'],
        [null, 'repetitions'],
    ])('repetition unit %j is %s', (unit, expected) => {
        expect(repetitionUnitKind(unit)).toBe(expected);
    });

    test.each([
        [{ id: 1, name: 'kg' }, 'weight'],
        [{ id: 2, name: 'lb' }, 'weight'],
        [{ id: 3, name: 'Body Weight' }, 'bodyWeight'],
        [{ id: 4, name: 'Plates' }, 'plates'],
        [{ id: 5, name: 'Kilometers Per Hour' }, 'speed'],
        [{ id: 6, name: 'Miles Per Hour' }, 'speed'],
        [{ id: 7, name: 'km/h' }, 'speed'],
        [{ id: 99, name: 'Stones' }, 'other'],
        [null, 'none'],
    ])('weight unit %j is %s', (unit, expected) => {
        expect(weightUnitKind(unit)).toBe(expected);
    });

    test('only seconds and minutes are time based', () => {
        expect(isTimeKind('seconds')).toBe(true);
        expect(isTimeKind('minutes')).toBe(true);
        expect(isTimeKind('repetitions')).toBe(false);
        expect(isTimeKind('failure')).toBe(false);
        expect(isTimeKind('distance')).toBe(false);
    });

    test('converts between a unit value and seconds', () => {
        expect(valueToSeconds(30, 'seconds')).toBe(30);
        expect(valueToSeconds(2, 'minutes')).toBe(120);
        expect(secondsToValue(29.6, 'seconds')).toBe(30);
        expect(secondsToValue(90, 'minutes')).toBe(1.5);
        expect(secondsToValue(100, 'minutes')).toBe(1.7);
    });

    test('formats numbers without noise', () => {
        expect(formatNumber(5)).toBe('5');
        expect(formatNumber(2.5)).toBe('2.5');
        expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    });

    test('repetitions are printed with the name of their unit', () => {
        expect(formatRepetitions(8, null, gymRepUnitRepetitions)).toBe('8 Repetitions');
        expect(formatRepetitions(8, 10, gymRepUnitRepetitions)).toBe('8-10 Repetitions');
        expect(formatRepetitions(8, 8, gymRepUnitRepetitions)).toBe('8 Repetitions');
        expect(formatRepetitions(30, null, gymRepUnitSeconds)).toBe('30 Seconds');
        expect(formatRepetitions(2, null, gymRepUnitMinutes)).toBe('2 Minutes');
        expect(formatRepetitions(5, null, gymRepUnitKilometers)).toBe('5 Kilometers');
        expect(formatRepetitions(null, null, gymRepUnitRepetitions)).toBe('Repetitions');
    });

    test('until failure has no number, only the unit', () => {
        expect(formatRepetitions(1, null, gymRepUnitFailure)).toBe('Until Failure');
        expect(formatRepetitions(null, null, gymRepUnitFailure)).toBe('Until Failure');
    });

    test('weights are printed with the name of their unit', () => {
        expect(formatWeight(80, null, gymWeightUnitKg)).toBe('80 kg');
        expect(formatWeight(100, null, gymWeightUnitLb)).toBe('100 lb');
        expect(formatWeight(2, null, gymWeightUnitPlates)).toBe('2 Plates');
        expect(formatWeight(12.5, null, gymWeightUnitKmh)).toBe('12.5 km/h');
        expect(formatWeight(20, 25, gymWeightUnitKg)).toBe('20-25 kg');
    });

    test('a missing weight stays empty, except for body weight which is the unit itself', () => {
        expect(formatWeight(null, null, gymWeightUnitKg)).toBe('');
        expect(formatWeight(null, null, null)).toBe('');
        expect(formatWeight(null, null, gymWeightUnitBodyWeight)).toBe('Body Weight');
        expect(formatWeight(0, null, gymWeightUnitKg)).toBe('0 kg');
    });

    test('describes a planned set from the data', () => {
        expect(describePlannedSet(gymSquats)).toBe('5-6 Repetitions x 80 kg');
        expect(describePlannedSet(gymTimed)).toBe('30 Seconds x Body Weight');
        expect(describePlannedSet(gymBenchPress)).toBe('10 Repetitions x 40 lb');
    });
});

describe('parseNumberInput', () => {
    test.each([
        ['12', 12],
        [' 12.5 ', 12.5],
        ['12,5', 12.5],
        ['0', 0],
        ['.5', 0.5],
        ['', null],
        ['   ', null],
    ])('%j parses to %j', (text, expected) => {
        expect(parseNumberInput(text)).toBe(expected);
    });

    test.each(['abc', '-1', '1.2.3', '1e3', '--'])('%j is invalid', (text) => {
        expect(parseNumberInput(text)).toBeUndefined();
    });
});

describe('buildGymPlan', () => {
    const setConfig = (slotEntryId: number, exerciseId: number, overrides: Partial<{ restTime: number | null }> = {}) =>
        new SetConfigData({
            exerciseId,
            exercise: testExerciseSquats,
            slotEntryId,
            type: 'normal',
            nrOfSets: 3,
            weight: 60,
            weightUnitId: 4,
            weightUnit: gymWeightUnitPlates,
            weightRounding: null,
            repetitions: 30,
            repetitionsUnitId: 3,
            repetitionsUnit: gymRepUnitSeconds,
            repetitionsRounding: null,
            rir: null,
            restTime: overrides.restTime === undefined ? 60 : overrides.restTime,
            textRepr: '',
            comment: 'c',
        });

    const day = new Day({ id: 7, routineId: 1, order: 1, name: 'Day' });
    const routine = new Routine({
        id: 1,
        name: 'r',
        description: '',
        created: new Date('2024-01-01'),
        start: yyyymmddToDate('2024-05-01'),
        end: yyyymmddToDate('2024-06-01'),
        fitInWeek: false,
        isTemplate: false,
        isPublic: false,
        days: [day],
        dayData: [
            new RoutineDayData(2, yyyymmddToDate('2024-05-05'), '', day, [
                // A superset: two entries in one slot
                new SlotData('', true, [345, 2], [setConfig(10, 345), setConfig(11, 2, { restTime: 0 })], []),
                new SlotData('', false, [345], [setConfig(12, 345, { restTime: null })], []),
            ]),
            new RoutineDayData(1, yyyymmddToDate('2024-05-12'), '', day, [
                new SlotData('', false, [345], [setConfig(13, 345)], []),
            ]),
        ],
    });

    test('has one exercise per entry, in routine order, with units from the data', () => {
        const { exercises, iteration } = buildGymPlan(routine, 7, yyyymmddToDate('2024-05-05'));

        expect(iteration).toBe(2);
        expect(exercises.map(e => e.slotEntryId)).toEqual([10, 11, 12]);
        expect(exercises.map(e => e.plannedIndex)).toEqual([0, 1, 2]);
        expect(new Set(exercises.map(e => e.key)).size).toBe(3);
        expect(exercises[0].repetitionUnit).toBe(gymRepUnitSeconds);
        expect(exercises[0].weightUnit).toBe(gymWeightUnitPlates);
        expect(exercises[0].nrOfSets).toBe(3);
    });

    test('keeps the rest of the plan, zero included, and null when there is none', () => {
        const { exercises } = buildGymPlan(routine, 7, yyyymmddToDate('2024-05-05'));

        expect(exercises.map(e => e.restTime)).toEqual([60, 0, null]);
    });

    test('uses the current iteration when the date is not part of the sequence', () => {
        const { exercises, iteration } = buildGymPlan(routine, 7, yyyymmddToDate('2030-01-01'));

        // Nothing is planned for that date, the first iteration is offered instead
        expect(iteration).toBeNull();
        expect(exercises.map(e => e.slotEntryId)).toEqual([13]);
    });

    test('is empty for a day without data', () => {
        expect(buildGymPlan(routine, 99, yyyymmddToDate('2024-05-05')).exercises).toEqual([]);
    });

    test('leaves out exercises that could not be loaded', () => {
        const broken = setConfig(20, 345);
        broken.exercise = undefined;
        const other = new Routine({
            ...routine,
            created: routine.created,
            days: [day],
            dayData: [new RoutineDayData(1, yyyymmddToDate('2024-05-05'), '', day, [
                new SlotData('', false, [345], [broken, setConfig(21, 345)], [])
            ])],
        });

        const { exercises } = buildGymPlan(other, 7, yyyymmddToDate('2024-05-05'));

        expect(exercises.map(e => e.slotEntryId)).toEqual([21]);
    });
});

describe('rest of an exercise', () => {
    test('is the one of the plan', () => {
        expect(restSecondsFor(gymSquats)).toBe(120);
    });

    test('falls back to the default only when the plan has none', () => {
        expect(restSecondsFor(gymBenchPress)).toBe(DEFAULT_REST_SECONDS);
        expect(restSecondsFor({ ...gymBenchPress, restTime: 0 })).toBe(0);
    });
});

describe('session state', () => {
    test('starts on the first exercise, in plan order', () => {
        const state = startState();

        expect(state.currentKey).toBe(gymSquats.key);
        expect(state.order).toEqual(gymExercises.map(e => e.key));
        expect(state.logged).toEqual([]);
        expect(state.rest).toBeNull();
        expect(progressOf(state)).toEqual({ done: 0, total: 5 });
    });

    test('has no current exercise for an empty plan', () => {
        const state = createGymState([], T0);

        expect(state.currentKey).toBeNull();
        expect(nextPending(state)).toBeNull();
        expect(isAllDone(state)).toBe(true);
    });

    test('logging a set records it with the units of the exercise', () => {
        const state = gymReducer(startState(), { type: 'logSet', repetitions: 6, weight: 82.5, now: T0 });

        expect(state.logged).toHaveLength(1);
        expect(state.logged[0]).toMatchObject({
            exerciseKey: gymSquats.key,
            exerciseId: gymSquats.exerciseId,
            slotEntryId: gymSquats.slotEntryId,
            repetitions: 6,
            weight: 82.5,
            repetitionUnit: gymRepUnitRepetitions,
            weightUnit: gymWeightUnitKg,
            restSeconds: 120,
        });
        expect(doneSetsOf(state, gymSquats.key)).toBe(1);
        expect(progressOf(state).done).toBe(1);
    });

    test('values and weight can be left empty', () => {
        const state = gymReducer(startState(), { type: 'logSet', repetitions: null, weight: null, now: T0 });

        expect(state.logged[0].repetitions).toBeNull();
        expect(state.logged[0].weight).toBeNull();
    });

    test('set ids are unique, also after removing one', () => {
        let state = logSets(startState(), 2);
        state = gymReducer(state, { type: 'removeSet', id: state.logged[0].id });
        state = gymReducer(state, { type: 'select', key: gymBenchPress.key });
        state = logSets(state, 1);

        expect(state.logged.map(s => s.id)).toEqual([2, 3]);
    });

    test('an exercise is complete when all its sets are done, and no more sets are logged', () => {
        let state = logSets(startState(), 2);

        expect(isComplete(state, gymSquats.key)).toBe(true);
        const before = state;
        state = gymReducer(state, { type: 'logSet', repetitions: 5, weight: 80, now: T0 });
        expect(state).toBe(before);
    });

    test('removing a set makes room again', () => {
        let state = logSets(startState(), 2);
        state = gymReducer(state, { type: 'removeSet', id: state.logged[1].id });

        expect(isComplete(state, gymSquats.key)).toBe(false);
        expect(gymReducer(state, { type: 'removeSet', id: 999 })).toBe(state);
    });

    test('is all done when every set is', () => {
        let state = startState();
        state = logSets(state, 2);
        state = gymReducer(state, { type: 'advance' });
        state = logSets(state, 1);
        state = gymReducer(state, { type: 'advance' });
        expect(isAllDone(state)).toBe(false);
        state = logSets(state, 2);

        expect(isAllDone(state)).toBe(true);
        expect(progressOf(state)).toEqual({ done: 5, total: 5 });
    });
});

describe('rest after a set', () => {
    test('starts with the rest of the exercise that was done', () => {
        const state = gymReducer(startState(), { type: 'logSet', repetitions: 5, weight: 80, now: T0 });

        expect(state.rest).toEqual({ startedAt: T0, duration: 120, exerciseKey: gymSquats.key });
    });

    test('uses the default when the plan has no rest', () => {
        let state = gymReducer(startState(), { type: 'select', key: gymBenchPress.key });
        state = gymReducer(state, { type: 'logSet', repetitions: 10, weight: 40, now: T0 });

        expect(state.rest?.duration).toBe(DEFAULT_REST_SECONDS);
    });

    test('is the one of the exercise just done, even after jumping to another', () => {
        let state = gymReducer(startState(), { type: 'logSet', repetitions: 5, weight: 80, now: T0 });
        state = gymReducer(state, { type: 'select', key: gymTimed.key });

        expect(state.currentKey).toBe(gymTimed.key);
        expect(state.rest?.duration).toBe(120);
        expect(state.rest?.exerciseKey).toBe(gymSquats.key);

        // And the next set uses the rest of the new exercise
        state = gymReducer(state, { type: 'logSet', repetitions: 30, weight: null, now: T0 + 5000 });
        expect(state.rest).toEqual({ startedAt: T0 + 5000, duration: 45, exerciseKey: gymTimed.key });
    });

    test('there is none with a rest of zero', () => {
        const state = createGymState([{ ...gymSquats, restTime: 0 }], T0);
        const next = gymReducer(state, { type: 'logSet', repetitions: 5, weight: 80, now: T0 });

        expect(next.logged).toHaveLength(1);
        expect(next.rest).toBeNull();
    });

    test('counts down in whole seconds, rounded up', () => {
        const rest = { startedAt: T0, duration: 90, exerciseKey: 'x' };

        expect(restRemaining(rest, T0)).toBe(90);
        expect(restRemaining(rest, T0 + 1)).toBe(90);
        expect(restRemaining(rest, T0 + 1000)).toBe(89);
        expect(restRemaining(rest, T0 + 89_001)).toBe(1);
        expect(restRemaining(rest, T0 + 90_000)).toBe(0);
        expect(restRemaining(rest, T0 + 500_000)).toBe(0);
        expect(restRemaining(null, T0)).toBe(0);
    });

    test('finishing it clears it, and can move on to the next exercise', () => {
        let state = logSets(startState(), 2);
        const cleared = gymReducer(state, { type: 'finishRest', advance: false });
        expect(cleared.rest).toBeNull();
        expect(cleared.currentKey).toBe(gymSquats.key);

        state = gymReducer(state, { type: 'finishRest', advance: true });
        expect(state.rest).toBeNull();
        expect(state.currentKey).toBe(gymBenchPress.key);
    });
});

describe('rest alerts', () => {
    test('a double beep warning once at 20 seconds', () => {
        expect(restAlertsBetween(21, 20, 90)).toEqual(['warning']);
        expect(restAlertsBetween(25, 21, 90)).toEqual([]);
        expect(restAlertsBetween(20, 19, 90)).toEqual([]);
    });

    test('no warning when the whole rest is not longer than that', () => {
        expect(restAlertsBetween(20, 19, 20)).toEqual([]);
        expect(restAlertsBetween(15, 14, 15)).toEqual([]);
    });

    test('a tick for each of the last five seconds', () => {
        expect(restAlertsBetween(6, 5, 90)).toEqual(['tick']);
        expect(restAlertsBetween(5, 4, 90)).toEqual(['tick']);
        expect(restAlertsBetween(2, 1, 90)).toEqual(['tick']);
        expect(restAlertsBetween(7, 6, 90)).toEqual([]);
    });

    test('a long tone at zero', () => {
        expect(restAlertsBetween(1, 0, 90)).toEqual(['end']);
    });

    test('nothing is lost when seconds were skipped', () => {
        expect(restAlertsBetween(8, 0, 90)).toEqual(['tick', 'tick', 'tick', 'tick', 'tick', 'end']);
        expect(restAlertsBetween(30, 3, 90)).toEqual(['warning', 'tick', 'tick', 'tick']);
    });

    test('nothing while time does not move', () => {
        expect(restAlertsBetween(10, 10, 90)).toEqual([]);
    });

    test('a whole countdown has each alert in order', () => {
        const alerts: string[] = [];
        for (let remaining = 90; remaining > 0; remaining--) {
            alerts.push(...restAlertsBetween(remaining, remaining - 1, 90));
        }

        expect(alerts).toEqual(['warning', 'tick', 'tick', 'tick', 'tick', 'tick', 'end']);
    });

    test('formats the clock', () => {
        expect(formatClock(90)).toBe('1:30');
        expect(formatClock(5)).toBe('0:05');
        expect(formatClock(0)).toBe('0:00');
        expect(formatClock(-3)).toBe('0:00');
        expect(formatClock(600)).toBe('10:00');
    });
});

describe('next pending exercise', () => {
    test('is the current one while it has sets left', () => {
        expect(nextPending(logSets(startState(), 1))).toBe(gymSquats.key);
    });

    test('is the next one in order once the current is complete', () => {
        expect(nextPending(logSets(startState(), 2))).toBe(gymBenchPress.key);
    });

    test('skips the ones that are done', () => {
        let state = gymReducer(startState(), { type: 'select', key: gymBenchPress.key });
        state = logSets(state, 1);
        state = gymReducer(state, { type: 'select', key: gymSquats.key });
        state = logSets(state, 2);

        expect(nextPending(state)).toBe(gymTimed.key);
    });

    test('wraps around to what was skipped earlier', () => {
        let state = gymReducer(startState(), { type: 'select', key: gymTimed.key });
        state = logSets(state, 2);

        expect(nextPending(state)).toBe(gymSquats.key);
    });

    test('follows the order the user chose', () => {
        let state = gymReducer(startState(), { type: 'move', key: gymTimed.key, direction: 'up' });
        state = logSets(state, 2);

        expect(state.order).toEqual([gymSquats.key, gymTimed.key, gymBenchPress.key]);
        expect(nextPending(state)).toBe(gymTimed.key);
    });

    test('is null when everything is done', () => {
        let state = startState();
        for (const exercise of gymExercises) {
            state = gymReducer(state, { type: 'select', key: exercise.key });
            state = logSets(state, exercise.nrOfSets);
        }

        expect(nextPending(state)).toBeNull();
        // Nothing to advance to, the state stays put
        expect(gymReducer(state, { type: 'advance' }).currentKey).toBe(state.currentKey);
    });

    test('advance moves to it', () => {
        const state = gymReducer(logSets(startState(), 2), { type: 'advance' });

        expect(state.currentKey).toBe(gymBenchPress.key);
    });
});

describe('jumping and reordering', () => {
    test('a pending exercise can be selected', () => {
        const state = gymReducer(startState(), { type: 'select', key: gymTimed.key });

        expect(state.currentKey).toBe(gymTimed.key);
    });

    test('a finished or unknown exercise can not', () => {
        const state = logSets(startState(), 2);

        expect(gymReducer(state, { type: 'select', key: gymSquats.key })).toBe(state);
        expect(gymReducer(state, { type: 'select', key: 'nope' })).toBe(state);
    });

    test('jumping out of order is detected, going in order is not', () => {
        const start = startState();
        expect(isOutOfOrder(start)).toBe(false);
        expect(isOutOfOrder(gymReducer(start, { type: 'select', key: gymBenchPress.key }))).toBe(true);
        expect(isOutOfOrder(gymReducer(start, { type: 'select', key: gymSquats.key }))).toBe(false);
    });

    test('is in order again once what came before is done', () => {
        let state = gymReducer(startState(), { type: 'select', key: gymBenchPress.key });
        state = logSets(state, 1);
        state = gymReducer(state, { type: 'select', key: gymSquats.key });
        state = logSets(state, 2);
        state = gymReducer(state, { type: 'select', key: gymTimed.key });

        expect(isOutOfOrder(state)).toBe(false);
    });

    test('moving an exercise first makes it the one in line, so it is no deviation', () => {
        let state = gymReducer(startState(), { type: 'move', key: gymTimed.key, direction: 'up' });
        state = gymReducer(state, { type: 'move', key: gymTimed.key, direction: 'up' });
        state = gymReducer(state, { type: 'select', key: gymTimed.key });

        expect(state.order[0]).toBe(gymTimed.key);
        expect(isOutOfOrder(state)).toBe(false);
    });

    test('exercises move up and down', () => {
        let state = gymReducer(startState(), { type: 'move', key: gymSquats.key, direction: 'down' });
        expect(orderedExercises(state).map(e => e.key)).toEqual([gymBenchPress.key, gymSquats.key, gymTimed.key]);

        state = gymReducer(state, { type: 'move', key: gymSquats.key, direction: 'up' });
        expect(orderedExercises(state).map(e => e.key)).toEqual(gymExercises.map(e => e.key));
    });

    test('the ends of the list stay put', () => {
        const state = startState();

        expect(canMove(state, gymSquats.key, 'up')).toBe(false);
        expect(canMove(state, gymTimed.key, 'down')).toBe(false);
        expect(gymReducer(state, { type: 'move', key: gymSquats.key, direction: 'up' })).toBe(state);
        expect(gymReducer(state, { type: 'move', key: gymTimed.key, direction: 'down' })).toBe(state);
    });

    test('finished exercises are never in the way, and can not be moved', () => {
        let state = gymReducer(startState(), { type: 'select', key: gymBenchPress.key });
        state = logSets(state, 1);

        expect(canMove(state, gymBenchPress.key, 'up')).toBe(false);
        expect(canMove(state, gymBenchPress.key, 'down')).toBe(false);

        // Squats and the timed one are the neighbours now, the done bench press in between is skipped
        expect(canMove(state, gymTimed.key, 'up')).toBe(true);
        state = gymReducer(state, { type: 'move', key: gymTimed.key, direction: 'up' });
        expect(state.order.indexOf(gymTimed.key)).toBeLessThan(state.order.indexOf(gymSquats.key));
    });

    test('moving does not change what is current or the rest', () => {
        let state = logSets(startState(), 1);
        const rest = state.rest;
        state = gymReducer(state, { type: 'move', key: gymTimed.key, direction: 'up' });

        expect(state.currentKey).toBe(gymSquats.key);
        expect(state.rest).toBe(rest);
    });
});

describe('previous values', () => {
    const log = (exerciseId: number, day: number, repetitions: number) => ({
        exerciseId,
        date: new Date(2024, 0, day),
        repetitions,
        weight: 50,
        repetitionUnitObj: gymRepUnitRepetitions,
        weightUnitObj: gymWeightUnitKg,
    });

    test('is the newest log of that exercise, whatever the order of the list', () => {
        const logs = [log(1, 5, 8), log(2, 20, 99), log(1, 10, 9), log(1, 2, 7)];

        expect(latestLogFor(logs, 1)?.repetitions).toBe(9);
    });

    test('is undefined for an exercise without logs', () => {
        expect(latestLogFor([log(1, 5, 8)], 2)).toBeUndefined();
        expect(latestLogFor([], 2)).toBeUndefined();
    });
});

describe('saving', () => {
    test('turns the logged sets into log entries with both units', () => {
        let state = gymReducer(startState(), { type: 'logSet', repetitions: 6, weight: 82.5, now: T0 });
        state = gymReducer(state, { type: 'select', key: gymTimed.key });
        state = gymReducer(state, { type: 'logSet', repetitions: 31, weight: null, now: T0 });

        const entries = toLogEntries(state);

        expect(entries).toHaveLength(2);
        expect(entries[0]).toMatchObject({
            exercise: gymSquats.exercise,
            repetitionsUnit: gymRepUnitRepetitions,
            weightUnit: gymWeightUnitKg,
            slotEntry: gymSquats.slotEntryId,
            repetitions: 6,
            repetitionsTarget: 5,
            weight: 82.5,
            weightTarget: 80,
            rirTarget: 2,
        });
        // No weight stays empty, it is not turned into zero
        expect(entries[1]).toMatchObject({
            repetitionsUnit: gymRepUnitSeconds,
            weightUnit: gymWeightUnitBodyWeight,
            repetitions: 31,
            weight: '',
            weightTarget: '',
        });
        expect(new Set(entries.map(e => e.clientKey)).size).toBe(2);
    });

    test('the payload of the log form carries the unit ids and keeps empty sets when asked to', () => {
        let state = gymReducer(startState(), { type: 'logSet', repetitions: 6, weight: 82.5, now: T0 });
        state = gymReducer(state, { type: 'select', key: gymTimed.key });
        state = gymReducer(state, { type: 'logSet', repetitions: null, weight: null, now: T0 });
        const context = {
            date: DateTime.fromISO('2024-05-05T10:00:00'),
            sessionId: 'session-1',
            iteration: 2,
            dayId: 5,
            routineId: 1,
        };

        const payload = logsPayload(toLogEntries(state), { ...context, includeEmpty: true });

        expect(payload).toHaveLength(2);
        expect(payload[0]).toMatchObject({
            session: 'session-1',
            iteration: 2,
            day: 5,
            routine: 1,
            exercise: gymSquats.exerciseId,
            slot_entry: gymSquats.slotEntryId,
            repetitions_unit: gymRepUnitRepetitions.id,
            repetitions: 6,
            weight_unit: gymWeightUnitKg.id,
            weight: 82.5,
        });
        expect(payload[1]).toMatchObject({
            repetitions_unit: gymRepUnitSeconds.id,
            repetitions: null,
            weight_unit: gymWeightUnitBodyWeight.id,
            weight: null,
        });

        // The log form leaves sets without values out, which is still the default
        expect(logsPayload(toLogEntries(state), context)).toHaveLength(1);
    });
});

describe('helpers', () => {
    test('finds exercises by key', () => {
        const state = startState();

        expect(findExercise(state, gymBenchPress.key)).toBe(gymBenchPress);
        expect(findExercise(state, 'nope')).toBeUndefined();
        expect(findExercise(state, null)).toBeUndefined();
    });

    test('the name of an exercise comes from its translation', () => {
        expect(exerciseName(gymSquats)).toBe('Squats');
    });
});

describe('values that have to be entered', () => {
    test('recognizes the max reps unit by its name', () => {
        expect(isMaxRepsUnit({ id: 7, name: 'Max Reps' })).toBe(true);
        expect(isMaxRepsUnit({ id: 7, name: 'max_reps' })).toBe(true);
        expect(isMaxRepsUnit(gymRepUnitRepetitions)).toBe(false);
        expect(isMaxRepsUnit(null)).toBe(false);
    });

    test('until failure and max reps need the count that was reached', () => {
        expect(needsRepetitionCount(gymRepUnitFailure)).toBe(true);
        expect(needsRepetitionCount({ id: 7, name: 'Max Reps' })).toBe(true);
        expect(needsRepetitionCount(gymRepUnitRepetitions)).toBe(false);
        expect(needsRepetitionCount(gymRepUnitSeconds)).toBe(false);
        expect(needsRepetitionCount(null)).toBe(false);
    });

    test('a set needs repetitions or a weight', () => {
        expect(hasLoggableValue(null, null)).toBe(false);
        expect(hasLoggableValue(0, null)).toBe(true);
        expect(hasLoggableValue(null, 20)).toBe(true);
        expect(hasLoggableValue(8, 20)).toBe(true);
    });
});

describe('dropping sets', () => {
    test('takes sets out of the plan but never below what is done', () => {
        let state = startState();
        state = gymReducer(state, { type: 'logSet', repetitions: 5, weight: 80, now: 1 });
        state = gymReducer(state, { type: 'dropSets', drops: [{ key: gymSquats.key, sets: 5 }, { key: gymTimed.key, sets: 1 }] });

        expect(findExercise(state, gymSquats.key)!.nrOfSets).toBe(1);
        expect(findExercise(state, gymTimed.key)!.nrOfSets).toBe(gymTimed.nrOfSets - 1);
    });

    test('moves on when the current exercise is gone', () => {
        let state = startState();
        state = gymReducer(state, { type: 'dropSets', drops: [{ key: gymSquats.key, sets: 2 }] });

        expect(state.currentKey).toBe(gymBenchPress.key);
        expect(progressOf(state).total).toBe(3);
    });

    test('ignores empty drops', () => {
        const state = startState();
        const next = gymReducer(state, { type: 'dropSets', drops: [{ key: gymSquats.key, sets: 0 }] });

        expect(next.exercises.map(e => e.nrOfSets)).toEqual(state.exercises.map(e => e.nrOfSets));
    });
});
