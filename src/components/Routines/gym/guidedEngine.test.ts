import {
    canMoveExercise,
    COUNTDOWN_SECONDS,
    createGuidedState,
    currentExercise,
    currentStep,
    GuidedAction,
    guidedProgress,
    guidedReducer,
    GuidedState,
    guidedWorkKind,
    jumpWarnings,
    nextPendingStep,
    phaseRemaining,
    remainingSeconds,
    reorderWarnings,
    stepsOf,
    toGymState,
    upcomingStep,
    workSeconds,
} from "@/components/Routines/gym/guidedEngine";
import { toLogEntries } from "@/components/Routines/gym/gymSession";
import {
    gymBenchPress,
    gymRepUnitFailure,
    gymSquats,
    gymTimed,
    gymWeightUnitBodyWeight,
    gymWeightUnitKg
} from "@/tests/gymTestData";

const T0 = 1_000_000;
const sec = (n: number) => T0 + n * 1000;

// squats: 2 x reps, rest 120; bench: 1 x reps, no rest in the plan (90 default); curls: 2 x 30 s, rest 45
const exercises = [gymSquats, gymBenchPress, gymTimed];
const maxReps = {
    ...gymBenchPress,
    key: '3-4',
    plannedIndex: 3,
    slotEntryId: 4,
    nrOfSets: 1,
    repetitions: null,
    repetitionUnit: { id: 7, name: 'Max Reps' },
    weight: null,
    weightUnit: gymWeightUnitBodyWeight,
    restTime: 30,
};

const run = (state: GuidedState, ...actions: GuidedAction[]) => actions.reduce(guidedReducer, state);
const started = (list = exercises) => run(createGuidedState(list, T0), { type: 'start', now: T0 });
/** Gets through the countdown into the work of the first set */
const working = (list = exercises) => run(started(list), { type: 'tick', now: sec(COUNTDOWN_SECONDS) });

describe('work kinds', () => {
    test('repetitions wait for the Done button', () => {
        expect(guidedWorkKind(gymSquats)).toBe('reps');
        expect(workSeconds(gymSquats)).toBeNull();
    });

    test('seconds and minutes run on the clock', () => {
        expect(guidedWorkKind(gymTimed)).toBe('timed');
        expect(workSeconds(gymTimed)).toBe(30);
        expect(workSeconds({ ...gymTimed, repetitionUnit: { id: 4, name: 'Minutes' }, repetitions: 2 })).toBe(120);
    });

    test('a time unit without a duration waits for the Done button', () => {
        expect(guidedWorkKind({ ...gymTimed, repetitions: null })).toBe('reps');
    });

    test('max reps and until failure ask for the count', () => {
        expect(guidedWorkKind(maxReps)).toBe('maxReps');
        expect(guidedWorkKind({ ...gymSquats, repetitionUnit: gymRepUnitFailure })).toBe('maxReps');
    });
});

describe('plan', () => {
    test('the rounds are the sets of each exercise, in order', () => {
        const state = createGuidedState(exercises, T0);

        expect(stepsOf(state).map(s => s.id)).toEqual(['0-1#1', '0-1#2', '1-2#1', '2-3#1', '2-3#2']);
        expect(currentStep(state)?.id).toBe('0-1#1');
        expect(guidedProgress(state)).toEqual({ done: 0, total: 5 });
        expect(state.phase).toBe('ready');
    });

    test('an empty day is done right away', () => {
        expect(createGuidedState([], T0).phase).toBe('done');
    });

    test('estimates what is left', () => {
        // squats 2 x (40 + 120), bench 1 x (40 + 90), curls 2 x (30 + 45)
        expect(remainingSeconds(createGuidedState(exercises, T0))).toBe(320 + 130 + 150);
    });
});

describe('phases', () => {
    test('waits for the start, then counts down 3-2-1', () => {
        let state = createGuidedState(exercises, T0);
        expect(guidedReducer(state, { type: 'tick', now: sec(10) }).phase).toBe('ready');

        state = guidedReducer(state, { type: 'start', now: T0 });
        expect(state.phase).toBe('countdown');
        expect(phaseRemaining(state, T0)).toBe(3);
        expect(phaseRemaining(state, sec(1))).toBe(2);
        expect(phaseRemaining(state, sec(2.5))).toBe(1);
        expect(guidedReducer(state, { type: 'tick', now: sec(2.9) }).phase).toBe('countdown');
    });

    test('the countdown goes into the work, which waits for Done for repetitions', () => {
        const state = working();

        expect(state.phase).toBe('work');
        expect(state.phaseDuration).toBeNull();
        expect(phaseRemaining(state, sec(100))).toBeNull();
        // Time passing changes nothing, there is no clock
        expect(guidedReducer(state, { type: 'tick', now: sec(1000) })).toBe(state);
    });

    test('Done starts the rest of that exercise', () => {
        const state = run(working(), { type: 'finishWork', now: sec(20) });

        expect(state.phase).toBe('rest');
        expect(state.phaseDuration).toBe(120);
        expect(state.restExerciseKey).toBe(gymSquats.key);
        expect(guidedProgress(state).done).toBe(1);
        expect(state.results[0]).toMatchObject({ exerciseKey: gymSquats.key, repetitions: 5, weight: 80 });
    });

    test('the rest ends by itself and the next set starts', () => {
        let state = run(working(), { type: 'finishWork', now: sec(20) });

        state = guidedReducer(state, { type: 'tick', now: sec(20 + 119), autoAdvance: true });
        expect(state.phase).toBe('rest');

        state = guidedReducer(state, { type: 'tick', now: sec(20 + 120), autoAdvance: true });
        expect(state.phase).toBe('work');
        expect(currentStep(state)?.id).toBe('0-1#2');
    });

    test('without auto-advance the rest waits at zero', () => {
        let state = run(working(), { type: 'finishWork', now: sec(20) });

        state = guidedReducer(state, { type: 'tick', now: sec(500), autoAdvance: false });
        expect(state.phase).toBe('rest');
        expect(phaseRemaining(state, sec(500))).toBe(0);

        state = guidedReducer(state, { type: 'skipRest', now: sec(500) });
        expect(state.phase).toBe('work');
    });

    test('skipping the rest goes on right away', () => {
        const state = run(working(), { type: 'finishWork', now: sec(20) }, { type: 'skipRest', now: sec(30) });

        expect(state.phase).toBe('work');
        expect(currentStep(state)?.id).toBe('0-1#2');
        expect(state.phaseStartedAt).toBe(sec(30));
    });

    test('the plan has no rest: no rest phase', () => {
        const noRest = { ...gymSquats, restTime: 0 };
        const state = run(working([noRest, gymBenchPress]), { type: 'finishWork', now: sec(10) });

        expect(state.phase).toBe('work');
        expect(currentStep(state)?.id).toBe('0-1#2');
    });

    test('a timed set runs by itself and uses the unit of the plan', () => {
        const state = working([gymTimed]);
        expect(state.phaseDuration).toBe(30);
        expect(phaseRemaining(state, sec(3 + 10))).toBe(20);

        const after = guidedReducer(state, { type: 'tick', now: sec(3 + 30) });
        expect(after.phase).toBe('rest');
        expect(after.phaseDuration).toBe(45);
        expect(after.results[0]).toMatchObject({ repetitions: 30, weight: null });
        // The rest starts at the end of the work, not when the tick arrived
        expect(after.phaseStartedAt).toBe(sec(33));
    });

    test('finishing a timed set early records the time that was done', () => {
        const state = run(working([gymTimed]), { type: 'finishWork', now: sec(3 + 12) });

        expect(state.results[0].repetitions).toBe(12);
    });

    test('catches up over several phases when the clock was stopped (background tab)', () => {
        const state = guidedReducer(working([gymTimed]), { type: 'tick', now: sec(3 + 30 + 45 + 5) });

        expect(state.phase).toBe('work');
        expect(currentStep(state)?.id).toBe('2-3#2');
        expect(state.phaseStartedAt).toBe(sec(3 + 30 + 45));
    });

    test('max reps asks for the count before resting', () => {
        let state = run(working([maxReps, gymBenchPress]), { type: 'finishWork', now: sec(10) });

        expect(state.phase).toBe('askMaxReps');
        expect(state.results).toHaveLength(0);

        // A count is required
        expect(guidedReducer(state, { type: 'submitMaxReps', repetitions: null, now: sec(12) })).toBe(state);

        state = guidedReducer(state, { type: 'submitMaxReps', repetitions: 17, now: sec(12) });
        expect(state.phase).toBe('rest');
        expect(state.phaseDuration).toBe(30);
        expect(state.results[0]).toMatchObject({ repetitions: 17, weight: null });
    });

    test('the last set ends the routine without a rest', () => {
        const state = run(working([gymBenchPress]), { type: 'finishWork', now: sec(10) });

        expect(state.phase).toBe('done');
        expect(guidedProgress(state)).toEqual({ done: 1, total: 1 });
    });

    test('keeps the weight, with its unit, that the user typed', () => {
        const state = run(
            working([gymBenchPress]),
            { type: 'setWeight', key: gymBenchPress.key, weight: 42.5 },
            { type: 'finishWork', now: sec(10) },
        );

        expect(state.results[0].weight).toBe(42.5);
        const entry = toLogEntries(toGymState(state))[0];
        expect(entry.weight).toBe(42.5);
        expect(entry.weightUnit).toEqual({ id: 2, name: 'lb' });
    });

    test('an emptied weight is logged as none', () => {
        const state = run(
            working([gymSquats]),
            { type: 'setWeight', key: gymSquats.key, weight: null },
            { type: 'finishWork', now: sec(10) },
        );

        expect(state.results[0].weight).toBeNull();
        expect(gymSquats.weightUnit).toEqual(gymWeightUnitKg);
    });

    test('actions in the wrong phase do nothing', () => {
        const ready = createGuidedState(exercises, T0);

        expect(guidedReducer(ready, { type: 'finishWork', now: sec(1) })).toBe(ready);
        expect(guidedReducer(ready, { type: 'skipRest', now: sec(1) })).toBe(ready);
        expect(guidedReducer(working(), { type: 'start', now: sec(1) }).phase).toBe('work');
        expect(guidedReducer(working(), { type: 'submitMaxReps', repetitions: 3, now: sec(1) }).phase).toBe('work');
    });
});

describe('jump', () => {
    test('goes to the set with a new countdown', () => {
        const state = run(working(), { type: 'jump', stepId: '2-3#1', now: sec(20) });

        expect(state.phase).toBe('countdown');
        expect(currentStep(state)?.id).toBe('2-3#1');
        expect(state.phaseStartedAt).toBe(sec(20));
        expect(currentExercise(state)?.key).toBe(gymTimed.key);
    });

    test('what was skipped comes back after the sets of the new place', () => {
        let state = run(working(), { type: 'jump', stepId: '1-2#1', now: sec(10) }, { type: 'tick', now: sec(13) });
        state = run(state, { type: 'finishWork', now: sec(20) }, { type: 'skipRest', now: sec(21) });

        expect(currentStep(state)?.id).toBe('2-3#1');
    });

    test('wraps around to the skipped sets', () => {
        const state = createGuidedState(exercises, T0);
        const done = { ...state, doneIds: ['2-3#1', '2-3#2'], currentId: '2-3#2' };

        expect(nextPendingStep(done, '2-3#2')?.id).toBe('0-1#1');
    });

    test('cannot jump to a finished set, before starting or after the end', () => {
        const finished = run(working(), { type: 'finishWork', now: sec(10) });
        expect(guidedReducer(finished, { type: 'jump', stepId: '0-1#1', now: sec(11) })).toBe(finished);

        const ready = createGuidedState(exercises, T0);
        expect(guidedReducer(ready, { type: 'jump', stepId: '1-2#1', now: sec(1) })).toBe(ready);
        expect(guidedReducer(working(), { type: 'jump', stepId: 'nope', now: sec(1) }).phase).toBe('work');
    });

    test('warns about the sets that are skipped and the exercise that is left', () => {
        const state = working();

        expect(jumpWarnings(state, '0-1#1')).toEqual([]);
        // squats set 1 (in progress) and set 2 are left, and bench was planned before curls
        expect(jumpWarnings(state, '2-3#1')).toEqual([
            { type: 'skipsSets', count: 3 },
            { type: 'leavesExercise', key: gymSquats.key, remaining: 2 },
            { type: 'outOfPlan' },
        ]);
    });

    test('jumping to the next set of the same exercise only warns about the skipped one', () => {
        expect(jumpWarnings(working(), '0-1#2')).toEqual([{ type: 'skipsSets', count: 1 }]);
    });

    test('during the rest the finished set is not skipped', () => {
        const state = run(working(), { type: 'finishWork', now: sec(10) });

        expect(jumpWarnings(state, '1-2#1')).toEqual([
            { type: 'skipsSets', count: 1 },
            { type: 'leavesExercise', key: gymSquats.key, remaining: 1 },
            { type: 'outOfPlan' },
        ]);
        expect(jumpWarnings(state, '0-1#2')).toEqual([]);
    });
});

describe('reorder', () => {
    test('moves an exercise among the ones with sets left', () => {
        let state = working();
        expect(canMoveExercise(state, gymSquats.key, 'up')).toBe(false);
        expect(canMoveExercise(state, gymSquats.key, 'down')).toBe(true);

        state = guidedReducer(state, { type: 'move', key: gymTimed.key, direction: 'up' });
        expect(state.order).toEqual([gymSquats.key, gymTimed.key, gymBenchPress.key]);
        // The current set stays the one it was
        expect(currentStep(state)?.id).toBe('0-1#1');
    });

    test('finished exercises stay out of the way', () => {
        let state = working([gymBenchPress, gymSquats, gymTimed]);
        state = run(state, { type: 'finishWork', now: sec(10) });
        // Bench is finished, so squats is first in line among the pending
        expect(canMoveExercise(state, gymBenchPress.key, 'down')).toBe(false);
        expect(canMoveExercise(state, gymSquats.key, 'up')).toBe(false);
        expect(guidedReducer(state, { type: 'move', key: gymBenchPress.key, direction: 'down' })).toBe(state);
    });

    test('warns when the current exercise or the plan order is touched', () => {
        const state = working();

        expect(reorderWarnings(state, gymSquats.key, 'down')).toEqual(['movesCurrent', 'outOfPlan']);
        expect(reorderWarnings(state, gymTimed.key, 'up')).toEqual(['outOfPlan']);
        expect(reorderWarnings(state, gymSquats.key, 'up')).toEqual([]);
    });
});

describe('upcoming and saving', () => {
    test('the intro shows the next set to do', () => {
        let state = run(working(), { type: 'finishWork', now: sec(10) });
        expect(upcomingStep(state)?.id).toBe('0-1#2');

        state = run(state, { type: 'skipRest', now: sec(11) });
        // In work, "up next" is the set after the current one
        expect(upcomingStep(state)?.id).toBe('1-2#1');
    });

    test('there is nothing up next at the end', () => {
        expect(upcomingStep(run(working([gymBenchPress]), { type: 'finishWork', now: sec(10) }))).toBeUndefined();
    });

    test('the results are saved like a gym mode session, with their units', () => {
        const state = run(
            working([gymSquats, gymTimed]),
            { type: 'finishWork', now: sec(10) },
            { type: 'skipRest', now: sec(11) },
            { type: 'finishWork', now: sec(20) },
        );
        const gym = toGymState(state);

        expect(gym.logged).toHaveLength(2);
        expect(gym.logged[0]).toMatchObject({
            exerciseKey: gymSquats.key,
            repetitions: 5,
            weight: 80,
            repetitionUnit: { name: 'Repetitions' },
            weightUnit: { name: 'kg' },
            restSeconds: 120,
        });
        expect(toLogEntries(gym)).toHaveLength(2);
    });

    test('a set with neither repetitions nor weight is not saved', () => {
        const empty = { ...gymTimed, repetitions: null, restTime: 0, nrOfSets: 1 };
        const state = run(working([empty, gymBenchPress]), { type: 'finishWork', now: sec(10) }, { type: 'finishWork', now: sec(12) });

        expect(state.results).toHaveLength(2);
        expect(toGymState(state).logged).toHaveLength(1);
    });
});
