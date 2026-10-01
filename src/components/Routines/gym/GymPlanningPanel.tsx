import { Language } from "@/components/Exercises";
import { defaultLocation, useLocationsQuery, useZoneOrderQuery } from "@/components/Locations";
import {
    BUDGET_OPTIONS_MINUTES,
    effectiveBudgetMinutes,
    estimateSessionSeconds,
    estimateSetSeconds,
    matchZoneItems,
    missingEquipmentFor,
    movesToReach,
    secondsToMinutes,
    suggestedKeyOrder,
    suggestSetDrops,
    zoneNamesByKey,
} from "@/components/Routines/gym/gymZones";
import {
    doneSetsOf,
    exerciseName,
    findExercise,
    GymAction,
    GymState,
    orderedExercises,
} from "@/components/Routines/gym/gymSession";
import { makeLink, WgerLink } from "@/core/lib/url";
import {
    Alert,
    Button,
    Card,
    CardContent,
    CardHeader,
    FormControl,
    InputLabel,
    Link,
    MenuItem,
    Select,
    Stack,
    Typography
} from "@mui/material";
import React, { Dispatch, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/*
 * What to decide before training: where (the location orders the exercises by
 * zone and warns about missing equipment) and for how long (sets to drop when
 * the plan is longer than the time available). Everything it changes goes
 * through the reducer of the session.
 */
export const GymPlanningPanel = (props: {
    routineId: number,
    dayId: number,
    state: GymState,
    dispatch: Dispatch<GymAction>,
    language?: Language,
    onZonesChange: (zones: Record<string, string>) => void,
}) => {
    const { t, i18n } = useTranslation();
    const { state, dispatch } = props;

    const locationsQuery = useLocationsQuery();
    const locations = locationsQuery.data ?? [];
    const [pickedLocation, setPickedLocation] = useState<number | null>(null);
    const [chosenMinutes, setChosenMinutes] = useState<number | null>(null);

    // The default location is preselected until the user picks another
    const locationId = pickedLocation ?? defaultLocation(locations)?.id ?? null;
    const location = locations.find(l => l.id === locationId);

    const zoneQuery = useZoneOrderQuery(props.routineId, props.dayId, locationId, locationId !== null);
    const zoneOrder = zoneQuery.data;

    const matched = useMemo(
        () => zoneOrder === undefined ? new Map() : matchZoneItems(state.exercises, zoneOrder.items),
        [zoneOrder, state.exercises]
    );
    const zones = useMemo(() => zoneNamesByKey(matched), [matched]);

    const { onZonesChange } = props;
    useEffect(() => onZonesChange(zones), [zones, onZonesChange]);

    const pendingKeys = state.order.filter(key => {
        const exercise = findExercise(state, key);
        return exercise !== undefined && doneSetsOf(state, key) < exercise.nrOfSets;
    });
    const suggested = zoneOrder === undefined ? pendingKeys : suggestedKeyOrder(pendingKeys, matched, zoneOrder.items);
    const moves = movesToReach(pendingKeys, suggested);

    const missing = zoneOrder === undefined ? [] : missingEquipmentFor(state.exercises, zoneOrder.missingEquipment);

    // Time
    const budget = effectiveBudgetMinutes(location?.availableMinutes ?? null, chosenMinutes);
    const remainingSets = (key: string) => {
        const exercise = findExercise(state, key)!;
        return Math.max(0, exercise.nrOfSets - doneSetsOf(state, key));
    };
    const estimate = estimateSessionSeconds(state.exercises, exercise => remainingSets(exercise.key));
    const overBudget = budget !== null && estimate > budget * 60;
    const suggestion = overBudget
        ? suggestSetDrops(
            orderedExercises(state)
                .filter(exercise => remainingSets(exercise.key) > 0)
                .map(exercise => ({
                    key: exercise.key,
                    remainingSets: remainingSets(exercise.key),
                    setSeconds: estimateSetSeconds(exercise),
                })),
            budget * 60,
        )
        : undefined;
    const leavesOut = suggestion?.drops.some(drop => drop.sets >= remainingSets(drop.key)) ?? false;
    const droppedTotal = suggestion?.drops.reduce((sum, drop) => sum + drop.sets, 0) ?? 0;

    return <Card>
        <CardHeader title={t('routines.gym.planning.title')} />
        <CardContent>
            <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    {locations.length > 0 ? <FormControl fullWidth size="small">
                        <InputLabel id="gym-location-label">{t('routines.gym.planning.location')}</InputLabel>
                        <Select
                            labelId="gym-location-label"
                            label={t('routines.gym.planning.location')}
                            value={locationId ?? ''}
                            onChange={event => setPickedLocation(Number(event.target.value))}
                        >
                            {locations.map(l => <MenuItem key={l.id} value={l.id!}>{l.name}</MenuItem>)}
                        </Select>
                    </FormControl> : <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {t('routines.gym.planning.noLocations')}{' '}
                        <Link href={makeLink(WgerLink.TRAINING_LOCATIONS, i18n.language)}>
                            {t('locations.title')}
                        </Link>
                    </Typography>}

                    <FormControl fullWidth size="small">
                        <InputLabel id="gym-budget-label">{t('routines.gym.planning.budget')}</InputLabel>
                        <Select<number | ''>
                            labelId="gym-budget-label"
                            label={t('routines.gym.planning.budget')}
                            value={chosenMinutes ?? ''}
                            onChange={event => setChosenMinutes(event.target.value === '' ? null : Number(event.target.value))}
                        >
                            <MenuItem value="">{t('routines.gym.planning.noBudget')}</MenuItem>
                            {BUDGET_OPTIONS_MINUTES.map(minutes => <MenuItem key={minutes} value={minutes}>
                                {t('routines.gym.planning.minutes', { count: minutes })}
                            </MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>

                {zoneOrder !== undefined && <Stack spacing={1}>
                    <Typography variant="body2">
                        {t('routines.gym.planning.zoneChanges', {
                            planned: zoneOrder.zoneChangesPlanned,
                            suggested: zoneOrder.zoneChangesSuggested,
                        })}
                    </Typography>
                    <Button
                        variant="outlined"
                        disabled={moves.length === 0}
                        onClick={() => moves.forEach(move => dispatch({ type: 'move', ...move }))}
                    >
                        {t('routines.gym.planning.orderByZone')}
                    </Button>
                </Stack>}

                {missing.map(entry => <Alert severity="warning" key={entry.key}>
                    {t('routines.gym.planning.missingEquipment', {
                        name: exerciseName(findExercise(state, entry.key)!, props.language),
                        equipment: entry.equipment.join(', '),
                    })}
                </Alert>)}

                <Typography variant="body2" color="text.secondary">
                    {t('routines.gym.planning.estimate', { minutes: secondsToMinutes(estimate) })}
                </Typography>

                {suggestion !== undefined && <Alert
                    severity="info"
                    action={droppedTotal > 0 && <Button color="inherit" size="small"
                                                        onClick={() => dispatch({
                                                            type: 'dropSets',
                                                            drops: suggestion.drops
                                                        })}>
                        {t('routines.gym.planning.applyDrops')}
                    </Button>}
                >
                    <Stack spacing={0.5}>
                        <span>{t('routines.gym.planning.overBudget', {
                            estimate: secondsToMinutes(estimate),
                            budget: budget,
                        })}</span>
                        {suggestion.drops.map(drop => <span key={drop.key}>
                            {t('routines.gym.planning.dropSets', {
                                count: drop.sets,
                                name: exerciseName(findExercise(state, drop.key)!, props.language),
                            })}
                        </span>)}
                        {leavesOut && <span>{t('routines.gym.planning.leavesOutExercises')}</span>}
                    </Stack>
                </Alert>}
            </Stack>
        </CardContent>
    </Card>;
};
