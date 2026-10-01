import { RestAlert } from "@/components/Routines/gym/gymSession";
import { useCallback, useEffect, useRef } from "react";

/*
 * Audio and vibration alerts of the gym mode.
 *
 * Plain WebAudio, no files and no dependency. Browsers only let an audio
 * context run after a user gesture, so `unlock` is called from the buttons the
 * user presses (e.g. "Done set") and the context is created and resumed there.
 * Everything is wrapped in try/catch: missing support must never break the page.
 */

type Beep = { frequency: number, start: number, duration: number };

// Times in seconds
const BEEPS: Record<RestAlert, Beep[]> = {
    // Double beep: 20 s left
    warning: [
        { frequency: 880, start: 0, duration: 0.12 },
        { frequency: 880, start: 0.2, duration: 0.12 },
    ],
    // Short tick: each of the last 5 seconds
    tick: [{ frequency: 660, start: 0, duration: 0.06 }],
    // Longer tone: rest is over
    end: [{ frequency: 440, start: 0, duration: 0.7 }],
};

const VIBRATION: Record<RestAlert, number[]> = {
    warning: [100, 80, 100],
    tick: [30],
    end: [400],
};

export interface GymAudio {
    /** Plays the sound (if enabled) and vibrates (if the device can) */
    playAlert: (alert: RestAlert) => void,
    /** Call from a click handler so browsers allow the sound later */
    unlock: () => void,
}

export function useGymAudio(soundEnabled: boolean): GymAudio {
    const contextRef = useRef<AudioContext | null>(null);

    const getContext = useCallback((): AudioContext | null => {
        try {
            if (contextRef.current === null) {
                const Ctor = window.AudioContext
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ?? (window as any).webkitAudioContext;
                if (Ctor === undefined) {
                    return null;
                }
                contextRef.current = new Ctor();
            }
            return contextRef.current;
        } catch {
            return null;
        }
    }, []);

    const unlock = useCallback(() => {
        if (!soundEnabled) {
            return;
        }
        try {
            const context = getContext();
            if (context !== null && context.state === 'suspended') {
                void context.resume();
            }
        } catch {
            // Nothing to do, the sound just won't play
        }
    }, [soundEnabled, getContext]);

    const playAlert = useCallback((alert: RestAlert) => {
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                navigator.vibrate(VIBRATION[alert]);
            }
        } catch {
            // Vibration is optional
        }

        if (!soundEnabled) {
            return;
        }

        try {
            const context = getContext();
            if (context === null) {
                return;
            }

            for (const beep of BEEPS[alert]) {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                const start = context.currentTime + beep.start;

                oscillator.type = 'sine';
                oscillator.frequency.value = beep.frequency;
                // A short fade in and out avoids clicks
                gain.gain.setValueAtTime(0.0001, start);
                gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + beep.duration);

                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start(start);
                oscillator.stop(start + beep.duration + 0.02);
            }
        } catch {
            // Sound is optional
        }
    }, [soundEnabled, getContext]);

    useEffect(() => () => {
        try {
            void contextRef.current?.close();
        } catch {
            // Already closed
        }
        contextRef.current = null;
    }, []);

    return { playAlert, unlock };
}
