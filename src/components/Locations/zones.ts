/*
 * Pure helpers for the zones of a training location
 */
import { LocationZone } from "@/components/Locations/models/LocationZone";

export interface OrderUpdate {
    id: number,
    order: number,
}

/** The zones in the order the user sees them. Equal orders keep the order they came in. */
export const sortZones = (zones: LocationZone[]): LocationZone[] =>
    zones
        .map((zone, index) => ({ zone, index }))
        .sort((a, b) => a.zone.order - b.zone.order || a.index - b.index)
        .map(({ zone }) => zone);

export const canMoveZone = (zones: LocationZone[], id: number, direction: 'up' | 'down'): boolean => {
    const sorted = sortZones(zones);
    const index = sorted.findIndex(zone => zone.id === id);
    return direction === 'up' ? index > 0 : index !== -1 && index < sorted.length - 1;
};

/**
 * The orders to write so that a zone moves one place up or down. The zones are
 * numbered 0, 1, 2... again, which also repairs gaps and duplicates, and only
 * those whose number changes are returned.
 */
export function moveZone(zones: LocationZone[], id: number, direction: 'up' | 'down'): OrderUpdate[] {
    if (!canMoveZone(zones, id, direction)) {
        return [];
    }

    const sorted = sortZones(zones);
    const index = sorted.findIndex(zone => zone.id === id);
    const other = direction === 'up' ? index - 1 : index + 1;
    [sorted[index], sorted[other]] = [sorted[other], sorted[index]];

    const updates: OrderUpdate[] = [];
    sorted.forEach((zone, position) => {
        if (zone.order !== position) {
            updates.push({ id: zone.id!, order: position });
        }
    });
    return updates;
}

/** The order for a zone that is added at the end */
export const nextZoneOrder = (zones: LocationZone[]): number =>
    zones.length === 0 ? 0 : Math.max(...zones.map(zone => zone.order)) + 1;

export interface EquipmentUpdate {
    id: number,
    equipment: number[],
}

/**
 * The zones that hold equipment which the location does not have (anymore),
 * with the equipment they keep. A zone's equipment must be a subset of its location's.
 */
export function pruneZoneEquipment(zones: LocationZone[], locationEquipment: number[]): EquipmentUpdate[] {
    const allowed = new Set(locationEquipment);
    const updates: EquipmentUpdate[] = [];
    for (const zone of zones) {
        const kept = zone.equipment.filter(id => allowed.has(id));
        if (kept.length !== zone.equipment.length) {
            updates.push({ id: zone.id!, equipment: kept });
        }
    }
    return updates;
}

/** The location that is preselected: the default one, otherwise the first */
export function defaultLocation<T extends { isDefault: boolean }>(locations: T[]): T | undefined {
    return locations.find(location => location.isDefault) ?? locations[0];
}
