import { GymSession } from "@/components/Routines/gym/GymSession";
import { GymState } from "@/components/Routines/gym/gymSession";
import { useGymAudio } from "@/components/Routines/gym/useGymAudio";
import { GYM_PREFERENCES_KEY } from "@/components/Routines/gym/useGymPreferences";
import {
    gymBenchPress,
    gymExercises,
    gymRepUnitRepetitions,
    gymSquats,
    gymTimed,
    gymWeightUnitKg
} from "@/tests/gymTestData";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import i18n from "i18next";
import React from "react";
import type { Mock } from "vitest";
import translations from "../../../../public/locales/en/translation.json";

vi.mock("@/components/Routines/gym/useGymAudio");

describe('GymSession', () => {

    const playAlert = vi.fn();
    const unlock = vi.fn();
    const onFinish = vi.fn();

    // The real English strings, so that the texts with numbers in them can be checked
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

    const renderSession = (exercises = gymExercises, previousLogs: object[] = []) => render(
        <GymSession
            exercises={exercises}
            previousLogs={previousLogs as never[]}
            onFinish={onFinish}
        />
    );

    const advance = (ms: number) => act(() => {
        vi.advanceTimersByTime(ms);
    });

    const doneSet = () => fireEvent.click(screen.getByRole('button', { name: /^Done set/ }));
    const countdown = () => screen.getByTestId('rest-countdown').textContent;
    const selectExercise = (name: string) => fireEvent.click(
        within(screen.getByRole('list')).getByRole('button', { name: new RegExp(`^${name}`) })
    );
    const listItem = (name: string) => within(
        within(screen.getByRole('list')).getByText(name).closest('li')!
    );
    const alertsPlayed = () => playAlert.mock.calls.map(call => call[0]);

    describe('layout', () => {
        test('lists the exercises with the sets done and shows the first one', () => {
            renderSession();

            const list = within(screen.getByRole('list'));
            expect(list.getByText('Squats')).toBeInTheDocument();
            expect(list.getByText('Benchpress')).toBeInTheDocument();
            expect(list.getByText('Curls')).toBeInTheDocument();
            expect(list.getAllByText('0 / 2 sets')).toHaveLength(2);
            expect(list.getByText('0 / 1 sets')).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: 'Squats' })).toBeInTheDocument();
            expect(screen.getByText('Set 1 of 2')).toBeInTheDocument();
            expect(screen.getByText('0 of 5 sets done')).toBeInTheDocument();
            expect(screen.getByText('Complete a set to start the rest timer.')).toBeInTheDocument();
        });

        test('says so when there are no sets logged yet', () => {
            renderSession();

            expect(screen.getByText('No sets logged yet')).toBeInTheDocument();
        });
    });

    describe('units', () => {
        test('shows the planned set and the inputs with the units of the data', () => {
            renderSession();

            expect(screen.getByText('5-6 Repetitions x 80 kg')).toBeInTheDocument();
            expect(screen.getByLabelText('Repetitions')).toHaveValue('5');
            expect(screen.getByLabelText('Weight')).toHaveValue('80');
            expect(screen.getByText('kg')).toBeInTheDocument();
        });

        test('another exercise brings its own units, none are hardcoded', () => {
            renderSession();

            selectExercise('Benchpress');

            expect(screen.getByText('10 Repetitions x 40 lb')).toBeInTheDocument();
            expect(screen.getByText('lb')).toBeInTheDocument();
            expect(screen.queryByText('kg')).not.toBeInTheDocument();
        });

        test('body weight is labelled as such and the weight can stay empty', () => {
            renderSession();

            selectExercise('Curls');

            expect(screen.getByText('30 Seconds x Body Weight')).toBeInTheDocument();
            const weight = screen.getByLabelText('Additional weight (Body Weight)');
            expect(weight).toHaveValue('');
            expect(screen.getByText('hold the position')).toBeInTheDocument();

            doneSet();

            const table = within(screen.getByRole('table', { name: 'Sets of this session' }));
            expect(table.getByText('30 Seconds')).toBeInTheDocument();
            expect(onFinish).not.toHaveBeenCalled();
        });

        test('other units name the field', () => {
            renderSession([
                {
                    ...gymSquats,
                    repetitionUnit: { id: 6, name: 'Kilometers' },
                    weightUnit: { id: 4, name: 'Plates' },
                    repetitions: 5,
                    maxRepetitions: null,
                    weight: 3,
                }
            ]);

            expect(screen.getByText('5 Kilometers x 3 Plates')).toBeInTheDocument();
            expect(screen.getByLabelText('Kilometers')).toHaveValue('5');
            expect(screen.getByLabelText('Plates')).toHaveValue('3');
        });

        test('a set until failure takes the repetitions reached', () => {
            renderSession([
                { ...gymSquats, repetitionUnit: { id: 2, name: 'Until Failure' }, repetitions: null, weight: 60 }
            ]);

            expect(screen.getByText('Until Failure x 60 kg')).toBeInTheDocument();
            fireEvent.change(screen.getByLabelText('Repetitions'), { target: { value: '12' } });
            doneSet();

            const table = within(screen.getByRole('table', { name: 'Sets of this session' }));
            expect(table.getByText('Until Failure')).toBeInTheDocument();
            expect(table.getByText('60 kg')).toBeInTheDocument();
        });

        test('a set until failure cannot be done without the repetitions reached', () => {
            renderSession([
                { ...gymSquats, repetitionUnit: { id: 2, name: 'Until Failure' }, repetitions: null, weight: null }
            ]);

            expect(screen.getByRole('button', { name: /^Done set/ })).toBeDisabled();
            expect(screen.getByText('Enter the repetitions you reached')).toBeInTheDocument();

            fireEvent.change(screen.getByLabelText('Repetitions'), { target: { value: '9' } });
            expect(screen.getByRole('button', { name: /^Done set/ })).toBeEnabled();
            expect(screen.queryByText('Enter the repetitions you reached')).not.toBeInTheDocument();
        });

        test('max reps asks for the count as well, even with a weight planned', () => {
            renderSession([
                { ...gymSquats, repetitionUnit: { id: 7, name: 'Max Reps' }, repetitions: null, weight: 20 }
            ]);

            expect(screen.getByRole('button', { name: /^Done set/ })).toBeDisabled();
        });

        test('body weight with until failure and nothing entered cannot be logged', () => {
            renderSession([
                {
                    ...gymSquats,
                    repetitionUnit: { id: 2, name: 'Until Failure' },
                    weightUnit: { id: 3, name: 'Body Weight' },
                    repetitions: null,
                    weight: null,
                }
            ]);

            fireEvent.change(screen.getByLabelText('Repetitions'), { target: { value: '0' } });
            // Zero is a number that can be saved
            expect(screen.getByRole('button', { name: /^Done set/ })).toBeEnabled();

            fireEvent.change(screen.getByLabelText('Repetitions'), { target: { value: '' } });
            expect(screen.getByRole('button', { name: /^Done set/ })).toBeDisabled();
        });

        test('a set with neither repetitions nor weight cannot be done', () => {
            renderSession([
                { ...gymTimed, repetitions: null, weight: null, repetitionUnit: { id: 3, name: 'Seconds' } }
            ]);

            expect(screen.getByRole('button', { name: /^Done set/ })).toBeDisabled();
            expect(screen.getByText('Enter the repetitions or the weight to log this set.')).toBeInTheDocument();

            fireEvent.change(screen.getByLabelText('Seconds'), { target: { value: '20' } });
            expect(screen.getByRole('button', { name: /^Done set/ })).toBeEnabled();
        });

        test('the log keeps the units of the exercise', () => {
            renderSession();

            doneSet();

            const table = within(screen.getByRole('table', { name: 'Sets of this session' }));
            expect(table.getByText('5 Repetitions')).toBeInTheDocument();
            expect(table.getByText('80 kg')).toBeInTheDocument();
            expect(table.getByText('120s')).toBeInTheDocument();
        });

        test('only numbers are accepted', () => {
            renderSession();

            fireEvent.change(screen.getByLabelText('Weight'), { target: { value: 'heavy' } });

            expect(screen.getByRole('button', { name: /^Done set/ })).toBeDisabled();
            expect(screen.getByText('Please enter a valid number')).toBeInTheDocument();
        });
    });

    describe('previous values', () => {
        const previousLog = {
            exerciseId: gymSquats.exerciseId,
            date: new Date(2024, 0, 2),
            repetitions: 8,
            weight: 77.5,
            repetitionUnitObj: gymRepUnitRepetitions,
            weightUnitObj: gymWeightUnitKg,
        };

        test('shows the newest log of the exercise and can use it', () => {
            renderSession(gymExercises, [
                { ...previousLog, date: new Date(2023, 5, 1), repetitions: 3, weight: 10 },
                previousLog,
            ]);

            expect(screen.getByText(/Previous: 8 Repetitions x 77.5 kg/)).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: 'Use previous values' }));

            expect(screen.getByLabelText('Repetitions')).toHaveValue('8');
            expect(screen.getByLabelText('Weight')).toHaveValue('77.5');
        });

        test('is not shown for an exercise without logs', () => {
            renderSession(gymExercises, [previousLog]);

            selectExercise('Benchpress');

            expect(screen.queryByText(/Previous:/)).not.toBeInTheDocument();
        });
    });

    describe('rest timer', () => {
        test('starts with the rest of the exercise after "Done set"', () => {
            renderSession();

            doneSet();

            expect(countdown()).toBe('2:00');
            expect(screen.getByText('Rest after Squats')).toBeInTheDocument();
            expect(listItem('Squats').getByText('1 / 2 sets')).toBeInTheDocument();
            expect(unlock).toHaveBeenCalled();
        });

        test('counts down every second', () => {
            renderSession();
            doneSet();

            advance(1000);
            expect(countdown()).toBe('1:59');
            advance(59_000);
            expect(countdown()).toBe('1:00');
        });

        test('falls back to the default of 90 seconds', () => {
            renderSession();
            selectExercise('Benchpress');

            doneSet();

            expect(countdown()).toBe('1:30');
        });

        test('keeps the rest of the exercise just done when jumping to another', () => {
            renderSession();
            doneSet();
            advance(10_000);

            selectExercise('Curls');

            expect(countdown()).toBe('1:50');
            expect(screen.getByText('Rest after Squats')).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: 'Curls' })).toBeInTheDocument();

            // The next set of the other exercise restarts it with its own rest
            doneSet();
            expect(countdown()).toBe('0:45');
            expect(screen.getByText('Rest after Curls')).toBeInTheDocument();
        });

        test('a new set restarts the countdown', () => {
            renderSession();
            doneSet();
            advance(30_000);

            doneSet();

            expect(countdown()).toBe('2:00');
        });

        test('can be skipped', () => {
            renderSession();
            doneSet();

            fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }));

            expect(countdown()).toBe('0:00');
            expect(screen.getByText('Complete a set to start the rest timer.')).toBeInTheDocument();
        });

        test('stays at zero when it is over', () => {
            renderSession();
            doneSet();

            advance(125_000);

            expect(countdown()).toBe('0:00');
            expect(screen.getByText('Rest is over')).toBeInTheDocument();
        });

        test('has no countdown for a rest of zero', () => {
            renderSession([{ ...gymSquats, restTime: 0 }]);

            doneSet();

            expect(countdown()).toBe('0:00');
            expect(screen.getByText('Complete a set to start the rest timer.')).toBeInTheDocument();
        });
    });

    describe('rest alerts', () => {
        test('warns once at 20 seconds', () => {
            renderSession();
            doneSet();

            advance(99_000);
            expect(alertsPlayed()).toEqual([]);

            advance(1000);
            expect(countdown()).toBe('0:20');
            expect(alertsPlayed()).toEqual(['warning']);

            advance(1000);
            expect(alertsPlayed()).toEqual(['warning']);
        });

        test('ticks in the last five seconds and ends with the long tone', () => {
            renderSession();
            doneSet();

            advance(100_000);
            playAlert.mockClear();

            for (let i = 0; i < 20; i++) {
                advance(1000);
            }

            expect(countdown()).toBe('0:00');
            expect(alertsPlayed()).toEqual(['tick', 'tick', 'tick', 'tick', 'tick', 'end']);
        });

        test('plays every alert, even if the timer was slow', () => {
            renderSession();
            doneSet();

            // A background tab may not run the timer for a while
            advance(120_000);

            expect(alertsPlayed()).toEqual(['warning', 'tick', 'tick', 'tick', 'tick', 'tick', 'end']);
        });

        test('the warning can be switched off, the rest of the alerts stay', () => {
            renderSession();
            fireEvent.click(screen.getByRole('switch', { name: 'Warning at 20 seconds' }));
            doneSet();

            advance(120_000);

            expect(alertsPlayed()).toEqual(['tick', 'tick', 'tick', 'tick', 'tick', 'end']);
        });

        test('the sound is passed on to the audio and can be switched off', () => {
            renderSession();
            expect(useGymAudio).toHaveBeenLastCalledWith(true);

            fireEvent.click(screen.getByRole('switch', { name: 'Sound' }));

            expect(useGymAudio).toHaveBeenLastCalledWith(false);
        });

        test('the toggles are remembered', () => {
            const { unmount } = renderSession();

            fireEvent.click(screen.getByRole('switch', { name: 'Sound' }));
            fireEvent.click(screen.getByRole('switch', { name: 'Auto-advance after rest' }));
            expect(JSON.parse(window.localStorage.getItem(GYM_PREFERENCES_KEY)!)).toEqual({
                soundEnabled: false,
                warningEnabled: true,
                autoAdvance: false,
            });

            unmount();
            renderSession();

            expect(screen.getByRole('switch', { name: 'Sound' })).not.toBeChecked();
            expect(screen.getByRole('switch', { name: 'Warning at 20 seconds' })).toBeChecked();
            expect(screen.getByRole('switch', { name: 'Auto-advance after rest' })).not.toBeChecked();
        });
    });

    describe('auto-advance', () => {
        const finishSquats = () => {
            doneSet();
            doneSet();
        };

        test('moves on to the next exercise when the rest is over', () => {
            renderSession();
            finishSquats();

            // Still on the finished exercise while resting
            expect(screen.getByText('All sets of this exercise are done.')).toBeInTheDocument();
            advance(119_000);
            expect(screen.getByRole('heading', { name: 'Squats' })).toBeInTheDocument();

            advance(1000);

            expect(screen.getByRole('heading', { name: 'Benchpress' })).toBeInTheDocument();
            expect(screen.getByText('Set 1 of 1')).toBeInTheDocument();
        });

        test('stays on an exercise with sets left, for the next set', () => {
            renderSession();
            doneSet();

            advance(120_000);

            expect(screen.getByRole('heading', { name: 'Squats' })).toBeInTheDocument();
            expect(screen.getByText('Set 2 of 2')).toBeInTheDocument();
        });

        test('does nothing when switched off', () => {
            renderSession();
            fireEvent.click(screen.getByRole('switch', { name: 'Auto-advance after rest' }));
            finishSquats();

            advance(125_000);

            expect(screen.getByRole('heading', { name: 'Squats' })).toBeInTheDocument();
            // The user goes on by hand
            fireEvent.click(screen.getByRole('button', { name: 'Next exercise' }));
            expect(screen.getByRole('heading', { name: 'Benchpress' })).toBeInTheDocument();
        });

        test('goes on right away when there is no rest', () => {
            renderSession([{ ...gymSquats, nrOfSets: 1, restTime: 0 }, gymBenchPress]);

            doneSet();

            expect(screen.getByRole('heading', { name: 'Benchpress' })).toBeInTheDocument();
        });

        test('goes to the next exercise in the order the user chose', () => {
            renderSession();
            fireEvent.click(screen.getByRole('button', { name: 'Move Curls up' }));
            finishSquats();

            advance(120_000);

            expect(screen.getByRole('heading', { name: 'Curls' })).toBeInTheDocument();
        });
    });

    describe('jumping and reordering', () => {
        test('shows a warning, but no block, when jumping out of order', () => {
            renderSession();
            const warning = 'This exercise was planned later; the plan order may matter for this goal.';
            expect(screen.queryByText(warning)).not.toBeInTheDocument();

            selectExercise('Curls');

            expect(screen.getByText(warning)).toBeInTheDocument();
            // Not blocked
            expect(screen.getByRole('button', { name: /^Done set/ })).toBeEnabled();

            selectExercise('Squats');
            expect(screen.queryByText(warning)).not.toBeInTheDocument();
        });

        test('finished exercises can not be picked anymore', () => {
            renderSession();
            doneSet();
            doneSet();

            const squats = within(screen.getByRole('list')).getByRole('button', { name: /Squats/ });
            expect(squats).toHaveAttribute('aria-disabled', 'true');
        });

        test('moves exercises up and down', () => {
            renderSession();
            const names = () => within(screen.getByRole('list')).getAllByRole('listitem')
                .map(item => within(item).getByText(/Squats|Benchpress|Curls/).textContent);
            expect(names()).toEqual(['Squats', 'Benchpress', 'Curls']);

            fireEvent.click(screen.getByRole('button', { name: 'Move Curls up' }));
            expect(names()).toEqual(['Squats', 'Curls', 'Benchpress']);

            fireEvent.click(screen.getByRole('button', { name: 'Move Squats down' }));
            expect(names()).toEqual(['Curls', 'Squats', 'Benchpress']);
        });

        test('the first and last can not move further', () => {
            renderSession();

            expect(screen.getByRole('button', { name: 'Move Squats up' })).toBeDisabled();
            expect(screen.getByRole('button', { name: 'Move Curls down' })).toBeDisabled();
            expect(screen.getByRole('button', { name: 'Move Squats down' })).toBeEnabled();
        });

        test('moving does not change the current exercise', () => {
            renderSession();

            fireEvent.click(screen.getByRole('button', { name: 'Move Curls up' }));

            expect(screen.getByRole('heading', { name: 'Squats' })).toBeInTheDocument();
        });
    });

    describe('timed sets', () => {
        const startTimer = () => fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));

        test('count down the planned time and fill it in', () => {
            renderSession();
            selectExercise('Curls');
            expect(screen.getByTestId('set-timer')).toHaveTextContent('0:30');
            fireEvent.change(screen.getByLabelText('Seconds'), { target: { value: '1' } });

            startTimer();
            advance(10_000);
            expect(screen.getByTestId('set-timer')).toHaveTextContent('0:20');

            advance(20_000);

            expect(screen.getByTestId('set-timer')).toHaveTextContent('0:30');
            expect(screen.getByLabelText('Seconds')).toHaveValue('30');
            expect(alertsPlayed()).toEqual(['end']);
            expect(screen.getByRole('button', { name: 'Start timer' })).toBeInTheDocument();
        });

        test('can be stopped early, which fills in the time done', () => {
            renderSession();
            selectExercise('Curls');

            startTimer();
            advance(12_000);
            fireEvent.click(screen.getByRole('button', { name: 'Stop timer' }));

            expect(screen.getByLabelText('Seconds')).toHaveValue('12');
            expect(alertsPlayed()).toEqual([]);
        });

        test('are a stopwatch without a planned time', () => {
            renderSession([{ ...gymTimed, repetitions: null }]);

            startTimer();
            advance(5000);
            expect(screen.getByTestId('set-timer')).toHaveTextContent('0:05');
            advance(60_000);
            expect(screen.getByTestId('set-timer')).toHaveTextContent('1:05');
            fireEvent.click(screen.getByRole('button', { name: 'Stop timer' }));

            expect(screen.getByLabelText('Seconds')).toHaveValue('65');
        });

        test('minutes are filled in as minutes', () => {
            renderSession([{ ...gymTimed, repetitions: 2, repetitionUnit: { id: 4, name: 'Minutes' } }]);
            expect(screen.getByTestId('set-timer')).toHaveTextContent('2:00');

            startTimer();
            advance(90_000);
            fireEvent.click(screen.getByRole('button', { name: 'Stop timer' }));

            expect(screen.getByLabelText('Minutes')).toHaveValue('1.5');
        });

        test('are not offered for repetitions', () => {
            renderSession();

            expect(screen.queryByTestId('set-timer')).not.toBeInTheDocument();
        });
    });

    describe('logged sets', () => {
        test('a set can be removed again', () => {
            renderSession();
            doneSet();
            expect(listItem('Squats').getByText('1 / 2 sets')).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: 'Remove this set' }));

            expect(listItem('Squats').getByText('0 / 2 sets')).toBeInTheDocument();
            expect(screen.getByText('No sets logged yet')).toBeInTheDocument();
        });

        test('the entered values are logged', () => {
            renderSession();
            fireEvent.change(screen.getByLabelText('Repetitions'), { target: { value: '7' } });
            fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '82,5' } });

            doneSet();

            const table = within(screen.getByRole('table', { name: 'Sets of this session' }));
            expect(table.getByText('7 Repetitions')).toBeInTheDocument();
            expect(table.getByText('82.5 kg')).toBeInTheDocument();
        });

        test('the values stay for the next set of the exercise', () => {
            renderSession();
            fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '90' } });

            doneSet();

            expect(screen.getByLabelText('Weight')).toHaveValue('90');
        });
    });

    describe('finishing', () => {
        const lastState = (): GymState => onFinish.mock.calls[0][0];

        test('can not be done before anything was logged', () => {
            renderSession();

            expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled();
        });

        test('hands the logged sets over', async () => {
            renderSession([gymBenchPress]);
            doneSet();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
            });

            expect(onFinish).toHaveBeenCalledTimes(1);
            expect(lastState().logged).toHaveLength(1);
            expect(lastState().logged[0]).toMatchObject({ exerciseId: gymBenchPress.exerciseId, repetitions: 10 });
        });

        test('asks for confirmation when sets are left', async () => {
            renderSession();
            doneSet();

            fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

            expect(onFinish).not.toHaveBeenCalled();
            expect(screen.getByText('Finish with sets left?')).toBeInTheDocument();
            expect(screen.getByText(/4 planned sets were not done/)).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Finish' }));
            });
            expect(onFinish).toHaveBeenCalledTimes(1);
        });

        test('keep training closes the dialog', () => {
            renderSession();
            doneSet();
            fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

            fireEvent.click(screen.getByRole('button', { name: 'Keep training' }));

            expect(onFinish).not.toHaveBeenCalled();
        });

        test('says so when saving failed, and can try again', async () => {
            onFinish.mockRejectedValueOnce(new Error('nope'));
            renderSession([gymBenchPress]);
            doneSet();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
            });
            expect(screen.getByText('The training session could not be saved. Please try again.'))
                .toBeInTheDocument();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
            });
            expect(onFinish).toHaveBeenCalledTimes(2);
            expect(screen.queryByText('The training session could not be saved. Please try again.'))
                .not.toBeInTheDocument();
        });
    });
});
