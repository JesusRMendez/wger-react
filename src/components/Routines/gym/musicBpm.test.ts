import { gymSquats, gymTimed } from "@/tests/gymTestData";
import {
    BPM_RANGES,
    formatBpmRange,
    MUSIC_PHASES,
    musicLinks,
    musicPhaseForExercise
} from "@/components/Routines/gym/musicBpm";

describe('musicBpm', () => {
    test('has the ranges of the contract', () => {
        expect(BPM_RANGES.warmup).toEqual({ min: 100, max: 120 });
        expect(BPM_RANGES.strength).toEqual({ min: 120, max: 140 });
        expect(BPM_RANGES.hiit).toEqual({ min: 150, max: 170 });
        expect(BPM_RANGES.rest).toEqual({ min: 90, max: 110 });
        expect(MUSIC_PHASES).toHaveLength(4);
    });

    test('formats a range', () => {
        expect(formatBpmRange(BPM_RANGES.hiit)).toBe('150-170');
    });

    test('links search the BPM range on both services, without any API', () => {
        const links = musicLinks(BPM_RANGES.strength);

        expect(links.spotify).toBe('https://open.spotify.com/search/120-140%20bpm%20workout');
        expect(links.youtubeMusic).toBe('https://music.youtube.com/search?q=120-140%20bpm%20workout');
    });

    test('a short timed set with a short rest is interval training', () => {
        expect(musicPhaseForExercise({ ...gymTimed, restTime: 20 })).toBe('hiit');
    });

    test('longer rests, plain repetitions and no exercise are strength work', () => {
        expect(musicPhaseForExercise(gymTimed)).toBe('strength');
        expect(musicPhaseForExercise({ ...gymSquats, restTime: 10 })).toBe('strength');
        expect(musicPhaseForExercise(undefined)).toBe('strength');
    });
});
