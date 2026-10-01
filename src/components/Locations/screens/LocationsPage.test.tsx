import { Equipment } from "@/components/Exercises";
import { getZones } from "@/components/Locations/api/locations";
import { LocationZone } from "@/components/Locations/models/LocationZone";
import { TrainingLocation } from "@/components/Locations/models/TrainingLocation";
import {
    useAddLocationQuery,
    useAddZoneQuery,
    useDeleteLocationQuery,
    useDeleteZoneQuery,
    useEditLocationQuery,
    useEditZoneQuery,
    useLocationsQuery,
    usePruneZonesQuery,
    useUpdateZoneOrderQuery,
    useZonesQuery
} from "@/components/Locations/queries";
import { LocationsPage } from "@/components/Locations/screens/LocationsPage";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import i18n from "i18next";
import React from "react";
import type { Mock } from "vitest";
import translations from "../../../../public/locales/en/translation.json";

vi.mock("@/components/Locations/queries");
vi.mock("@/components/Locations/api/locations");
vi.mock("@/components/Exercises/queries", () => ({
    useEquipmentQuery: () => ({
        data: [new Equipment(1, 'Barbell'), new Equipment(2, 'Bench'), new Equipment(3, 'Dumbbell')],
        isSuccess: true,
    }),
}));

const location = new TrainingLocation(3, 'Gym centro', true, [1, 2], 45);
const home = new TrainingLocation(4, 'Home', false, [3], null);
const zones = [
    new LocationZone(10, 3, 'Racks', 0, [1]),
    new LocationZone(11, 3, 'Benches', 1, [2]),
];

const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });

describe('LocationsPage', () => {
    let addLocation: ReturnType<typeof mutation>;
    let editLocation: ReturnType<typeof mutation>;
    let deleteLocation: ReturnType<typeof mutation>;
    let updateOrder: ReturnType<typeof mutation>;
    let prune: ReturnType<typeof mutation>;
    let deleteZone: ReturnType<typeof mutation>;

    beforeAll(() => {
        i18n.addResourceBundle('en', 'translations', translations, true, true);
    });

    afterAll(() => {
        i18n.removeResourceBundle('en', 'translations');
    });

    beforeEach(() => {
        vi.clearAllMocks();
        addLocation = mutation();
        editLocation = mutation();
        deleteLocation = mutation();
        updateOrder = mutation();
        prune = mutation();
        deleteZone = mutation();
        (useLocationsQuery as Mock).mockReturnValue({ isSuccess: true, isLoading: false, data: [location, home] });
        (useZonesQuery as Mock).mockImplementation((id: number) => ({
            isSuccess: true,
            isLoading: false,
            data: id === 3 ? zones : []
        }));
        (useAddLocationQuery as Mock).mockReturnValue(addLocation);
        (useEditLocationQuery as Mock).mockReturnValue(editLocation);
        (useDeleteLocationQuery as Mock).mockReturnValue(deleteLocation);
        (useAddZoneQuery as Mock).mockReturnValue(mutation());
        (useEditZoneQuery as Mock).mockReturnValue(mutation());
        (useDeleteZoneQuery as Mock).mockReturnValue(deleteZone);
        (useUpdateZoneOrderQuery as Mock).mockReturnValue(updateOrder);
        (usePruneZonesQuery as Mock).mockReturnValue(prune);
        (getZones as Mock).mockResolvedValue(zones);
    });

    const card = (name: string) => within(screen.getByRole('region', { name }));

    test('lists the locations with their minutes, default flag, equipment and zones', () => {
        render(<LocationsPage />);

        expect(screen.getByText('Training locations')).toBeInTheDocument();
        const gym = card('Gym centro');
        expect(gym.getByText('45 minutes available')).toBeInTheDocument();
        expect(gym.getByText('Default')).toBeInTheDocument();
        expect(gym.getAllByText('Barbell').length).toBeGreaterThan(0);
        expect(gym.getByText('Racks')).toBeInTheDocument();
        expect(gym.getByText('Benches')).toBeInTheDocument();

        const homeCard = card('Home');
        expect(homeCard.getByText('No zones yet.')).toBeInTheDocument();
        expect(homeCard.queryByText('Default')).not.toBeInTheDocument();
    });

    test('says so when there are no locations', () => {
        (useLocationsQuery as Mock).mockReturnValue({ isSuccess: true, isLoading: false, data: [] });

        render(<LocationsPage />);

        expect(screen.getByText('You have no training locations yet.')).toBeInTheDocument();
    });

    test('adds a location; the first one is the default', async () => {
        (useLocationsQuery as Mock).mockReturnValue({ isSuccess: true, isLoading: false, data: [] });
        render(<LocationsPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Add location' }));
        const dialog = within(screen.getByRole('dialog'));
        fireEvent.change(dialog.getByLabelText(/^Name/), { target: { value: ' Garage ' } });
        fireEvent.change(dialog.getByLabelText('Available minutes'), { target: { value: '50' } });
        expect(dialog.getByRole('switch', { name: 'Default location' })).toBeChecked();
        fireEvent.click(dialog.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(addLocation.mutateAsync).toHaveBeenCalledTimes(1));
        const saved = addLocation.mutateAsync.mock.calls[0][0] as TrainingLocation;
        expect(saved).toMatchObject({ id: null, name: 'Garage', isDefault: true, equipment: [], availableMinutes: 50 });
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    test('does not save without a name or with minutes that are no number', () => {
        render(<LocationsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Add location' }));
        const dialog = within(screen.getByRole('dialog'));

        expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();

        fireEvent.change(dialog.getByLabelText(/^Name/), { target: { value: 'Garage' } });
        expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled();

        fireEvent.change(dialog.getByLabelText('Available minutes'), { target: { value: '4x' } });
        expect(dialog.getByText('Enter a whole number of minutes, or leave it empty.')).toBeInTheDocument();
        expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();

        fireEvent.change(dialog.getByLabelText('Available minutes'), { target: { value: '' } });
        expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    test('removing equipment from a location takes it off its zones first', async () => {
        render(<LocationsPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit location Gym centro' }));
        const dialog = within(screen.getByRole('dialog'));
        // Remove the barbell chip
        const chip = dialog.getByText('Barbell').closest('.MuiChip-root') as HTMLElement;
        fireEvent.click(within(chip).getByTestId('CancelIcon'));
        fireEvent.click(dialog.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(editLocation.mutateAsync).toHaveBeenCalledTimes(1));
        expect(getZones).toHaveBeenCalledWith(3);
        expect(prune.mutateAsync).toHaveBeenCalledWith([{ id: 10, equipment: [] }]);
        expect(prune.mutateAsync.mock.invocationCallOrder[0])
            .toBeLessThan(editLocation.mutateAsync.mock.invocationCallOrder[0]);
        expect((editLocation.mutateAsync.mock.calls[0][0] as TrainingLocation).equipment).toEqual([2]);
    });

    test('shows an error when saving fails and keeps the form open', async () => {
        addLocation.mutateAsync.mockRejectedValue(new Error('no'));
        render(<LocationsPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Add location' }));
        fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Garage' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('The location could not be saved. Please try again.')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('deletes a location after confirming', () => {
        render(<LocationsPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Delete location Home' }));
        expect(screen.getByText('Delete the location Home and its zones?')).toBeInTheDocument();
        expect(deleteLocation.mutate).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(deleteLocation.mutate).toHaveBeenCalledWith(4);
    });

    describe('zones', () => {
        test('moves a zone up and down by writing the new orders', () => {
            render(<LocationsPage />);
            const gym = card('Gym centro');

            expect(gym.getByRole('button', { name: 'Move zone Racks up' })).toBeDisabled();
            expect(gym.getByRole('button', { name: 'Move zone Benches down' })).toBeDisabled();

            fireEvent.click(gym.getByRole('button', { name: 'Move zone Racks down' }));
            expect(updateOrder.mutate).toHaveBeenCalledWith([{ id: 11, order: 0 }, { id: 10, order: 1 }]);

            fireEvent.click(gym.getByRole('button', { name: 'Move zone Benches up' }));
            expect(updateOrder.mutate).toHaveBeenLastCalledWith([{ id: 11, order: 0 }, { id: 10, order: 1 }]);
        });

        test('adds a zone at the end, with equipment of the location only', () => {
            const addZone = mutation();
            addZone.mutate.mockImplementation((_zone: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.());
            (useAddZoneQuery as Mock).mockReturnValue(addZone);
            render(<LocationsPage />);

            fireEvent.click(card('Gym centro').getByRole('button', { name: 'Add zone' }));
            const dialog = within(screen.getByRole('dialog'));
            fireEvent.change(dialog.getByLabelText(/^Name/), { target: { value: 'Cardio' } });
            // Dumbbell is not in this location, so it is not offered
            fireEvent.mouseDown(dialog.getByLabelText('Equipment in this zone'));
            expect(screen.queryByRole('option', { name: 'Dumbbell' })).not.toBeInTheDocument();
            fireEvent.click(screen.getByRole('option', { name: 'Bench' }));
            fireEvent.click(dialog.getByRole('button', { name: 'Save' }));

            const zone = addZone.mutate.mock.calls[0][0] as LocationZone;
            expect(zone).toMatchObject({ id: null, locationId: 3, name: 'Cardio', order: 2, equipment: [2] });
        });

        test('deletes a zone after confirming', () => {
            render(<LocationsPage />);

            fireEvent.click(card('Gym centro').getByRole('button', { name: 'Delete zone Racks' }));
            fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

            expect(deleteZone.mutate).toHaveBeenCalledWith(10);
        });
    });
});
