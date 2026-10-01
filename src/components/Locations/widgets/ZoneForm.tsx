import { Equipment } from "@/components/Exercises";
import { LocationZone } from "@/components/Locations/models/LocationZone";
import { EquipmentSelect } from "@/components/Locations/widgets/EquipmentSelect";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/** Adds or edits a zone. Only the equipment of the location can be picked. */
export const ZoneForm = (props: {
    zone?: LocationZone,
    locationId: number,
    /** The order of a new zone */
    order: number,
    locationEquipment: Equipment[],
    isSaving?: boolean,
    onSave: (zone: LocationZone) => void,
    onClose: () => void,
}) => {
    const { t } = useTranslation();
    const { zone } = props;
    const [name, setName] = useState(zone?.name ?? '');
    const [equipment, setEquipment] = useState<number[]>(zone?.equipment ?? []);
    const nameValid = name.trim() !== '';

    return <Dialog open onClose={props.onClose} fullWidth maxWidth="sm">
        <DialogTitle>{zone ? t('locations.editZone') : t('locations.addZone')}</DialogTitle>
        <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField
                    label={t('name')}
                    value={name}
                    onChange={event => setName(event.target.value)}
                    error={!nameValid}
                    helperText={!nameValid ? t('forms.fieldRequired') : undefined}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    required
                    fullWidth
                />
                <EquipmentSelect
                    label={t('locations.zoneEquipment')}
                    options={props.locationEquipment}
                    value={equipment}
                    onChange={setEquipment}
                />
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={props.onClose}>{t('cancel')}</Button>
            <Button
                variant="contained"
                disabled={!nameValid || props.isSaving}
                onClick={() => props.onSave(new LocationZone(
                    zone?.id ?? null,
                    props.locationId,
                    name.trim(),
                    zone?.order ?? props.order,
                    equipment,
                ))}
            >
                {t('save')}
            </Button>
        </DialogActions>
    </Dialog>;
};
