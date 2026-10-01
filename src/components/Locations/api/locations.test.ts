import {
    addLocation,
    addZone,
    deleteLocation,
    deleteZone,
    editLocation,
    getLocations,
    getZoneOrder,
    getZones,
    updateZoneEquipment,
    updateZoneOrder,
} from "@/components/Locations/api/locations";
import { LocationZone } from "@/components/Locations/models/LocationZone";
import { TrainingLocation } from "@/components/Locations/models/TrainingLocation";
import axios from "axios";
import type { Mock } from "vitest";

vi.mock("axios");

describe('training location api', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('reads all pages of the locations', async () => {
        (axios.get as Mock)
            .mockResolvedValueOnce({
                data: {
                    count: 2, next: 'https://example.com/page2', previous: null,
                    results: [{ id: 1, name: 'A', is_default: true, equipment: [1], available_minutes: 30 }]
                }
            })
            .mockResolvedValueOnce({
                data: { count: 2, next: null, previous: null, results: [{ id: 2, name: 'B', is_default: false, equipment: [] }] }
            });

        const result = await getLocations();

        expect((axios.get as Mock).mock.calls[0][0]).toMatch(/\/api\/v2\/training-location\/\?limit=/);
        expect(result.map(l => l.name)).toEqual(['A', 'B']);
        expect(result[0].availableMinutes).toBe(30);
    });

    test('creates a location', async () => {
        (axios.post as Mock).mockResolvedValue({ data: { id: 9, name: 'New', is_default: false, equipment: [2], available_minutes: null } });

        const result = await addLocation(new TrainingLocation(null, 'New', false, [2], null));

        expect((axios.post as Mock).mock.calls[0][0]).toBe('https://example.com/api/v2/training-location/');
        expect((axios.post as Mock).mock.calls[0][1]).toEqual({
            name: 'New', is_default: false, equipment: [2], available_minutes: null
        });
        expect(result.id).toBe(9);
    });

    test('edits and deletes a location', async () => {
        (axios.patch as Mock).mockResolvedValue({ data: { id: 4, name: 'X', is_default: true, equipment: [] } });

        await editLocation(new TrainingLocation(4, 'X', true, [], 60));
        await deleteLocation(4);

        expect((axios.patch as Mock).mock.calls[0][0]).toBe('https://example.com/api/v2/training-location/4/');
        expect((axios.patch as Mock).mock.calls[0][1]).toMatchObject({ available_minutes: 60 });
        expect((axios.delete as Mock).mock.calls[0][0]).toBe('https://example.com/api/v2/training-location/4/');
    });

    test('reads the zones of one location in order', async () => {
        (axios.get as Mock).mockResolvedValue({
            data: { count: 1, next: null, previous: null, results: [{ id: 1, location: 3, name: 'Racks', order: 0, equipment: [8] }] }
        });

        const zones = await getZones(3);

        const url = (axios.get as Mock).mock.calls[0][0] as string;
        expect(url).toContain('location=3');
        expect(url).toContain('ordering=order');
        expect(zones[0]).toMatchObject({ name: 'Racks', locationId: 3, equipment: [8] });
    });

    test('creates a zone and changes only what is asked', async () => {
        (axios.post as Mock).mockResolvedValue({ data: { id: 7, location: 3, name: 'Z', order: 1, equipment: [] } });

        await addZone(new LocationZone(null, 3, 'Z', 1, []));
        await updateZoneOrder(7, 4);
        await updateZoneEquipment(7, [1, 2]);
        await deleteZone(7);

        expect((axios.post as Mock).mock.calls[0][1]).toEqual({ location: 3, name: 'Z', order: 1, equipment: [] });
        expect((axios.patch as Mock).mock.calls[0][1]).toEqual({ order: 4 });
        expect((axios.patch as Mock).mock.calls[1][1]).toEqual({ equipment: [1, 2] });
        expect((axios.delete as Mock).mock.calls[0][0]).toBe('https://example.com/api/v2/location-zone/7/');
    });

    test('asks for the zone order of a day, with and without a location', async () => {
        (axios.get as Mock).mockResolvedValue({ data: { location: 3, location_name: 'G', items: [] } });

        await getZoneOrder(7, 12, 3);
        await getZoneOrder(7, 12);
        await getZoneOrder(7, 12, null);

        const calls = (axios.get as Mock).mock.calls.map(call => call[0]);
        expect(calls[0]).toBe('https://example.com/api/v2/routine/7/zone-order/?day=12&location=3');
        expect(calls[1]).toBe('https://example.com/api/v2/routine/7/zone-order/?day=12');
        expect(calls[2]).toBe('https://example.com/api/v2/routine/7/zone-order/?day=12');
    });
});
