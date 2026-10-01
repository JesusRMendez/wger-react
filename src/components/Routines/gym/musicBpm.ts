/*
 * Music by tempo. Each phase of a training has a BPM range that suits it, and
 * a search link for each music service finds playlists for that range. The
 * services are only linked to: no login, no playback API.
 */

import {
    GymExercise,
    isTimeKind,
    repetitionUnitKind,
    restSecondsFor
} from "@/components/Routines/gym/gymSession";

export type MusicPhase = 'warmup' | 'strength' | 'hiit' | 'rest';

export interface BpmRange {
    min: number,
    max: number,
}

export const MUSIC_PHASES: MusicPhase[] = ['warmup', 'strength', 'hiit', 'rest'];

export const BPM_RANGES: Record<MusicPhase, BpmRange> = {
    warmup: { min: 100, max: 120 },
    strength: { min: 120, max: 140 },
    hiit: { min: 150, max: 170 },
    rest: { min: 90, max: 110 },
};

export const formatBpmRange = (range: BpmRange): string => `${range.min}-${range.max}`;

export interface MusicLinks {
    spotify: string,
    youtubeMusic: string,
}

/** Search links for workout music in the range, which the services open in their own app or site */
export function musicLinks(range: BpmRange): MusicLinks {
    const query = encodeURIComponent(`${formatBpmRange(range)} bpm workout`);
    return {
        spotify: `https://open.spotify.com/search/${query}`,
        youtubeMusic: `https://music.youtube.com/search?q=${query}`,
    };
}

/**
 * The phase an exercise is trained in: short timed work with short rests is
 * interval training, everything else is strength work.
 */
export function musicPhaseForExercise(exercise: GymExercise | undefined): MusicPhase {
    if (exercise === undefined) {
        return 'strength';
    }
    const isInterval = isTimeKind(repetitionUnitKind(exercise.repetitionUnit)) && restSecondsFor(exercise) <= 30;
    return isInterval ? 'hiit' : 'strength';
}
