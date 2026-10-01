import { useEquipmentQuery } from "@/components/Exercises";
import { TrainingLocation } from "@/components/Locations/models/TrainingLocation";
import { EquipmentSelect } from "@/components/Locations/widgets/EquipmentSelect";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    Switch,
    TextField
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/** Adds or edits a training location */
export const LocationForm = (props: {
    location?: TrainingLocation,
    /** Whether the first location the user creates should be the default */
    makeDefault?: boolean,
    isSaving?: boolean,
    onSave: (location: TrainingLocation) => void,
    onClose: () => void,
}) => {
    const { t } = useTranslation();
    const equipmentQuery = useEquipmentQuery();
    const { location } = props;

    const [name, setName] = useState(location?.name ?? '');
    const [isDefault, setIsDefault] = useState(location?.isDefault ?? props.makeDefault ?? false);
    const [equipment, setEquipment] = useState<number[]>(location?.equipment ?? []);
    const [minutes, setMinutes] = useState(location?.availableMinutes?.toString() ?? '');

    const trimmedMinutes = minutes.trim();
    const parsedMinutes = trimmedMinutes === '' ? null : /^\d+$/.test(trimmedMinutes) ? parseInt(trimmedMinutes) : undefined;
    const minutesValid = parsedMinutes === null || (parsedMinutes !== undefined && parsedMinutes >= 1);
    const nameValid = name.trim() !== '';

    const submit = () => {
        if (!nameValid || !minutesValid) {
            return;
        }
        props.onSave(new TrainingLocation(
            location?.id ?? null,
            name.trim(),
            isDefault,
            equipment,
            parsedMinutes ?? null,
        ));
    };

    return <Dialog open onClose={props.onClose} fullWidth maxWidth="sm">
        <DialogTitle>{location ? t('locations.editLocation') : t('locations.addLocation')}</DialogTitle>
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
                <TextField
                    label={t('locations.availableMinutes')}
                    value={minutes}
                    onChange={event => setMinutes(event.target.value)}
                    error={!minutesValid}
                    helperText={minutesValid ? t('locations.availableMinutesHelp') : t('locations.minutesInvalid')}
                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                    fullWidth
                />
                <EquipmentSelect
                    label={t('exercises.equipment')}
                    options={equipmentQuery.data ?? []}
                    value={equipment}
                    onChange={setEquipment}
                />
                <FormControlLabel
                    control={<Switch checked={isDefault} onChange={event => setIsDefault(event.target.checked)} />}
                    label={t('locations.isDefault')}
                />
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={props.onClose}>{t('cancel')}</Button>
            <Button variant="contained" disabled={!nameValid || !minutesValid || props.isSaving} onClick={submit}>
                {t('save')}
            </Button>
        </DialogActions>
    </Dialog>;
};
