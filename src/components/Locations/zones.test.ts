import { LocationZone } from "@/components/Locations/models/LocationZone";
import {
    canMoveZone,
    defaultLocation,
    moveZone,
    nextZoneOrder,
    pruneZoneEquipment,
    sortZones
} from "@/components/Locations/zones";

const zone = (id: number, order: number, equipment: number[] = []) => new LocationZone(id, 1, `Zone ${id}`, order, equipment);

describe('zones', () => {
    test('sorts by order, keeping the incoming order for equal ones', () => {
        const sorted = sortZones([zone(1, 2), zone(2, 0), zone(3, 0)]);

        expect(sorted.map(z => z.id)).toEqual([2, 3, 1]);
    });

    test('knows what can move', () => {
        const zones = [zone(1, 0), zone(2, 1), zone(3, 2)];

        expect(canMoveZone(zones, 1, 'up')).toBe(false);
        expect(canMoveZone(zones, 1, 'down')).toBe(true);
        expect(canMoveZone(zones, 3, 'down')).toBe(false);
        expect(canMoveZone(zones, 99, 'down')).toBe(false);
    });

    test('moving down swaps the orders of the two zones', () => {
        const updates = moveZone([zone(1, 0), zone(2, 1), zone(3, 2)], 1, 'down');

        expect(updates).toEqual([{ id: 2, order: 0 }, { id: 1, order: 1 }]);
    });

    test('moving up', () => {
        expect(moveZone([zone(1, 0), zone(2, 1), zone(3, 2)], 3, 'up')).toEqual([{ id: 3, order: 1 }, { id: 2, order: 2 }]);
    });

    test('moving renumbers gaps and duplicates', () => {
        const updates = moveZone([zone(1, 5), zone(2, 5), zone(3, 9)], 3, 'up');

        expect(updates).toEqual([{ id: 1, order: 0 }, { id: 3, order: 1 }, { id: 2, order: 2 }]);
    });

    test('nothing is written when a zone cannot move', () => {
        expect(moveZone([zone(1, 0)], 1, 'up')).toEqual([]);
        expect(moveZone([zone(1, 0)], 1, 'down')).toEqual([]);
    });

    test('a new zone goes last', () => {
        expect(nextZoneOrder([])).toBe(0);
        expect(nextZoneOrder([zone(1, 0), zone(2, 4)])).toBe(5);
    });

    test('takes the equipment a location lost off its zones', () => {
        const updates = pruneZoneEquipment([zone(1, 0, [1, 2, 3]), zone(2, 1, [2]), zone(3, 2, [])], [2, 3]);

        expect(updates).toEqual([{ id: 1, equipment: [2, 3] }]);
    });

    test('preselects the default location, otherwise the first', () => {
        expect(defaultLocation([{ isDefault: false, n: 1 }, { isDefault: true, n: 2 }])?.n).toBe(2);
        expect(defaultLocation([{ isDefault: false, n: 1 }, { isDefault: false, n: 2 }])?.n).toBe(1);
        expect(defaultLocation([])).toBeUndefined();
    });
});
