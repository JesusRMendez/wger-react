import { Adapter } from "@/core/lib/Adapter";

/** A part of a training location (racks, machines, free weights...) with the equipment found there */
export class LocationZone {
    constructor(
        public id: number | null,
        public locationId: number,
        public name: string,
        public order: number,
        public equipment: number[],
    ) {
    }
}

export class LocationZoneAdapter implements Adapter<LocationZone> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fromJson(item: any): LocationZone {
        return new LocationZone(
            item.id,
            item.location,
            item.name,
            item.order ?? 0,
            item.equipment ?? [],
        );
    }

    toJson(item: LocationZone) {
        return {
            location: item.locationId,
            name: item.name,
            order: item.order,
            equipment: item.equipment,
        };
    }
}
