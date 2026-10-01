import { TrainingLocation } from "@/components/Locations/models/TrainingLocation";
import { ZoneOrder } from "@/components/Locations/models/ZoneOrder";
import { useLocationsQuery, useZoneOrderQuery } from "@/components/Locations/queries";
import { GymSession } from "@/components/Routines/gym/GymSession";
import { useGymAudio } from "@/components/Routines/gym/useGymAudio";
import { gymBenchPress, gymExercises, gymSquats, gymTimed } from "@/tests/gymTestData";
import { fireEvent, render, screen, within } from "@testing-library/react";
import i18n from "i18next";
import React from "react";
import type { Mock } from "vitest";
import translations from "../../../../public/locales/en/translation.json";

vi.mock("@/components/Routines/gym/useGymAudio");
vi.mock("@/components/Locations/queries");

const gymCentro = new TrainingLocation(3, 'Gym centro', true, [1], null);
const garage = new TrainingLocation(4, 'Garage', false, [1], 30);

// Planned: squats (Rack), bench (Bench area), curls (Rack). Suggested: squats, curls, bench.
const zoneOrder: ZoneOrder = {
    locationId: 3,
    locationName: 'Gym centro',
    items: [
        { slotId: 1, slotEntryId: gymSquats.slotEntryId, exerciseId: gymSquats.exerciseId, zoneId: 5, zoneName: 'Rack', plannedIndex: 0 },
        { slotId: 3, slotEntryId: gymTimed.slotEntryId, exerciseId: gymTimed.exerciseId, zoneId: 5, zoneName: 'Rack', plannedIndex: 2 },
        { slotId: 2, slotEntryId: gymBenchPress.slotEntryId, exerciseId: gymBenchPress.exerciseId, zoneId: 6, zoneName: 'Bench area', plannedIndex: 1 },
    ],
    zoneChangesPlanned: 2,
    zoneChangesSuggested: 1,
    missingEquipment: [{ exerciseId: gymBenchPress.exerciseId, equipment: [{ id: 8, name: 'Bench' }] }],
};

describe('GymPlanningPanel in the gym mode', () => {
    beforeAll(() => {
        i18n.addResourceBundle('en', 'translations', translations, true, true);
    });

    afterAll(() => {
        i18n.removeResourceBundle('en', 'translations');
    });

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        (useGymAudio as Mock).mockReturnValue({ playAlert: vi.fn(), unlock: vi.fn() });
        (useLocationsQuery as Mock).mockReturnValue({ isSuccess: true, data: [garage, gymCentro] });
        (useZoneOrderQuery as Mock).mockReturnValue({ isSuccess: true, data: zoneOrder });
    });

    const renderSession = (exercises = gymExercises) => render(
        <GymSession exercises={exercises} previousLogs={[]} routineId={7} dayId={12}
                    onFinish={vi.fn().mockResolvedValue(undefined)} />
    );

    const listNames = () => within(screen.getByRole('list')).getAllByRole('button', { name: /^(Squats|Benchpress|Curls)/ })
        .map(button => /^(Squats|Benchpress|Curls)/.exec(button.textContent ?? '')![1]);

    test('preselects the default location and asks for its zone order', () => {
        renderSession();

        expect(screen.getByRole('combobox', { name: 'Location' })).toHaveTextContent('Gym centro');
        expect(useZoneOrderQuery).toHaveBeenLastCalledWith(7, 12, 3, true);
    });

    test('another location can be picked', () => {
        renderSession();

        fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Location' }));
        fireEvent.click(screen.getByRole('option', { name: 'Garage' }));

        expect(useZoneOrderQuery).toHaveBeenLastCalledWith(7, 12, 4, true);
    });

    test('shows the zone of each exercise and the zone changes', () => {
        renderSession();

        const list = within(screen.getByRole('list'));
        expect(list.getAllByText('Rack')).toHaveLength(2);
        expect(list.getByText('Bench area')).toBeInTheDocument();
        expect(screen.getByText('Zone changes: planned 2 → suggested 1')).toBeInTheDocument();
    });

    test('warns about the equipment the location does not have', () => {
        renderSession();

        expect(screen.getByText('Benchpress needs equipment this location does not have: Bench')).toBeInTheDocument();
    });

    test('orders the session by zone with the move actions of the reducer', () => {
        renderSession();
        expect(listNames()).toEqual(['Squats', 'Benchpress', 'Curls']);

        fireEvent.click(screen.getByRole('button', { name: 'Order by zone' }));

        expect(listNames()).toEqual(['Squats', 'Curls', 'Benchpress']);
        expect(screen.getByRole('button', { name: 'Order by zone' })).toBeDisabled();
    });

    test('without a location there is nothing to order and the way to add one is offered', () => {
        (useLocationsQuery as Mock).mockReturnValue({ isSuccess: true, data: [] });
        (useZoneOrderQuery as Mock).mockReturnValue({ isSuccess: false, data: undefined });
        renderSession();

        expect(screen.getByText(/No training locations yet\./)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Training locations' })).toHaveAttribute('href', '/en/user/locations');
        expect(screen.queryByRole('button', { name: 'Order by zone' })).not.toBeInTheDocument();
        expect(useZoneOrderQuery).toHaveBeenLastCalledWith(7, 12, null, false);
    });

    describe('time budget', () => {
        const chooseBudget = (minutes: number) => {
            fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Time available' }));
            fireEvent.click(screen.getByRole('option', { name: `${minutes} min` }));
        };

        test('shows the estimated duration', () => {
            renderSession();

            // squats 2 x 160, bench 1 x 130, curls 2 x 75 = 600 s
            expect(screen.getByText('Estimated duration: about 10 min')).toBeInTheDocument();
            expect(screen.queryByText(/but you have/)).not.toBeInTheDocument();
        });

        test('a budget that is long enough changes nothing', () => {
            renderSession();

            chooseBudget(30);

            expect(screen.queryByText(/but you have/)).not.toBeInTheDocument();
        });

        test('the time of the location counts when it is shorter than the plan', () => {
            // The 10 min plan against the 30 min of the garage still fits, a 5 min location does not
            (useLocationsQuery as Mock).mockReturnValue({
                isSuccess: true,
                data: [new TrainingLocation(3, 'Gym centro', true, [], 5)]
            });
            renderSession();

            expect(screen.getByText('The session takes about 10 min but you have 5 min.')).toBeInTheDocument();
        });

        test('shows which sets to drop and applies them', () => {
            (useLocationsQuery as Mock).mockReturnValue({
                isSuccess: true,
                data: [new TrainingLocation(3, 'Gym centro', true, [], 7)]
            });
            renderSession();

            expect(screen.getByText('The session takes about 10 min but you have 7 min.')).toBeInTheDocument();
            // 600 s planned, 420 s allowed: one squat set (160) and one set of curls (75) go
            expect(screen.getByText('Drop 1 set of Squats')).toBeInTheDocument();
            expect(screen.getByText('Drop 1 set of Curls')).toBeInTheDocument();
            expect(screen.getByText('0 of 5 sets done')).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: 'Drop these sets' }));

            expect(screen.getByText('0 of 3 sets done')).toBeInTheDocument();
            expect(screen.queryByText(/but you have/)).not.toBeInTheDocument();
        });

        test('the smaller of the location and the chosen budget wins', () => {
            (useLocationsQuery as Mock).mockReturnValue({
                isSuccess: true,
                data: [new TrainingLocation(3, 'Gym centro', true, [], 60)]
            });
            renderSession();
            expect(screen.queryByText(/but you have/)).not.toBeInTheDocument();

            chooseBudget(30);
            expect(screen.queryByText(/but you have/)).not.toBeInTheDocument();
        });

        test('says so when whole exercises would be left out', () => {
            (useLocationsQuery as Mock).mockReturnValue({
                isSuccess: true,
                data: [new TrainingLocation(3, 'Gym centro', true, [], 1)]
            });
            renderSession();

            expect(screen.getByText('Some exercises would be left out completely.')).toBeInTheDocument();
        });
    });
});
