import type { Mock } from "vitest";
import { useGymAudio } from "@/components/Routines/gym/useGymAudio";
import { renderHook } from "@testing-library/react";

const oscillators: { frequency: { value: number }, start: Mock, stop: Mock }[] = [];
const resume = vi.fn();

class FakeAudioContext {
    state = 'suspended';
    currentTime = 10;
    destination = {};
    resume = resume;
    close = vi.fn();

    createOscillator() {
        const oscillator = {
            type: '',
            frequency: { value: 0 },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
        };
        oscillators.push(oscillator);
        return oscillator;
    }

    createGain() {
        return {
            gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            connect: vi.fn(),
        };
    }
}

describe('useGymAudio', () => {
    const vibrate = vi.fn();

    beforeEach(() => {
        oscillators.length = 0;
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).AudioContext = FakeAudioContext;
        Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
    });

    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).AudioContext;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (navigator as any).vibrate;
    });

    test('the warning is a double beep', () => {
        const { result } = renderHook(() => useGymAudio(true));

        result.current.playAlert('warning');

        expect(oscillators).toHaveLength(2);
        expect(oscillators[1].start.mock.calls[0][0]).toBeGreaterThan(oscillators[0].start.mock.calls[0][0]);
        expect(vibrate).toHaveBeenCalledTimes(1);
    });

    test('the tick is one short beep', () => {
        const { result } = renderHook(() => useGymAudio(true));

        result.current.playAlert('tick');

        expect(oscillators).toHaveLength(1);
        const [start] = oscillators[0].start.mock.calls[0];
        const [stop] = oscillators[0].stop.mock.calls[0];
        expect(stop - start).toBeLessThan(0.2);
    });

    test('the end is one longer tone', () => {
        const { result } = renderHook(() => useGymAudio(true));

        result.current.playAlert('tick');
        result.current.playAlert('end');

        const length = (index: number) =>
            oscillators[index].stop.mock.calls[0][0] - oscillators[index].start.mock.calls[0][0];
        expect(oscillators).toHaveLength(2);
        expect(length(1)).toBeGreaterThan(length(0) * 3);
    });

    test('without sound it only vibrates', () => {
        const { result } = renderHook(() => useGymAudio(false));

        result.current.playAlert('end');

        expect(oscillators).toHaveLength(0);
        expect(vibrate).toHaveBeenCalledTimes(1);
    });

    test('works on devices that can not vibrate', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (navigator as any).vibrate;
        const { result } = renderHook(() => useGymAudio(true));

        expect(() => result.current.playAlert('end')).not.toThrow();
        expect(oscillators).toHaveLength(1);
    });

    test('works in browsers without WebAudio', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).AudioContext;
        const { result } = renderHook(() => useGymAudio(true));

        expect(() => result.current.playAlert('end')).not.toThrow();
        expect(() => result.current.unlock()).not.toThrow();
        expect(vibrate).toHaveBeenCalledTimes(1);
    });

    test('unlocking resumes a suspended context', () => {
        const { result } = renderHook(() => useGymAudio(true));

        result.current.unlock();

        expect(resume).toHaveBeenCalledTimes(1);
    });

    test('unlocking does nothing without sound', () => {
        const { result } = renderHook(() => useGymAudio(false));

        result.current.unlock();

        expect(resume).not.toHaveBeenCalled();
    });
});
