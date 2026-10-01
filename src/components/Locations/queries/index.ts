import {
    addLocation,
    addZone,
    deleteLocation,
    deleteZone,
    editLocation,
    editZone,
    getLocations,
    getZoneOrder,
    getZones,
    updateZoneEquipment,
    updateZoneOrder,
} from "@/components/Locations/api/locations";
import { LocationZone } from "@/components/Locations/models/LocationZone";
import { TrainingLocation } from "@/components/Locations/models/TrainingLocation";
import { OrderUpdate } from "@/components/Locations/zones";
import { QueryKey } from "@/core/lib/consts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useLocationsQuery = () => useQuery({
    queryKey: [QueryKey.TRAINING_LOCATIONS],
    queryFn: getLocations,
});

export const useAddLocationQuery = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (location: TrainingLocation) => addLocation(location),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.TRAINING_LOCATIONS] }),
    });
};

export const useEditLocationQuery = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (location: TrainingLocation) => editLocation(location),
        // Making a location the default changes the others too, and its zones may have been pruned
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QueryKey.TRAINING_LOCATIONS] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.LOCATION_ZONES] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.ZONE_ORDER] });
        },
    });
};

export const useDeleteLocationQuery = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteLocation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QueryKey.TRAINING_LOCATIONS] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.LOCATION_ZONES] });
        },
    });
};

export const useZonesQuery = (locationId: number) => useQuery({
    queryKey: [QueryKey.LOCATION_ZONES, locationId],
    queryFn: () => getZones(locationId),
});

const useZoneInvalidation = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.LOCATION_ZONES] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.ZONE_ORDER] });
    };
};

export const useAddZoneQuery = () => {
    const invalidate = useZoneInvalidation();
    return useMutation({ mutationFn: (zone: LocationZone) => addZone(zone), onSuccess: invalidate });
};

export const useEditZoneQuery = () => {
    const invalidate = useZoneInvalidation();
    return useMutation({ mutationFn: (zone: LocationZone) => editZone(zone), onSuccess: invalidate });
};

export const useDeleteZoneQuery = () => {
    const invalidate = useZoneInvalidation();
    return useMutation({ mutationFn: (id: number) => deleteZone(id), onSuccess: invalidate });
};

/** Writes the new orders of the zones that moved, one after the other so the server never sees a half state it rejects */
export const useUpdateZoneOrderQuery = () => {
    const invalidate = useZoneInvalidation();
    return useMutation({
        mutationFn: async (updates: OrderUpdate[]) => {
            for (const update of updates) {
                await updateZoneOrder(update.id, update.order);
            }
        },
        onSuccess: invalidate,
    });
};

/** Drops the equipment a location no longer has from its zones */
export const usePruneZonesQuery = () => {
    const invalidate = useZoneInvalidation();
    return useMutation({
        mutationFn: async (updates: { id: number, equipment: number[] }[]) => {
            for (const update of updates) {
                await updateZoneEquipment(update.id, update.equipment);
            }
        },
        onSuccess: invalidate,
    });
};

/**
 * The exercises of a day in the order that suits a location. The server may not
 * have a location or zones for the user, which is an error that the caller
 * treats as "no suggestion".
 */
export const useZoneOrderQuery = (routineId: number, dayId: number, locationId: number | null, enabled = true) => useQuery({
    queryKey: [QueryKey.ZONE_ORDER, routineId, dayId, locationId],
    queryFn: () => getZoneOrder(routineId, dayId, locationId),
    enabled: enabled,
    retry: false,
});
