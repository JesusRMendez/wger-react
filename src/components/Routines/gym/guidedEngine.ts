/*
 * The interval engine of the guided routine: a day trained as a timed
 * sequence of countdown, work, rest and (for max-rep sets) a question about
 * the count, set after set, exercise after exercise.
 *
 * Pure like gymSession: no timers, time comes in as milliseconds since the
 * epoch. The units of the plan are kept: time units run on the clock, plain
 * repetitions wait for a Done button, "max reps" asks for the count, and
 * weights keep their own unit.
 */

import {
    GymExercise,
    GymState,
    hasLoggableValue,
    isMaxRepsUnit,
    isTimeKind,
    LoggedSet,
    repetitionUnitKind,
    restSecondsFor,
    secondsToValue,
    valueToSeconds,
} from "@/components/Routines/gym/gymSession";

export const COUNTDOWN_SECONDS = 3;

export type GuidedPhase = 'ready' | 'countdown' | 'work' | 'rest' | 'askMaxReps' | 'done';
export type GuidedWork = 'timed' | 'reps' | 'maxReps';

/** How the work of an exercise's sets is done */
export function guidedWorkKind(exercise: GymExercise): GuidedWork {
    const kind = repetitionUnitKind(exercise.repetitionUnit);
    if (kind === 'failure' || isMaxRepsUnit(exercise.repetitionUnit)) {
        return 'maxReps';
    }
    if (isTimeKind(kind) && exercise.repetitions !== null && exercise.repetitions > 0) {
        return 'timed';
    }
    return 'reps';
}

/** The seconds a timed set lasts, null for the ones that wait for the Done button */
export function workSeconds(exercise: GymExercise): number | null {
    if (guidedWorkKind(exercise) !== 'timed') {
        return null;
    }
    return valueToSeconds(exercise.repetitions!, repetitionUnitKind(exercise.repetitionUnit));
}

export interface GuidedStep {
    id: string,
    exerciseKey: string,
    /** 1-based */
    set: number,
    totalSets: number,
}

export interface GuidedResult {
    stepId: string,
    exerciseKey: string,
    repetitions: number | null,
    weight: number | null,
    finishedAt: number,
}

export interface GuidedState {
    exercises: GymExercise[],
    /** Exercise keys in the order they are trained */
    order: string[],
    doneIds: string[],
    currentId: string | null,
    phase: GuidedPhase,
    phaseStartedAt: number | null,
    /** Seconds of the phase, null when it has no end of its own (waits for a button) */
    phaseDuration: number | null,
    /** The exercise whose rest is running */
    restExerciseKey: string | null,
    results: GuidedResult[],
    /** The weight the user typed for an exercise, in the unit of the plan */
    weights: Record<string, number | null>,
    startedAt: number,
}

export type GuidedAction =
    | { type: 'start', now: number }
    | { type: 'tick', now: number, autoAdvance?: boolean }
    | { type: 'finishWork', now: number }
    | { type: 'submitMaxReps', repetitions: number | null, now: number }
    | { type: 'skipRest', now: number }
    | { type: 'jump', stepId: string, now: number }
    | { type: 'move', key: string, direction: 'up' | 'down' }
    | { type: 'setWeight', key: string, weight: number | null };

export function createGuidedState(exercises: GymExercise[], now: number): GuidedState {
    const order = exercises.map(e => e.key);
    const state: GuidedState = {
        exercises,
        order,
        doneIds: [],
        currentId: null,
        phase: exercises.length === 0 ? 'done' : 'ready',
        phaseStartedAt: null,
        phaseDuration: null,
        restExerciseKey: null,
        results: [],
        weights: {},
        startedAt: now,
    };
    return { ...state, currentId: stepsOf(state)[0]?.id ?? null };
}

export const findGuidedExercise = (state: GuidedState, key: string | null): GymExercise | undefined =>
    key === null ? undefined : state.exercises.find(e => e.key === key);

/** Every set of every exercise, in the order of training */
export function stepsOf(state: GuidedState): GuidedStep[] {
    const steps: GuidedStep[] = [];
    for (const key of state.order) {
        const exercise = findGuidedExercise(state, key);
        if (exercise === undefined) {
            continue;
        }
        for (let set = 1; set <= exercise.nrOfSets; set++) {
            steps.push({ id: `${key}#${set}`, exerciseKey: key, set, totalSets: exercise.nrOfSets });
        }
    }
    return steps;
}

export const isStepDone = (state: GuidedState, id: string): boolean => state.doneIds.includes(id);

export const currentStep = (state: GuidedState): GuidedStep | undefined =>
    stepsOf(state).find(step => step.id === state.currentId);

export const currentExercise = (state: GuidedState): GymExercise | undefined =>
    findGuidedExercise(state, currentStep(state)?.exerciseKey ?? null);

export const guidedProgress = (state: GuidedState): { done: number, total: number } => {
    const steps = stepsOf(state);
    return { done: steps.filter(step => isStepDone(state, step.id)).length, total: steps.length };
};

/** The first set not done after the given one, wrapping around so that what was skipped comes back */
export function nextPendingStep(state: GuidedState, afterId: string | null): GuidedStep | undefined {
    const steps = stepsOf(state);
    const start = afterId === null ? -1 : steps.findIndex(step => step.id === afterId);
    for (let i = 1; i <= steps.length; i++) {
        const step = steps[(start + i) % steps.length];
        if (!isStepDone(state, step.id)) {
            return step;
        }
    }
    return undefined;
}

/** What comes after the current set: the next one still to do. During a rest this is what the intro shows. */
export function upcomingStep(state: GuidedState): GuidedStep | undefined {
    const current = state.currentId;
    if (current !== null && !isStepDone(state, current)) {
        return nextPendingStep({ ...state, doneIds: [...state.doneIds, current] }, current);
    }
    return nextPendingStep(state, current);
}


/* ---------------------------------------------------------------------------
 * Transitions
 * ------------------------------------------------------------------------- */

const enterPhase = (
    state: GuidedState,
    phase: GuidedPhase,
    now: number,
    duration: number | null,
    changes: Partial<GuidedState> = {},
): GuidedState => ({ ...state, ...changes, phase, phaseStartedAt: now, phaseDuration: duration });

/** Starts the work of the current step: timed ones run on the clock */
function beginWork(state: GuidedState, now: number): GuidedState {
    const exercise = currentExercise(state);
    return enterPhase(state, 'work', now, exercise === undefined ? null : workSeconds(exercise), { restExerciseKey: null });
}

/** The rest has ended (or there is none): the next set, or the end */
function goOn(state: GuidedState, now: number): GuidedState {
    const next = nextPendingStep(state, state.currentId);
    if (next === undefined) {
        return enterPhase(state, 'done', now, null, { restExerciseKey: null });
    }
    return beginWork({ ...state, currentId: next.id }, now);
}

/** The set is done with this number: records it, then rest or the end */
function completeSet(state: GuidedState, repetitions: number | null, now: number): GuidedState {
    const step = currentStep(state);
    const exercise = currentExercise(state);
    if (step === undefined || exercise === undefined) {
        return state;
    }

    const weight = step.exerciseKey in state.weights ? state.weights[step.exerciseKey] : exercise.weight;
    const done: GuidedState = {
        ...state,
        doneIds: [...state.doneIds, step.id],
        results: [...state.results, {
            stepId: step.id,
            exerciseKey: step.exerciseKey,
            repetitions,
            weight,
            finishedAt: now,
        }],
    };

    if (nextPendingStep(done, step.id) === undefined) {
        return enterPhase(done, 'done', now, null, { restExerciseKey: null });
    }

    const rest = restSecondsFor(exercise);
    if (rest <= 0) {
        return goOn(done, now);
    }
    return enterPhase(done, 'rest', now, rest, { restExerciseKey: exercise.key });
}

/** The value a finished set stands for: the planned one, or the time that was done for a timed set */
function plannedValue(exercise: GymExercise, elapsedSeconds: number | null): number | null {
    if (elapsedSeconds !== null && guidedWorkKind(exercise) === 'timed') {
        return secondsToValue(elapsedSeconds, repetitionUnitKind(exercise.repetitionUnit));
    }
    return exercise.repetitions;
}

export const phaseEndsAt = (state: GuidedState): number | null =>
    state.phaseStartedAt === null || state.phaseDuration === null
        ? null
        : state.phaseStartedAt + state.phaseDuration * 1000;

export function guidedReducer(state: GuidedState, action: GuidedAction): GuidedState {
    switch (action.type) {
        case 'start': {
            if (state.phase !== 'ready') {
                return state;
            }
            return enterPhase({ ...state, startedAt: action.now }, 'countdown', action.now, COUNTDOWN_SECONDS);
        }

        case 'tick': {
            let current = state;
            // More than one phase may have passed (a throttled tab), so go on until the clock is caught up
            for (let guard = 0; guard < 10000; guard++) {
                const end = phaseEndsAt(current);
                if (end === null || action.now < end) {
                    break;
                }
                if (current.phase === 'countdown') {
                    current = beginWork(current, end);
                } else if (current.phase === 'work') {
                    const exercise = currentExercise(current);
                    current = exercise === undefined ? current : completeSet(current, plannedValue(exercise, null), end);
                } else if (current.phase === 'rest') {
                    if (action.autoAdvance === false) {
                        break;
                    }
                    current = goOn(current, end);
                } else {
                    break;
                }
            }
            return current;
        }

        case 'finishWork': {
            const exercise = currentExercise(state);
            if (state.phase !== 'work' || exercise === undefined) {
                return state;
            }
            if (guidedWorkKind(exercise) === 'maxReps') {
                return enterPhase(state, 'askMaxReps', action.now, null);
            }
            const elapsed = state.phaseStartedAt === null ? null : Math.max(0, (action.now - state.phaseStartedAt) / 1000);
            return completeSet(state, plannedValue(exercise, elapsed), action.now);
        }

        case 'submitMaxReps': {
            // The count is required: a set without it has nothing to save
            if (state.phase !== 'askMaxReps' || action.repetitions === null) {
                return state;
            }
            return completeSet(state, action.repetitions, action.now);
        }

        case 'skipRest': {
            if (state.phase !== 'rest') {
                return state;
            }
            return goOn(state, action.now);
        }

        case 'jump': {
            const step = stepsOf(state).find(s => s.id === action.stepId);
            if (step === undefined || isStepDone(state, step.id) || state.phase === 'ready' || state.phase === 'done') {
                return state;
            }
            return enterPhase({ ...state, currentId: step.id }, 'countdown', action.now, COUNTDOWN_SECONDS, { restExerciseKey: null });
        }

        case 'move': {
            if (!canMoveExercise(state, action.key, action.direction)) {
                return state;
            }
            const pending = pendingKeys(state);
            const index = pending.indexOf(action.key);
            const neighbour = pending[action.direction === 'up' ? index - 1 : index + 1];
            const order = [...state.order];
            const from = order.indexOf(action.key);
            const to = order.indexOf(neighbour);
            [order[from], order[to]] = [order[to], order[from]];
            return { ...state, order };
        }

        case 'setWeight':
            return { ...state, weights: { ...state.weights, [action.key]: action.weight } };
    }
}

/** Exercises with sets left, in training order */
export const pendingKeys = (state: GuidedState): string[] =>
    state.order.filter(key => stepsOf(state).some(step => step.exerciseKey === key && !isStepDone(state, step.id)));

export function canMoveExercise(state: GuidedState, key: string, direction: 'up' | 'down'): boolean {
    const pending = pendingKeys(state);
    const index = pending.indexOf(key);
    if (index === -1 || state.phase === 'done') {
        return false;
    }
    return direction === 'up' ? index > 0 : index < pending.length - 1;
}


/* ---------------------------------------------------------------------------
 * Warnings
 * ------------------------------------------------------------------------- */

export type GuidedWarning =
    /** Sets that are still to do come before the target and are left for later */
    | { type: 'skipsSets', count: number }
    /** The exercise in progress still has sets left */
    | { type: 'leavesExercise', key: string, remaining: number }
    /** The target was planned after an exercise that is still waiting */
    | { type: 'outOfPlan' };

export function jumpWarnings(state: GuidedState, targetId: string): GuidedWarning[] {
    const steps = stepsOf(state);
    const target = steps.find(step => step.id === targetId);
    if (target === undefined) {
        return [];
    }

    const warnings: GuidedWarning[] = [];
    const pending = steps.filter(step => !isStepDone(state, step.id));
    const current = currentStep(state);

    // The set in progress counts too: it is left unfinished. A finished one (during the rest) is not pending.
    const targetIndex = pending.findIndex(step => step.id === targetId);
    const skipped = pending.slice(0, Math.max(0, targetIndex));
    if (skipped.length > 0) {
        warnings.push({ type: 'skipsSets', count: skipped.length });
    }

    if (current !== undefined && current.exerciseKey !== target.exerciseKey && state.phase !== 'ready') {
        const remaining = pending.filter(step => step.exerciseKey === current.exerciseKey).length;
        if (remaining > 0) {
            warnings.push({ type: 'leavesExercise', key: current.exerciseKey, remaining });
        }
    }

    const targetExercise = findGuidedExercise(state, target.exerciseKey);
    const earlierPlanned = pendingKeys(state).some(key => {
        const other = findGuidedExercise(state, key);
        return other !== undefined && targetExercise !== undefined && key !== target.exerciseKey
            && other.plannedIndex < targetExercise.plannedIndex;
    });
    if (earlierPlanned) {
        warnings.push({ type: 'outOfPlan' });
    }
    return warnings;
}

export type ReorderWarning = 'movesCurrent' | 'outOfPlan';

/** What moving an exercise changes that the user should know about */
export function reorderWarnings(state: GuidedState, key: string, direction: 'up' | 'down'): ReorderWarning[] {
    if (!canMoveExercise(state, key, direction)) {
        return [];
    }
    const moved = guidedReducer(state, { type: 'move', key, direction });
    const warnings: ReorderWarning[] = [];
    if (currentStep(state)?.exerciseKey === key || nextPendingStep(moved, state.currentId)?.exerciseKey
        !== nextPendingStep(state, state.currentId)?.exerciseKey) {
        warnings.push('movesCurrent');
    }
    const planned = pendingKeys(moved).map(k => findGuidedExercise(moved, k)!.plannedIndex);
    if (planned.some((value, i) => i > 0 && value < planned[i - 1])) {
        warnings.push('outOfPlan');
    }
    return warnings;
}


/* ---------------------------------------------------------------------------
 * Clock
 * ------------------------------------------------------------------------- */

/** Whole seconds left of the phase (rounded up), null when it has no clock */
export function phaseRemaining(state: GuidedState, now: number): number | null {
    const end = phaseEndsAt(state);
    return end === null ? null : Math.max(0, Math.ceil((end - now) / 1000));
}

/** Seconds into the phase */
export const phaseElapsed = (state: GuidedState, now: number): number =>
    state.phaseStartedAt === null ? 0 : Math.max(0, (now - state.phaseStartedAt) / 1000);

/** What is left to do, work and rest, as an estimate in seconds. Sets without a clock count as `repSetSeconds`. */
export function remainingSeconds(state: GuidedState, repSetSeconds = 40): number {
    let total = 0;
    for (const step of stepsOf(state)) {
        if (isStepDone(state, step.id)) {
            continue;
        }
        const exercise = findGuidedExercise(state, step.exerciseKey)!;
        total += (workSeconds(exercise) ?? repSetSeconds) + restSecondsFor(exercise);
    }
    return total;
}

/** The finished sets as the state of the gym mode, so that they are saved the same way */
export function toGymState(state: GuidedState): GymState {
    // A set with neither repetitions nor weight cannot be saved
    const loggable = state.results.filter(result => hasLoggableValue(result.repetitions, result.weight));
    const logged: LoggedSet[] = loggable.map((result, index) => {
        const exercise = findGuidedExercise(state, result.exerciseKey)!;
        return {
            id: index + 1,
            exerciseKey: exercise.key,
            exerciseId: exercise.exerciseId,
            slotEntryId: exercise.slotEntryId,
            repetitions: result.repetitions,
            weight: result.weight,
            repetitionUnit: exercise.repetitionUnit,
            weightUnit: exercise.weightUnit,
            restSeconds: restSecondsFor(exercise),
            loggedAt: result.finishedAt,
        };
    });
    return {
        exercises: state.exercises,
        order: state.order,
        currentKey: currentStep(state)?.exerciseKey ?? null,
        logged,
        rest: null,
        nextSetId: logged.length + 1,
        startedAt: state.startedAt,
    };
}
