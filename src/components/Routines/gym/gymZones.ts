/*
 * Pure logic for the zones and the time budget of the gym mode: matching the
 * server's zone order to the exercises of the session, the moves that bring
 * the session into that order, and which sets to drop when the planned
 * session is longer than the time available.
 */

import type { MissingEquipment, ZoneOrderItem } from "@/components/Locations";
import {
    GymExercise,
    isTimeKind,
    repetitionUnitKind,
    restSecondsFor,
    valueToSeconds
} from "@/components/Routines/gym/gymSession";

/* ---------------------------------------------------------------------------
 * Zones
 * ------------------------------------------------------------------------- */

/**
 * The server's item for each exercise of the session, by exercise key.
 *
 * The slot entry identifies an exercise; the exercise id is only the fallback
 * for something the entry did not match, and each item is used once.
 */
export function matchZoneItems(exercises: GymExercise[], items: ZoneOrderItem[]): Map<string, ZoneOrderItem> {
    const matched = new Map<string, ZoneOrderItem>();
    const used = new Set<ZoneOrderItem>();

    for (const exercise of exercises) {
        const item = items.find(i => !used.has(i) && i.slotEntryId === exercise.slotEntryId);
        if (item !== undefined) {
            matched.set(exercise.key, item);
            used.add(item);
        }
    }
    for (const exercise of exercises) {
        if (matched.has(exercise.key)) {
            continue;
        }
        const item = items.find(i => !used.has(i) && i.exerciseId === exercise.exerciseId);
        if (item !== undefined) {
            matched.set(exercise.key, item);
            used.add(item);
        }
    }
    return matched;
}

/** The name of the zone each exercise is in, by exercise key. Exercises without a zone are not in it. */
export function zoneNamesByKey(matched: Map<string, ZoneOrderItem>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, item] of matched) {
        if (item.zoneName !== null && item.zoneName !== '') {
            out[key] = item.zoneName;
        }
    }
    return out;
}

/**
 * The keys in the order the server suggests. What the server did not return
 * goes last, in the order it already had.
 */
export function suggestedKeyOrder(keys: string[], matched: Map<string, ZoneOrderItem>, items: ZoneOrderItem[]): string[] {
    const position = (key: string): number => {
        const item = matched.get(key);
        return item === undefined ? Number.POSITIVE_INFINITY : items.indexOf(item);
    };
    return keys
        .map((key, index) => ({ key, index, position: position(key) }))
        .sort((a, b) => {
            if (a.position === b.position) {
                return a.index - b.index;
            }
            return a.position < b.position ? -1 : 1;
        })
        .map(entry => entry.key);
}

/**
 * How often the training moves to another zone. Exercises that are in no zone
 * neither start nor end a walk: the last known zone is the one that counts.
 */
export function countZoneChanges(keys: string[], zones: Record<string, string>): number {
    let changes = 0;
    let last: string | undefined = undefined;
    for (const key of keys) {
        const zone = zones[key];
        if (zone === undefined) {
            continue;
        }
        if (last !== undefined && zone !== last) {
            changes++;
        }
        last = zone;
    }
    return changes;
}

export interface KeyMove {
    key: string,
    direction: 'up' | 'down',
}

/**
 * The single-step moves (what the reducer's `move` action does) that turn
 * `current` into `target`. Both hold the same keys; keys missing from the
 * target stay behind the others.
 */
export function movesToReach(current: string[], target: string[]): KeyMove[] {
    const rank = (key: string) => {
        const index = target.indexOf(key);
        return index === -1 ? Number.POSITIVE_INFINITY : index;
    };

    const working = [...current];
    const moves: KeyMove[] = [];
    // Insertion sort: every element only ever moves up, past the ones that should come after it
    for (let i = 1; i < working.length; i++) {
        let j = i;
        while (j > 0 && rank(working[j]) < rank(working[j - 1])) {
            [working[j], working[j - 1]] = [working[j - 1], working[j]];
            moves.push({ key: working[j - 1], direction: 'up' });
            j--;
        }
    }
    return moves;
}

export interface MissingForExercise {
    key: string,
    exerciseId: number,
    equipment: string[],
}

/** The equipment the location lacks, for each exercise of the session that needs some */
export function missingEquipmentFor(exercises: GymExercise[], missing: MissingEquipment[]): MissingForExercise[] {
    const out: MissingForExercise[] = [];
    for (const exercise of exercises) {
        const entry = missing.find(m => m.exerciseId === exercise.exerciseId);
        if (entry !== undefined && entry.equipment.length > 0) {
            out.push({
                key: exercise.key,
                exerciseId: exercise.exerciseId,
                equipment: entry.equipment.map(e => e.name),
            });
        }
    }
    return out;
}


/* ---------------------------------------------------------------------------
 * Time budget
 * ------------------------------------------------------------------------- */

export const BUDGET_OPTIONS_MINUTES = [30, 45, 60, 75] as const;

/** What a set of repetitions takes, as nothing says how long they do */
export const REP_SET_SECONDS = 40;

/** The seconds of work of one set: the planned time for a timed unit, a typical set otherwise */
export function estimateWorkSeconds(exercise: GymExercise): number {
    const kind = repetitionUnitKind(exercise.repetitionUnit);
    if (isTimeKind(kind) && exercise.repetitions !== null && exercise.repetitions > 0) {
        return valueToSeconds(exercise.repetitions, kind);
    }
    return REP_SET_SECONDS;
}

/** Work plus rest of one set */
export const estimateSetSeconds = (exercise: GymExercise): number =>
    estimateWorkSeconds(exercise) + restSecondsFor(exercise);

/** Sets times (work + rest) of the sets that are left */
export function estimateSessionSeconds(
    exercises: GymExercise[],
    remainingSets: (exercise: GymExercise) => number = exercise => exercise.nrOfSets,
): number {
    return exercises.reduce((sum, exercise) => sum + remainingSets(exercise) * estimateSetSeconds(exercise), 0);
}

/** The time that counts: the smaller of what the location allows and what the user chose, null when neither is set */
export function effectiveBudgetMinutes(locationMinutes: number | null, chosenMinutes: number | null): number | null {
    if (locationMinutes === null) {
        return chosenMinutes;
    }
    return chosenMinutes === null ? locationMinutes : Math.min(locationMinutes, chosenMinutes);
}

export interface BudgetItem {
    key: string,
    remainingSets: number,
    setSeconds: number,
}

export interface SetDrop {
    key: string,
    /** How many of the exercise's remaining sets to drop */
    sets: number,
}

export interface DropSuggestion {
    drops: SetDrop[],
    /** The estimate of what is left after the drops */
    remainingSeconds: number,
    /** Whether that is within the budget */
    fits: boolean,
}

/**
 * Which sets to drop so that the session fits the budget.
 *
 * Items come in training order. The exercise with the most sets left gives one
 * up first, the later one on a tie, so the volume is trimmed evenly and the
 * first exercises stay whole. Every exercise keeps a set while there are
 * others to trim; only when that is not enough, whole exercises go, last
 * first.
 */
export function suggestSetDrops(items: BudgetItem[], budgetSeconds: number): DropSuggestion {
    const left = items.map(item => item.remainingSets);
    let total = items.reduce((sum, item, i) => sum + left[i] * item.setSeconds, 0);

    const dropOne = (index: number) => {
        left[index]--;
        total -= items[index].setSeconds;
    };

    while (total > budgetSeconds) {
        let pick = -1;
        for (let i = 0; i < items.length; i++) {
            if (left[i] > 1 && (pick === -1 || left[i] >= left[pick])) {
                pick = i;
            }
        }
        if (pick !== -1) {
            dropOne(pick);
            continue;
        }

        // Every exercise is down to one set: drop the last one that still has it
        for (let i = items.length - 1; i >= 0; i--) {
            if (left[i] > 0) {
                pick = i;
                break;
            }
        }
        if (pick === -1) {
            break;
        }
        dropOne(pick);
    }

    return {
        drops: items
            .map((item, i) => ({ key: item.key, sets: item.remainingSets - left[i] }))
            .filter(drop => drop.sets > 0),
        remainingSeconds: total,
        fits: total <= budgetSeconds,
    };
}

/** "75 min", for an estimate in seconds, rounded up to the minute */
export const secondsToMinutes = (seconds: number): number => Math.ceil(seconds / 60);
