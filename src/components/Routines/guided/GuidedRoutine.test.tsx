import { GuidedRoutine } from "@/components/Routines/guided/GuidedRoutine";
import { GymState } from "@/components/Routines/gym/gymSession";
import { useGymAudio } from "@/components/Routines/gym/useGymAudio";
import {
    gymBenchPress,
    gymSquats,
    gymTimed,
    gymWeightUnitBodyWeight,
} from "@/tests/gymTestData";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import i18n from "i18next";
import React from "react";
import type { Mock } from "vitest";
import translations from "../../../../public/locales/en/translation.json";

vi.mock("@/components/Routines/gym/useGymAudio");

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

describe('GuidedRoutine', () => {
    const playAlert = vi.fn();
    const unlock = vi.fn();
    const onFinish = vi.fn();

    beforeAll(() => {
        i18n.addResourceBundle('en', 'translations', translations, true, true);
    });

    afterAll(() => {
        i18n.removeResourceBundle('en', 'translations');
    });

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        (useGymAudio as Mock).mockReturnValue({ playAlert, unlock });
        onFinish.mockResolvedValue(undefined);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const renderGuided = (exercises = [gymSquats, gymBenchPress, gymTimed]) =>
        render(<GuidedRoutine exercises={exercises} onFinish={onFinish} />);

    const advance = (ms: number) => act(() => {
        vi.advanceTimersByTime(ms);
    });
    const start = () => {
        fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    };
    const clock = () => screen.getByTestId('guided-clock').textContent;
    const isPhase = (name: string) => screen.getByRole('heading', { level: 2, name }) !== undefined;
    const alerts = () => playAlert.mock.calls.map(call => call[0]);

    test('waits for the start, then counts down 3-2-1 into the first set', () => {
        renderGuided();

        expect(screen.getByText('5 sets in this routine. The timer runs by itself: press start when you are ready.')).toBeInTheDocument();
        start();
        expect(unlock).toHaveBeenCalled();
        expect(clock()).toBe('3');

        advance(1000);
        expect(clock()).toBe('2');
        advance(1000);
        expect(clock()).toBe('1');
        expect(alerts()).toEqual(['tick', 'tick']);

        advance(1000);
        expect(alerts()).toEqual(['tick', 'tick', 'end']);
        expect(isPhase('Work')).toBe(true);
        expect(screen.getByText('Set 1 of 2')).toBeInTheDocument();
        expect(screen.getByText('5-6 Repetitions x 80 kg')).toBeInTheDocument();
    });

    test('a set of repetitions waits for Done, then the rest of that exercise runs and ends by itself', () => {
        renderGuided();
        start();
        advance(3000);

        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(isPhase('Rest')).toBe(true);
        expect(clock()).toBe('2:00');
        expect(screen.getByText('Rest after Squats')).toBeInTheDocument();

        advance(119_000);
        expect(clock()).toBe('0:01');
        advance(1000);
        // The next set of the squats starts without any press
        expect(isPhase('Work')).toBe(true);
        expect(screen.getByText('Set 2 of 2')).toBeInTheDocument();
        expect(screen.getByText('1 of 5 sets done')).toBeInTheDocument();
    });

    test('alerts at 20 seconds and in the last 5 seconds of the rest, and at its end', () => {
        renderGuided();
        start();
        advance(3000);
        playAlert.mockClear();
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        advance(120_000);

        const played = alerts();
        expect(played.filter(a => a === 'warning')).toHaveLength(1);
        expect(played.filter(a => a === 'tick')).toHaveLength(5);
        expect(played.filter(a => a === 'end')).toHaveLength(1);
        expect(played[played.length - 1]).toBe('end');
    });

    test('shows the next exercise with its image during the rest', () => {
        renderGuided([gymBenchPress, gymSquats]);
        start();
        advance(3000);
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        const intro = within(screen.getByTestId('next-intro'));
        expect(intro.getByText('Up next: Squats')).toBeInTheDocument();
        expect(intro.getByText(/Set 1 of 2 - 5-6 Repetitions x 80 kg/)).toBeInTheDocument();
        // The avatar is rendered, an image when the exercise has one
        expect(screen.getByTestId('next-intro').querySelector('.MuiAvatar-root')).not.toBeNull();
    });

    test('skip rest goes on at once', () => {
        renderGuided();
        start();
        advance(3000);
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }));

        expect(isPhase('Work')).toBe(true);
    });

    test('a timed set runs on the clock in its unit and ends by itself', () => {
        renderGuided([gymTimed]);
        start();
        advance(3000);

        expect(clock()).toBe('0:30');
        expect(screen.getByRole('button', { name: 'Finish this set now' })).toBeInTheDocument();
        advance(10_000);
        expect(clock()).toBe('0:20');
        expect(alerts()).toContain('warning');

        advance(20_000);
        expect(isPhase('Rest')).toBe(true);
        expect(clock()).toBe('0:45');
        expect(screen.getByText('1 of 2 sets done')).toBeInTheDocument();
    });

    test('max reps asks for the count after the set', () => {
        renderGuided([maxReps, gymBenchPress]);
        start();
        advance(3000);

        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(isPhase('How many?')).toBe(true);
        expect(screen.getByText('How many did you do? (Max Reps)')).toBeInTheDocument();
        const confirm = screen.getByRole('button', { name: 'Save and rest' });
        expect(confirm).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/Repetitions reached/), { target: { value: 'abc' } });
        expect(confirm).toBeDisabled();
        fireEvent.change(screen.getByLabelText(/Repetitions reached/), { target: { value: '15' } });
        fireEvent.click(confirm);

        expect(isPhase('Rest')).toBe(true);
        expect(screen.getByText('1 of 2 sets done')).toBeInTheDocument();
    });

    test('keeps the weight unit of the exercise and lets the weight be corrected', async () => {
        renderGuided([gymBenchPress]);
        start();
        advance(3000);

        expect(screen.getByText('10 Repetitions x 40 lb')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '42,5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        expect(screen.getByText('All sets are done. Finish to save the training.')).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
        });

        expect(onFinish).toHaveBeenCalledTimes(1);
        const saved = onFinish.mock.calls[0][0] as GymState;
        expect(saved.logged).toHaveLength(1);
        expect(saved.logged[0]).toMatchObject({ weight: 42.5, repetitions: 10, weightUnit: { name: 'lb' } });
    });

    test('finishing early asks first and saves what was done', async () => {
        renderGuided();
        start();
        advance(3000);
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
        expect(screen.getByText('Finish with sets left?')).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Finish' }));
        });

        expect(onFinish).toHaveBeenCalledTimes(1);
        expect((onFinish.mock.calls[0][0] as GymState).logged).toHaveLength(1);
    });

    test('shows an error when saving fails', async () => {
        onFinish.mockRejectedValue(new Error('no'));
        renderGuided([gymBenchPress]);
        start();
        advance(3000);
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
        });

        expect(screen.getByText('The training session could not be saved. Please try again.')).toBeInTheDocument();
    });

    describe('jump and reorder', () => {
        test('jumping with nothing in the way goes straight there', () => {
            renderGuided();
            start();
            advance(3000);

            // The first exercise is the current one, so there is nothing to warn about
            fireEvent.click(within(screen.getByRole('list')).getByRole('button', { name: /^Squats/ }));

            expect(screen.queryByText('Change the plan?')).not.toBeInTheDocument();
        });

        test('jumping ahead warns and can be cancelled or confirmed', () => {
            renderGuided();
            start();
            advance(3000);

            fireEvent.click(within(screen.getByRole('list')).getByRole('button', { name: /^Curls/ }));

            const dialog = within(screen.getByRole('dialog'));
            expect(dialog.getByText('Change the plan?')).toBeInTheDocument();
            expect(dialog.getByText('3 sets that are still to do will be left for later.')).toBeInTheDocument();
            expect(dialog.getByText('Squats still has 2 sets to do.')).toBeInTheDocument();

            fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
            advance(1000);
            expect(isPhase('Work')).toBe(true);
            expect(screen.getByText('Set 1 of 2')).toBeInTheDocument();

            fireEvent.click(within(screen.getByRole('list')).getByRole('button', { name: /^Curls/ }));
            fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue anyway' }));
            advance(1000);

            // A new countdown for the exercise jumped to
            expect(isPhase('Get ready')).toBe(true);
            expect(screen.getByRole('heading', { level: 5, name: 'Curls' })).toBeInTheDocument();
        });

        test('reordering warns when it changes the plan', () => {
            renderGuided();
            start();
            advance(3000);

            fireEvent.click(screen.getByRole('button', { name: 'Move Curls up' }));
            expect(screen.getByText('This is not the order of the plan, which may matter for your goal.')).toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: 'Continue anyway' }));
            advance(1000);

            const names = within(screen.getByRole('list')).getAllByRole('button', { name: /^(Squats|Benchpress|Curls)/ })
                .map(button => /^(Squats|Benchpress|Curls)/.exec(button.textContent ?? '')![1]);
            expect(names).toEqual(['Squats', 'Curls', 'Benchpress']);
        });
    });

    test('has the music card, which follows the phase, and the glossary button', () => {
        renderGuided();

        expect(screen.getByRole('button', { name: 'Help and glossary' })).toBeInTheDocument();
        start();
        // Warm-up for the first countdown
        expect(screen.getByTestId('music-bpm')).toHaveTextContent('100-120');

        advance(3000);
        expect(screen.getByTestId('music-bpm')).toHaveTextContent('120-140');

        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(screen.getByTestId('music-bpm')).toHaveTextContent('90-110');
    });

    test('shows the RIR of the set as an abbreviation that explains itself', () => {
        renderGuided();
        start();
        advance(3000);

        fireEvent.click(screen.getByRole('button', { name: 'Explain Repetitions in reserve' }));

        expect(screen.getByText('How it helps your goal')).toBeInTheDocument();
    });
});
