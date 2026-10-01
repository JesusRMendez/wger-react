import { LocationZone, LocationZoneAdapter } from "@/components/Locations/models/LocationZone";
import { TrainingLocation, TrainingLocationAdapter } from "@/components/Locations/models/TrainingLocation";
import { ZoneOrder, zoneOrderFromJson } from "@/components/Locations/models/ZoneOrder";
import { API_MAX_PAGE_SIZE } from "@/core/lib/consts";
import { fetchPaginated } from "@/core/lib/requests";
import { makeHeader, makeUrl } from "@/core/lib/url";
import axios from "axios";

export const API_TRAINING_LOCATION_PATH = 'training-location';
export const API_LOCATION_ZONE_PATH = 'location-zone';
export const API_ROUTINE_PATH = 'routine';

const locationAdapter = new TrainingLocationAdapter();
const zoneAdapter = new LocationZoneAdapter();

export const getLocations = async (): Promise<TrainingLocation[]> => {
    const url = makeUrl(API_TRAINING_LOCATION_PATH, { query: { limit: API_MAX_PAGE_SIZE } });
    const out: TrainingLocation[] = [];
    for await (const page of fetchPaginated(url, makeHeader())) {
        out.push(...page.map(item => locationAdapter.fromJson(item)));
    }
    return out;
};

export const addLocation = async (location: TrainingLocation): Promise<TrainingLocation> => {
    const response = await axios.post(
        makeUrl(API_TRAINING_LOCATION_PATH),
        locationAdapter.toJson(location),
        { headers: makeHeader() },
    );
    return locationAdapter.fromJson(response.data);
};

export const editLocation = async (location: TrainingLocation): Promise<TrainingLocation> => {
    const response = await axios.patch(
        makeUrl(API_TRAINING_LOCATION_PATH, { id: location.id! }),
        locationAdapter.toJson(location),
        { headers: makeHeader() },
    );
    return locationAdapter.fromJson(response.data);
};

export const deleteLocation = async (id: number): Promise<void> => {
    await axios.delete(makeUrl(API_TRAINING_LOCATION_PATH, { id: id }), { headers: makeHeader() });
};

/** The zones of one location, in their order */
export const getZones = async (locationId: number): Promise<LocationZone[]> => {
    const url = makeUrl(API_LOCATION_ZONE_PATH, {
        query: { location: locationId, ordering: 'order', limit: API_MAX_PAGE_SIZE }
    });
    const out: LocationZone[] = [];
    for await (const page of fetchPaginated(url, makeHeader())) {
        out.push(...page.map(item => zoneAdapter.fromJson(item)));
    }
    return out;
};

export const addZone = async (zone: LocationZone): Promise<LocationZone> => {
    const response = await axios.post(
        makeUrl(API_LOCATION_ZONE_PATH),
        zoneAdapter.toJson(zone),
        { headers: makeHeader() },
    );
    return zoneAdapter.fromJson(response.data);
};

export const editZone = async (zone: LocationZone): Promise<LocationZone> => {
    const response = await axios.patch(
        makeUrl(API_LOCATION_ZONE_PATH, { id: zone.id! }),
        zoneAdapter.toJson(zone),
        { headers: makeHeader() },
    );
    return zoneAdapter.fromJson(response.data);
};

/** Changes only the order of zones, which is what moving one up or down does */
export const updateZoneOrder = async (id: number, order: number): Promise<void> => {
    await axios.patch(makeUrl(API_LOCATION_ZONE_PATH, { id: id }), { order: order }, { headers: makeHeader() });
};

/** Changes only the equipment of a zone */
export const updateZoneEquipment = async (id: number, equipment: number[]): Promise<void> => {
    await axios.patch(makeUrl(API_LOCATION_ZONE_PATH, { id: id }), { equipment: equipment }, { headers: makeHeader() });
};

export const deleteZone = async (id: number): Promise<void> => {
    await axios.delete(makeUrl(API_LOCATION_ZONE_PATH, { id: id }), { headers: makeHeader() });
};

/**
 * The exercises of a day ordered by the zones of a location. Without a
 * location the server takes the user's default one.
 */
export const getZoneOrder = async (
    routineId: number,
    dayId: number,
    locationId?: number | null,
): Promise<ZoneOrder> => {
    const query: Record<string, number> = { day: dayId };
    if (locationId !== undefined && locationId !== null) {
        query.location = locationId;
    }
    const response = await axios.get(
        makeUrl(API_ROUTINE_PATH, { id: routineId, objectMethod: 'zone-order', query: query }),
        { headers: makeHeader() },
    );
    return zoneOrderFromJson(response.data);
};
