/*
 * Pure logic of the gym mode: the plan of a day, the state of a live training
 * session and everything derived from it.
 *
 * Nothing in here touches React, timers or the browser. Time always comes in as
 * a parameter (milliseconds since the epoch) so the countdowns can be tested
 * without waiting.
 */

import { Exercise, Language } from "@/components/Exercises";
import { Routine } from "@/components/Routines/models/Routine";
import { LogEntryForm } from "@/components/Routines/models/WorkoutLog";
import { dayDataFor } from "@/components/Routines/widgets/forms/sessionLogsFormData";
import { REP_UNIT_REPETITIONS, REP_UNIT_TILL_FAILURE, WEIGHT_UNIT_KG, WEIGHT_UNIT_LB } from "@/core/lib/consts";

export const DEFAULT_REST_SECONDS = 90;
export const REST_WARNING_SECONDS = 20;
export const REST_TICK_SECONDS = 5;


/* ---------------------------------------------------------------------------
 * Units
 * ------------------------------------------------------------------------- */

export type UnitLike = { id: number, name: string } | null;

export type RepetitionUnitKind = 'repetitions' | 'failure' | 'seconds' | 'minutes' | 'distance' | 'other';
export type WeightUnitKind = 'weight' | 'bodyWeight' | 'plates' | 'speed' | 'other' | 'none';

/**
 * What a repetition unit measures. The names come from the server, so this only
 * looks at them (the ids are the fallback for the two the app knows itself)
 * and never decides what is displayed: that is always the unit's own name.
 */
export function repetitionUnitKind(unit: UnitLike): RepetitionUnitKind {
    if (unit === null) {
        return 'repetitions';
    }

    const name = unit.name.trim().toLowerCase();
    if (/failure/.test(name)) {
        return 'failure';
    }
    if (/^sec/.test(name)) {
        return 'seconds';
    }
    if (/^min/.test(name)) {
        return 'minutes';
    }
    if (/(mile|kilomet|meter|metre|yard|^km$|^m$)/.test(name)) {
        return 'distance';
    }
    if (/rep/.test(name)) {
        return 'repetitions';
    }

    if (unit.id === REP_UNIT_TILL_FAILURE) {
        return 'failure';
    }
    if (unit.id === REP_UNIT_REPETITIONS) {
        return 'repetitions';
    }
    return 'other';
}

/** What a weight unit measures: a real weight, or something else that is entered in the weight field */
export function weightUnitKind(unit: UnitLike): WeightUnitKind {
    if (unit === null) {
        return 'none';
    }

    const name = unit.name.trim().toLowerCase();
    if (/body\s*weight/.test(name)) {
        return 'bodyWeight';
    }
    if (/plate/.test(name)) {
        return 'plates';
    }
    if (/(km\/h|kph|mph|per hour|m\/s)/.test(name)) {
        return 'speed';
    }
    if (/^(kg|kgs|kilogram|lb|lbs|pound)/.test(name)) {
        return 'weight';
    }

    if (unit.id === WEIGHT_UNIT_KG || unit.id === WEIGHT_UNIT_LB) {
        return 'weight';
    }
    return 'other';
}

/** The "Max Reps" unit: the repetitions are what the user reports, nothing is planned */
export const isMaxRepsUnit = (unit: UnitLike): boolean => unit !== null && /max\s*_?\s*reps?/i.test(unit.name);

/** Whether the number of repetitions achieved has to be entered: sets until failure or for max reps */
export const needsRepetitionCount = (unit: UnitLike): boolean =>
    repetitionUnitKind(unit) === 'failure' || isMaxRepsUnit(unit);

/** A set needs at least one number, the server rejects a log with neither repetitions nor weight */
export const hasLoggableValue = (repetitions: number | null, weight: number | null): boolean =>
    repetitions !== null || weight !== null;

export const isTimeKind = (kind: RepetitionUnitKind): boolean => kind === 'seconds' || kind === 'minutes';

/** The seconds a value of a time-based unit stands for */
export function valueToSeconds(value: number, kind: RepetitionUnitKind): number {
    return kind === 'minutes' ? value * 60 : value;
}

/** The value, in the unit's own scale, of an elapsed time. Minutes keep one decimal. */
export function secondsToValue(seconds: number, kind: RepetitionUnitKind): number {
    return kind === 'minutes' ? Math.round(seconds / 6) / 10 : Math.round(seconds);
}

/** Prints a number without trailing zeros */
export function formatNumber(value: number): string {
    return Number.isInteger(value) ? value.toString() : parseFloat(value.toFixed(2)).toString();
}

/**
 * The number typed into an input: null for an empty one (the value is optional),
 * undefined for something that is not a non-negative number. Accepts a decimal comma.
 */
export function parseNumberInput(text: string): number | null | undefined {
    const trimmed = text.trim().replace(',', '.');
    if (trimmed === '') {
        return null;
    }
    if (!/^\d*\.?\d+$|^\d+\.$/.test(trimmed)) {
        return undefined;
    }
    return parseFloat(trimmed);
}

/**
 * "8 Repetitions", "30 Seconds", "Until Failure"... always with the unit's own name.
 * Units that stand for no number (until failure) print as just the name.
 */
export function formatRepetitions(
    value: number | null,
    maxValue: number | null,
    unit: UnitLike,
): string {
    const name = unit?.name ?? '';
    if (value === null || repetitionUnitKind(unit) === 'failure') {
        return name;
    }

    const range = maxValue !== null && maxValue !== value
        ? `${formatNumber(value)}-${formatNumber(maxValue)}`
        : formatNumber(value);
    return `${range} ${name}`.trim();
}

/** "80 kg", "2 Plates", "12 km/h". Body weight prints as the unit's name, with added weight spelled out. */
export function formatWeight(value: number | null, maxValue: number | null, unit: UnitLike): string {
    const name = unit?.name ?? '';
    if (value === null) {
        return weightUnitKind(unit) === 'bodyWeight' ? name : '';
    }

    const range = maxValue !== null && maxValue !== value
        ? `${formatNumber(value)}-${formatNumber(maxValue)}`
        : formatNumber(value);
    return `${range} ${name}`.trim();
}


/* ---------------------------------------------------------------------------
 * The plan
 * ------------------------------------------------------------------------- */

export interface GymExercise {
    /** Unique within the session */
    key: string,
    /** Position in the routine, which is what "out of order" is measured against */
    plannedIndex: number,
    slotEntryId: number,
    exerciseId: number,
    exercise: Exercise,
    type: string,
    nrOfSets: number,
    repetitions: number | null,
    maxRepetitions: number | null,
    repetitionUnit: UnitLike,
    weight: number | null,
    maxWeight: number | null,
    weightUnit: UnitLike,
    rir: number | null,
    /** Rest in seconds that the plan has for this exercise, null if it has none */
    restTime: number | null,
    comment: string,
}

/**
 * The exercises of a day with their planned sets, in the order of the routine.
 *
 * Every entry of a slot is its own item, so a superset shows up as the
 * exercises it is made of, one after the other. Exercises that failed to load
 * are left out.
 */
export function buildGymPlan(routine: Routine, dayId: number, date: Date): {
    exercises: GymExercise[],
    iteration: number | null,
} {
    const { dayDataList, hasNoIterationData } = dayDataFor(routine, dayId, date);

    const exercises: GymExercise[] = [];
    for (const dayData of dayDataList) {
        for (const slot of dayData.slots) {
            for (const config of slot.setConfigs) {
                // An exercise that could not be loaded can neither be shown nor saved
                if (config.exercise === undefined) {
                    continue;
                }

                const plannedIndex = exercises.length;
                exercises.push({
                    key: `${plannedIndex}-${config.slotEntryId}`,
                    plannedIndex: plannedIndex,
                    slotEntryId: config.slotEntryId,
                    exerciseId: config.exerciseId,
                    exercise: config.exercise,
                    type: config.type,
                    nrOfSets: Math.max(1, config.nrOfSets),
                    repetitions: config.repetitions,
                    maxRepetitions: config.maxRepetitions,
                    repetitionUnit: config.repetitionsUnit,
                    weight: config.weight,
                    maxWeight: config.maxWeight,
                    weightUnit: config.weightUnit,
                    rir: config.rir,
                    restTime: config.restTime,
                    comment: config.comment,
                });
            }
        }
    }

    return { exercises, iteration: hasNoIterationData ? null : dayDataList[0].iteration };
}

/** The exercise's name in the user's language, falling back to English like everywhere else */
export const exerciseName = (exercise: GymExercise, language?: Language): string =>
    exercise.exercise.getTranslation(language)?.name ?? '';

/** The rest after a set of the exercise: its own value, the default only when the plan has none (zero is a real value) */
export function restSecondsFor(exercise: GymExercise): number {
    return exercise.restTime ?? DEFAULT_REST_SECONDS;
}

/** "5 Repetitions x 80 kg" of one planned set, built from the data's own units */
export function describePlannedSet(exercise: GymExercise): string {
    return [
        formatRepetitions(exercise.repetitions, exercise.maxRepetitions, exercise.repetitionUnit),
        formatWeight(exercise.weight, exercise.maxWeight, exercise.weightUnit),
    ].filter(part => part !== '').join(' x ');
}


/* ---------------------------------------------------------------------------
 * The session
 * ------------------------------------------------------------------------- */

export interface LoggedSet {
    id: number,
    exerciseKey: string,
    exerciseId: number,
    slotEntryId: number,
    repetitions: number | null,
    weight: number | null,
    repetitionUnit: UnitLike,
    weightUnit: UnitLike,
    /** The rest that started with this set */
    restSeconds: number,
    loggedAt: number,
}

export interface RestTimer {
    startedAt: number,
    duration: number,
    /** The exercise whose rest this is, which is not necessarily the current one */
    exerciseKey: string,
}

export interface GymState {
    exercises: GymExercise[],
    /** Keys of the exercises in the order the user wants to train them */
    order: string[],
    currentKey: string | null,
    logged: LoggedSet[],
    rest: RestTimer | null,
    nextSetId: number,
    startedAt: number,
}

export type GymAction =
    | { type: 'select', key: string }
    | { type: 'move', key: string, direction: 'up' | 'down' }
    | { type: 'logSet', repetitions: number | null, weight: number | null, now: number }
    | { type: 'removeSet', id: number }
    | { type: 'finishRest', advance: boolean }
    | { type: 'advance' }
    /** Takes sets out of the plan, e.g. to fit the time available. Sets already done stay. */
    | { type: 'dropSets', drops: { key: string, sets: number }[] };

export function createGymState(exercises: GymExercise[], now: number): GymState {
    return {
        exercises: exercises,
        order: exercises.map(exercise => exercise.key),
        currentKey: exercises.length > 0 ? exercises[0].key : null,
        logged: [],
        rest: null,
        nextSetId: 1,
        startedAt: now,
    };
}

export const findExercise = (state: GymState, key: string | null): GymExercise | undefined =>
    key === null ? undefined : state.exercises.find(exercise => exercise.key === key);

export const loggedSetsOf = (state: GymState, key: string): LoggedSet[] =>
    state.logged.filter(set => set.exerciseKey === key);

export const doneSetsOf = (state: GymState, key: string): number => loggedSetsOf(state, key).length;

export function isComplete(state: GymState, key: string): boolean {
    const exercise = findExercise(state, key);
    return exercise === undefined || doneSetsOf(state, key) >= exercise.nrOfSets;
}

export const isAllDone = (state: GymState): boolean =>
    state.exercises.every(exercise => isComplete(state, exercise.key));

/** Exercises in the user's order */
export const orderedExercises = (state: GymState): GymExercise[] =>
    state.order.map(key => findExercise(state, key)!).filter(exercise => exercise !== undefined);

export function progressOf(state: GymState): { done: number, total: number } {
    return {
        done: state.exercises.reduce(
            (sum, exercise) => sum + Math.min(doneSetsOf(state, exercise.key), exercise.nrOfSets),
            0
        ),
        total: state.exercises.reduce((sum, exercise) => sum + exercise.nrOfSets, 0),
    };
}

/**
 * The exercise to continue with: the current one while it has sets left,
 * otherwise the next unfinished one in the user's order (wrapping around, so
 * something skipped earlier comes back). Null when everything is done.
 */
export function nextPending(state: GymState): string | null {
    const { order, currentKey } = state;
    if (currentKey !== null && !isComplete(state, currentKey)) {
        return currentKey;
    }

    const start = currentKey === null ? -1 : order.indexOf(currentKey);
    for (let i = 1; i <= order.length; i++) {
        const key = order[(start + i) % order.length];
        if (!isComplete(state, key)) {
            return key;
        }
    }
    return null;
}

/**
 * Whether the current exercise was planned later than one that is still waiting
 * before it. Reordering on purpose makes the chosen exercise the first one in
 * line, which is not a deviation anymore.
 */
export function isOutOfOrder(state: GymState): boolean {
    const current = findExercise(state, state.currentKey);
    if (current === undefined || isComplete(state, current.key)) {
        return false;
    }

    const firstPending = state.order.find(key => !isComplete(state, key));
    const first = findExercise(state, firstPending ?? null);
    return first !== undefined && first.key !== current.key && first.plannedIndex < current.plannedIndex;
}

export function canMove(state: GymState, key: string, direction: 'up' | 'down'): boolean {
    if (isComplete(state, key)) {
        return false;
    }
    const pending = state.order.filter(k => !isComplete(state, k));
    const index = pending.indexOf(key);
    return direction === 'up' ? index > 0 : index !== -1 && index < pending.length - 1;
}

export function gymReducer(state: GymState, action: GymAction): GymState {
    switch (action.type) {
        case 'select': {
            if (!state.order.includes(action.key) || isComplete(state, action.key)) {
                return state;
            }
            return { ...state, currentKey: action.key };
        }

        case 'move': {
            if (!canMove(state, action.key, action.direction)) {
                return state;
            }
            // Neighbours are counted among the exercises still to do, so the finished ones
            // never get in the way
            const pending = state.order.filter(k => !isComplete(state, k));
            const index = pending.indexOf(action.key);
            const neighbour = pending[action.direction === 'up' ? index - 1 : index + 1];

            const order = [...state.order];
            const from = order.indexOf(action.key);
            const to = order.indexOf(neighbour);
            [order[from], order[to]] = [order[to], order[from]];
            return { ...state, order };
        }

        case 'logSet': {
            const exercise = findExercise(state, state.currentKey);
            if (exercise === undefined || isComplete(state, exercise.key)) {
                return state;
            }

            const restSeconds = restSecondsFor(exercise);
            const set: LoggedSet = {
                id: state.nextSetId,
                exerciseKey: exercise.key,
                exerciseId: exercise.exerciseId,
                slotEntryId: exercise.slotEntryId,
                repetitions: action.repetitions,
                weight: action.weight,
                repetitionUnit: exercise.repetitionUnit,
                weightUnit: exercise.weightUnit,
                restSeconds: restSeconds,
                loggedAt: action.now,
            };

            return {
                ...state,
                logged: [...state.logged, set],
                nextSetId: state.nextSetId + 1,
                // The rest belongs to the exercise just done, whatever is picked next.
                // Without rest there is nothing to count down (e.g. within a superset).
                rest: restSeconds > 0
                    ? { startedAt: action.now, duration: restSeconds, exerciseKey: exercise.key }
                    : null,
            };
        }

        case 'removeSet': {
            if (!state.logged.some(set => set.id === action.id)) {
                return state;
            }
            return { ...state, logged: state.logged.filter(set => set.id !== action.id) };
        }

        case 'finishRest': {
            const cleared = { ...state, rest: null };
            if (!action.advance) {
                return cleared;
            }
            return { ...cleared, currentKey: nextPending(cleared) ?? cleared.currentKey };
        }

        case 'advance': {
            return { ...state, currentKey: nextPending(state) ?? state.currentKey };
        }

        case 'dropSets': {
            const exercises = state.exercises.map(exercise => {
                const drop = action.drops.find(d => d.key === exercise.key);
                if (drop === undefined || drop.sets <= 0) {
                    return exercise;
                }
                return { ...exercise, nrOfSets: Math.max(doneSetsOf(state, exercise.key), exercise.nrOfSets - drop.sets) };
            });
            const dropped = { ...state, exercises };
            // The exercise in front of the user may be gone now
            return { ...dropped, currentKey: nextPending(dropped) ?? dropped.currentKey };
        }
    }
}


/* ---------------------------------------------------------------------------
 * Rest countdown
 * ------------------------------------------------------------------------- */

/** Whole seconds left of a rest, rounded up so the full duration shows when it starts */
export function restRemaining(rest: RestTimer | null, now: number): number {
    if (rest === null) {
        return 0;
    }
    return Math.max(0, Math.ceil((rest.duration * 1000 - (now - rest.startedAt)) / 1000));
}

export type RestAlert = 'warning' | 'tick' | 'end';

/**
 * The alerts due when the countdown moved from `previous` to `next` seconds
 * remaining. Going by the seconds passed instead of by the second itself keeps
 * them from being lost when a browser throttles the timer of a background tab.
 *
 * - `warning` once when 20 s are left (only for rests longer than that)
 * - `tick` for each of the last 5 seconds
 * - `end` at 0
 */
export function restAlertsBetween(previous: number, next: number, duration: number): RestAlert[] {
    const alerts: RestAlert[] = [];
    for (let second = previous - 1; second >= next; second--) {
        if (second === REST_WARNING_SECONDS && duration > REST_WARNING_SECONDS) {
            alerts.push('warning');
        } else if (second >= 1 && second <= REST_TICK_SECONDS) {
            alerts.push('tick');
        } else if (second === 0) {
            alerts.push('end');
        }
    }
    return alerts;
}

/** "1:30" */
export function formatClock(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}


/* ---------------------------------------------------------------------------
 * Previous values
 * ------------------------------------------------------------------------- */

export interface PreviousLike {
    exerciseId: number,
    date: Date,
    repetitions: number | null,
    weight: number | null,
    repetitionUnitObj: UnitLike,
    weightUnitObj: UnitLike,
}

/** The newest log of an exercise, with the units it was logged in */
export function latestLogFor<T extends PreviousLike>(logs: T[], exerciseId: number): T | undefined {
    let latest: T | undefined = undefined;
    for (const log of logs) {
        if (log.exerciseId === exerciseId && (latest === undefined || log.date.getTime() > latest.date.getTime())) {
            latest = log;
        }
    }
    return latest;
}


/* ---------------------------------------------------------------------------
 * Saving
 * ------------------------------------------------------------------------- */

/** The logged sets as the entries of the session logs form, so they are saved the same way */
export function toLogEntries(state: GymState): LogEntryForm[] {
    const entries: LogEntryForm[] = [];
    for (const set of state.logged) {
        const exercise = findExercise(state, set.exerciseKey);
        if (exercise === undefined) {
            continue;
        }

        entries.push({
            clientKey: `gym-${set.id}`,
            exercise: exercise.exercise,
            repetitionsUnit: set.repetitionUnit,
            weightUnit: set.weightUnit,
            slotEntry: set.slotEntryId,
            rir: '',
            rirTarget: exercise.rir ?? '',
            repetitions: set.repetitions ?? '',
            repetitionsTarget: exercise.repetitions ?? '',
            weight: set.weight ?? '',
            weightTarget: exercise.weight ?? '',
        });
    }
    return entries;
}
