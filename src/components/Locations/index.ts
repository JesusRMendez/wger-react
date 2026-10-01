/**
 * Public surface of the training locations domain (Django app: manager).
 *
 * Other code may only import from `@/components/Locations`, never from
 * internal sub-paths.
 */
export { LocationsPage } from "./screens/LocationsPage";

export { LocationZone, LocationZoneAdapter } from "./models/LocationZone";
export { TrainingLocation, TrainingLocationAdapter } from "./models/TrainingLocation";
export type { MissingEquipment, ZoneOrder, ZoneOrderItem } from "./models/ZoneOrder";
export { defaultLocation } from "./zones";

export { useLocationsQuery, useZoneOrderQuery } from "./queries";
