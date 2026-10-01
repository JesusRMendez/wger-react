import { useLanguageQuery } from "@/components/Exercises";
import {
    useAddRoutineLogsQuery,
    useAddSessionQuery,
    useRoutineDetailQuery
} from "@/components/Routines/queries";
import { Day } from "@/components/Routines/models/Day";
import { Routine } from "@/components/Routines/models/Routine";
import { RoutineDayData } from "@/components/Routines/models/RoutineDayData";
import { SetConfigData } from "@/components/Routines/models/SetConfigData";
import { SlotData } from "@/components/Routines/models/SlotData";
import { WorkoutSession } from "@/components/Routines/models/WorkoutSession";
import { GuidedMode } from "@/components/Routines/screens/Detail/GuidedMode";
import { testExerciseSquats, testLanguages } from "@/tests/exerciseTestdata";
import { gymRepUnitRepetitions, gymWeightUnitKg } from "@/tests/gymTestData";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

describe('GuidedMode', () => {

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
        (useLanguageQuery as Mock).mockReturnValue({ isLoading: false, isSuccess: true, data: testLanguages });
        addSession.mockImplementation(async (session: WorkoutSession) =>
            new WorkoutSession({ ...session, id: 'session-uuid-1' }));
        addLogs.mockResolvedValue([]);
        (useAddSessionQuery as Mock).mockReturnValue({ mutateAsync: addSession });
        (useAddRoutineLogsQuery as Mock).mockReturnValue({ mutateAsync: addLogs });
    });

    const renderPage = (path = '/en/routine/1/day/5/guided') => render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/:lang/routine/:routineId/day/:dayId/guided" element={<GuidedMode />} />
                <Route path="/:lang/routine/:routineId/view" element={<p>routine detail page</p>} />
            </Routes>
        </MemoryRouter>
    );

    test('shows the day, ready to start', () => {
        renderPage();

        expect(screen.getByText('Guided routine: Leg day')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
        expect(useRoutineDetailQuery).toHaveBeenCalledWith(1);
    });

    test('rejects a route without ids', () => {
        renderPage('/en/routine/abc/day/5/guided');

        expect(screen.getByText('Please pass an integer as the routine id.')).toBeInTheDocument();
    });

    test('says so when the day has no exercises', () => {
        (useRoutineDetailQuery as Mock).mockReturnValue({
            isLoading: false,
            isSuccess: true,
            data: new Routine({ ...makeRoutine(), dayData: [] })
        });

        renderPage();

        expect(screen.getByText('There are no exercises planned for this day.')).toBeInTheDocument();
    });

    test('runs a one-set day and saves the session and its logs with the units', async () => {
        vi.useFakeTimers();
        try {
            renderPage();

            fireEvent.click(screen.getByRole('button', { name: 'Start' }));
            act(() => {
                vi.advanceTimersByTime(3000);
            });
            fireEvent.click(screen.getByRole('button', { name: 'Done' }));
            expect(screen.getByText('All sets are done. Finish to save the training.')).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
            });
        } finally {
            vi.useRealTimers();
        }

        expect(addSession).toHaveBeenCalledTimes(1);
        expect(addSession.mock.calls[0][0]).toMatchObject({ dayId: 5, routineId: 1 });
        expect(addLogs).toHaveBeenCalledTimes(1);
        expect(addLogs.mock.calls[0][0][0]).toMatchObject({
            session: 'session-uuid-1',
            repetitions: 8,
            repetitions_unit: 1,
            weight: 60,
            weight_unit: 1,
        });
        expect(await screen.findByText('routine detail page')).toBeInTheDocument();
    });
});
