import { useEquipmentQuery } from "@/components/Exercises";
import { TrainingLocation } from "@/components/Locations/models/TrainingLocation";
import {
    useAddLocationQuery,
    useDeleteLocationQuery,
    useEditLocationQuery,
    useLocationsQuery,
    usePruneZonesQuery
} from "@/components/Locations/queries";
import { getZones } from "@/components/Locations/api/locations";
import { LocationForm } from "@/components/Locations/widgets/LocationForm";
import { ZoneList } from "@/components/Locations/widgets/ZoneList";
import { pruneZoneEquipment } from "@/components/Locations/zones";
import { DeleteConfirmationModal } from "@/core/ui/Modals/DeleteConfirmationModal";
import { WgerContainerFullWidth } from "@/core/ui/Widgets/Container";
import { RenderLoadingQuery } from "@/core/ui/Widgets/RenderLoadingQuery";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import {
    Alert,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Chip,
    Divider,
    IconButton,
    Stack,
    Typography
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/*
 * Training locations: the places where the user trains, the equipment each one
 * has and the zones it is divided in. The gym mode uses them to order a day's
 * exercises so that there is the least walking between zones.
 */
export const LocationsPage = () => {
    const { t } = useTranslation();
    const locationsQuery = useLocationsQuery();
    const equipmentQuery = useEquipmentQuery();
    const addLocation = useAddLocationQuery();
    const editLocation = useEditLocationQuery();
    const deleteLocation = useDeleteLocationQuery();
    const pruneZones = usePruneZonesQuery();

    const [editing, setEditing] = useState<TrainingLocation | 'new' | null>(null);
    const [deleting, setDeleting] = useState<TrainingLocation | null>(null);
    const [saveFailed, setSaveFailed] = useState(false);

    const locations = locationsQuery.data ?? [];
    const equipment = equipmentQuery.data ?? [];

    const save = async (location: TrainingLocation) => {
        setSaveFailed(false);
        try {
            if (location.id === null) {
                await addLocation.mutateAsync(location);
            } else {
                // A zone can only hold equipment that the location has, so what was removed
                // from the location is taken off its zones first
                const zones = await getZones(location.id);
                const updates = pruneZoneEquipment(zones, location.equipment);
                if (updates.length > 0) {
                    await pruneZones.mutateAsync(updates);
                }
                await editLocation.mutateAsync(location);
            }
            setEditing(null);
        } catch {
            setSaveFailed(true);
        }
    };

    return <WgerContainerFullWidth
        maxWidth="md"
        title={t('locations.title')}
        fab={undefined}
        optionsMenu={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
            {t('locations.addLocation')}
        </Button>}
    >
        <RenderLoadingQuery
            query={locationsQuery}
            child={locationsQuery.isSuccess && <Stack spacing={2}>
                <Typography variant="body2">{t('locations.intro')}</Typography>

                {saveFailed && <Alert severity="error">{t('locations.saveFailed')}</Alert>}
                {locations.length === 0 && <Alert severity="info">{t('locations.empty')}</Alert>}

                {locations.map(location => <Card key={location.id} component="section"
                                                 aria-label={location.name}>
                    <CardHeader
                        title={location.name}
                        subheader={location.availableMinutes !== null
                            ? t('locations.minutesAvailable', { count: location.availableMinutes })
                            : undefined}
                        action={location.isDefault && <Chip size="small" color="primary"
                                                            label={t('locations.default')} />}
                    />
                    <CardContent>
                        <Stack spacing={2}>
                            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                {location.equipment.length === 0 && <Typography variant="body2"
                                                                                color="text.secondary">
                                    {t('locations.noEquipment')}
                                </Typography>}
                                {location.equipment.map(id => <Chip
                                    key={id}
                                    size="small"
                                    label={equipment.find(e => e.id === id)?.translatedName ?? String(id)}
                                />)}
                            </Stack>
                            <Divider />
                            <ZoneList
                                locationId={location.id!}
                                locationEquipment={equipment.filter(e => location.equipment.includes(e.id))}
                            />
                        </Stack>
                    </CardContent>
                    <CardActions>
                        <IconButton aria-label={t('locations.editLocationNamed', { name: location.name })}
                                    onClick={() => setEditing(location)}>
                            <EditIcon />
                        </IconButton>
                        <IconButton aria-label={t('locations.deleteLocationNamed', { name: location.name })}
                                    onClick={() => setDeleting(location)}>
                            <DeleteIcon />
                        </IconButton>
                    </CardActions>
                </Card>)}
            </Stack>}
        />

        {editing !== null && <LocationForm
            location={editing === 'new' ? undefined : editing}
            makeDefault={locations.length === 0}
            isSaving={addLocation.isPending || editLocation.isPending || pruneZones.isPending}
            onSave={save}
            onClose={() => setEditing(null)}
        />}

        <DeleteConfirmationModal
            title={t('deleteConfirmation')}
            message={deleting ? t('locations.deleteLocationConfirm', { name: deleting.name }) : ''}
            isOpen={deleting !== null}
            closeFn={() => setDeleting(null)}
            deleteFn={() => deleting && deleteLocation.mutate(deleting.id!)}
        />
    </WgerContainerFullWidth>;
};
