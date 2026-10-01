import { useLanguageQuery } from "@/components/Exercises";
import {
    useAddRoutineLogsQuery,
    useAddSessionQuery,
    useRoutineDetailQuery,
    useRoutineLogQuery
} from "@/components/Routines/queries";
import { Day } from "@/components/Routines/models/Day";
import { Routine } from "@/components/Routines/models/Routine";
import { RoutineDayData } from "@/components/Routines/models/RoutineDayData";
import { SetConfigData } from "@/components/Routines/models/SetConfigData";
import { SlotData } from "@/components/Routines/models/SlotData";
import { WorkoutSession } from "@/components/Routines/models/WorkoutSession";
import { GymMode } from "@/components/Routines/screens/Detail/GymMode";
import { testExerciseSquats, testLanguages } from "@/tests/exerciseTestdata";
import { gymRepUnitRepetitions, gymWeightUnitKg } from "@/tests/gymTestData";
import { testWorkoutLogs } from "@/tests/workoutLogsRoutinesTestData";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18n from "i18next";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Mock } from "vitest";
import translations from "../../../../../public/locales/en/translation.json";

vi.mock("@/components/Exercises/queries");
vi.mock("@/components/Routines/queries");

const day = new Day({ id: 5, routineId: 1, order: 1, name: 'Leg day' });

const makeRoutine = (nrOfSets = 1) => new Routine({
    id: 1,
    name: 'Test routine',
    description: '',
    created: new Date('2024-01-01'),
    start: new Date('2024-01-01'),
    end: new Date('2034-01-01'),
    fitInWeek: false,
    isTemplate: false,
    isPublic: false,
    days: [day],
    dayData: [
        // Nothing is planned for today, so the first iteration is used
        new RoutineDayData(1, new Date('2024-01-02'), '', day, [
            new SlotData('', false, [345], [
                new SetConfigData({
                    exerciseId: 345,
                    exercise: testExerciseSquats,
                    slotEntryId: 11,
                    type: 'normal',
                    nrOfSets: nrOfSets,
                    weight: 60,
                    weightUnitId: 1,
                    weightUnit: gymWeightUnitKg,
                    weightRounding: null,
                    repetitions: 8,
                    repetitionsUnitId: 1,
                    repetitionsUnit: gymRepUnitRepetitions,
                    repetitionsRounding: null,
                    restTime: 60,
                    textRepr: '',
                    comment: '',
                })
            ], [testExerciseSquats])
        ])
    ],
});

describe('GymMode', () => {

    const addSession = vi.fn();
    const addLogs = vi.fn();

    beforeAll(() => {
        i18n.addResourceBundle('en', 'translations', translations, true, true);
    });

    afterAll(() => {
        i18n.removeResourceBundle('en', 'translations');
    });

    beforeEach(() => {
        vi.clearAllMocks();
        (useRoutineDetailQuery as Mock).mockReturnValue({ isLoading: false, isSuccess: true, data: makeRoutine() });
        (useRoutineLogQuery as Mock).mockReturnValue({ isLoading: false, isSuccess: true, data: testWorkoutLogs });
        (useLanguageQuery as Mock).mockReturnValue({ isLoading: false, isSuccess: true, data: testLanguages });
        addSession.mockImplementation(async (session: WorkoutSession) =>
            new WorkoutSession({ ...session, id: 'session-uuid-1' }));
        addLogs.mockResolvedValue([]);
        (useAddSessionQuery as Mock).mockReturnValue({ mutateAsync: addSession });
        (useAddRoutineLogsQuery as Mock).mockReturnValue({ mutateAsync: addLogs });
    });

    const renderPage = (path = '/en/routine/1/day/5/gym') => render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/:lang/routine/:routineId/day/:dayId/gym" element={<GymMode />} />
                <Route path="/:lang/routine/:routineId/view" element={<p>routine detail page</p>} />
            </Routes>
        </MemoryRouter>
    );

    test('shows the day with its exercise', () => {
        renderPage();

        expect(screen.getByText('Gym mode: Leg day')).toBeInTheDocument();
        expect(screen.getAllByText('Squats').length).toBeGreaterThan(0);
        expect(screen.getByText('8 Repetitions x 60 kg')).toBeInTheDocument();
        expect(useRoutineDetailQuery).toHaveBeenCalledWith(1);
    });

    test('shows what was done the last time', () => {
        renderPage();

        // The newest of the logs for the squats, which is not the heaviest one
        expect(screen.getByText(/Previous: 8 Repetitions x 10 kg/)).toBeInTheDocument();
    });

    test('rejects ids that are not numbers', () => {
        renderPage('/en/routine/abc/day/5/gym');
        expect(screen.getByText('Please pass an integer as the routine id.')).toBeInTheDocument();
    });

    test('rejects day ids that are not numbers', () => {
        renderPage('/en/routine/1/day/xyz/gym');
        expect(screen.getByText('Please pass an integer as the day id.')).toBeInTheDocument();
    });

    test('says so when the day has no exercises', () => {
        (useRoutineDetailQuery as Mock).mockReturnValue({
            isLoading: false,
            isSuccess: true,
            data: makeRoutine(),
        });
        renderPage('/en/routine/1/day/99/gym');

        expect(screen.getByText('There are no exercises planned for this day.')).toBeInTheDocument();
    });

    test('shows the loading state', () => {
        (useRoutineDetailQuery as Mock).mockReturnValue({ isLoading: true, isSuccess: false });
        renderPage();

        expect(screen.queryByText('Gym mode: Leg day')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();
    });

    test('nothing is saved while training', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /^Done set/ }));

        expect(addSession).not.toHaveBeenCalled();
        expect(addLogs).not.toHaveBeenCalled();
    });

    test('saves a session and the logs, with their units, on finish', async () => {
        renderPage();
        fireEvent.change(screen.getByLabelText('Repetitions'), { target: { value: '9' } });
        fireEvent.click(screen.getByRole('button', { name: /^Done set/ }));

        fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

        await waitFor(() => expect(screen.getByText('routine detail page')).toBeInTheDocument());
        expect(addSession).toHaveBeenCalledTimes(1);
        const session: WorkoutSession = addSession.mock.calls[0][0];
        expect(session).toBeInstanceOf(WorkoutSession);
        expect(session).toMatchObject({ id: null, dayId: 5, routineId: 1 });
        expect(session.datetimeEnd).not.toBeNull();

        expect(addLogs).toHaveBeenCalledTimes(1);
        expect(addLogs.mock.calls[0][0]).toHaveLength(1);
        expect(addLogs.mock.calls[0][0][0]).toMatchObject({
            session: 'session-uuid-1',
            routine: 1,
            day: 5,
            iteration: null,
            exercise: 345,
            slot_entry: 11,
            repetitions: 9,
            repetitions_target: 8,
            repetitions_unit: gymRepUnitRepetitions.id,
            weight: 60,
            weight_target: 60,
            weight_unit: gymWeightUnitKg.id,
        });
    });

    test('saves every set as its own log', async () => {
        (useRoutineDetailQuery as Mock).mockReturnValue({ isLoading: false, isSuccess: true, data: makeRoutine(2) });
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: /^Done set/ }));
        fireEvent.click(screen.getByRole('button', { name: /^Done set/ }));

        fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

        await waitFor(() => expect(screen.getByText('routine detail page')).toBeInTheDocument());
        expect(addLogs).toHaveBeenCalledTimes(2);
        expect(addSession).toHaveBeenCalledTimes(1);
    });

    test('a retry does not create the session or the logs a second time', async () => {
        (useRoutineDetailQuery as Mock).mockReturnValue({ isLoading: false, isSuccess: true, data: makeRoutine(2) });
        addLogs.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('server down'));
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: /^Done set/ }));
        fireEvent.click(screen.getByRole('button', { name: /^Done set/ }));

        fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
        await waitFor(() => expect(screen.getByText(/could not be saved/)).toBeInTheDocument());
        expect(screen.queryByText('routine detail page')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

        await waitFor(() => expect(screen.getByText('routine detail page')).toBeInTheDocument());
        expect(addSession).toHaveBeenCalledTimes(1);
        // First log saved, second failed and was tried again: three calls, not four
        expect(addLogs).toHaveBeenCalledTimes(3);
    });

    test('stays on the page when the session can not be created', async () => {
        addSession.mockRejectedValue(new Error('server down'));
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: /^Done set/ }));

        fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

        await waitFor(() => expect(screen.getByText(/could not be saved/)).toBeInTheDocument());
        expect(addLogs).not.toHaveBeenCalled();
    });
});
