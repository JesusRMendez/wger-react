import { Equipment } from "@/components/Exercises";
import { LocationZone } from "@/components/Locations/models/LocationZone";
import {
    useAddZoneQuery,
    useDeleteZoneQuery,
    useEditZoneQuery,
    useUpdateZoneOrderQuery,
    useZonesQuery
} from "@/components/Locations/queries";
import { ZoneForm } from "@/components/Locations/widgets/ZoneForm";
import { canMoveZone, moveZone, nextZoneOrder, sortZones } from "@/components/Locations/zones";
import { DeleteConfirmationModal } from "@/core/ui/Modals/DeleteConfirmationModal";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import { Alert, Button, Chip, IconButton, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/** The zones of one location: add, edit, delete and move up and down */
export const ZoneList = (props: { locationId: number, locationEquipment: Equipment[] }) => {
    const { t } = useTranslation();
    const zonesQuery = useZonesQuery(props.locationId);
    const addZone = useAddZoneQuery();
    const editZone = useEditZoneQuery();
    const deleteZone = useDeleteZoneQuery();
    const updateOrder = useUpdateZoneOrderQuery();

    const [editing, setEditing] = useState<LocationZone | 'new' | null>(null);
    const [deleting, setDeleting] = useState<LocationZone | null>(null);

    const zones = sortZones(zonesQuery.data ?? []);
    const nameOf = (id: number) => props.locationEquipment.find(e => e.id === id)?.translatedName ?? String(id);

    const save = (zone: LocationZone) => {
        const mutation = zone.id === null ? addZone : editZone;
        mutation.mutate(zone, { onSuccess: () => setEditing(null) });
    };

    return <Stack spacing={1}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" component="h3">{t('locations.zones')}</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
                {t('locations.addZone')}
            </Button>
        </Stack>

        {zonesQuery.isError && <Alert severity="error">{t('locations.loadFailed')}</Alert>}
        {zonesQuery.isSuccess && zones.length === 0 && <Typography variant="body2" color="text.secondary">
            {t('locations.noZones')}
        </Typography>}

        <List dense disablePadding aria-label={t('locations.zones')}>
            {zones.map(zone => <ListItem
                key={zone.id}
                disableGutters
                secondaryAction={<Stack direction="row">
                    <IconButton
                        size="small"
                        aria-label={t('locations.moveZoneUp', { name: zone.name })}
                        disabled={!canMoveZone(zones, zone.id!, 'up') || updateOrder.isPending}
                        onClick={() => updateOrder.mutate(moveZone(zones, zone.id!, 'up'))}
                    >
                        <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        aria-label={t('locations.moveZoneDown', { name: zone.name })}
                        disabled={!canMoveZone(zones, zone.id!, 'down') || updateOrder.isPending}
                        onClick={() => updateOrder.mutate(moveZone(zones, zone.id!, 'down'))}
                    >
                        <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        aria-label={t('locations.editZoneNamed', { name: zone.name })}
                        onClick={() => setEditing(zone)}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        aria-label={t('locations.deleteZoneNamed', { name: zone.name })}
                        onClick={() => setDeleting(zone)}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Stack>}
                // Room for the four buttons
                sx={{ pr: 18 }}
            >
                <ListItemText
                    primary={zone.name}
                    secondary={<Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }} component="span">
                        {zone.equipment.map(id => <Chip key={id} size="small" label={nameOf(id)} />)}
                    </Stack>}
                    slotProps={{ secondary: { component: 'div' } }}
                />
            </ListItem>)}
        </List>

        {editing !== null && <ZoneForm
            zone={editing === 'new' ? undefined : editing}
            locationId={props.locationId}
            order={nextZoneOrder(zones)}
            locationEquipment={props.locationEquipment}
            isSaving={addZone.isPending || editZone.isPending}
            onSave={save}
            onClose={() => setEditing(null)}
        />}

        <DeleteConfirmationModal
            title={t('deleteConfirmation')}
            message={deleting ? t('locations.deleteZoneConfirm', { name: deleting.name }) : ''}
            isOpen={deleting !== null}
            closeFn={() => setDeleting(null)}
            deleteFn={() => deleting && deleteZone.mutate(deleting.id!)}
        />
    </Stack>;
};
