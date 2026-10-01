import { Adapter } from "@/core/lib/Adapter";

/** A place where the user trains, with the equipment it has and optionally the time available there */
export class TrainingLocation {
    constructor(
        public id: number | null,
        public name: string,
        public isDefault: boolean,
        public equipment: number[],
        public availableMinutes: number | null,
    ) {
    }
}

export class TrainingLocationAdapter implements Adapter<TrainingLocation> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fromJson(item: any): TrainingLocation {
        return new TrainingLocation(
            item.id,
            item.name,
            item.is_default ?? false,
            item.equipment ?? [],
            item.available_minutes ?? null,
        );
    }

    toJson(item: TrainingLocation) {
        return {
            name: item.name,
            is_default: item.isDefault,
            equipment: item.equipment,
            available_minutes: item.availableMinutes,
        };
    }
}
