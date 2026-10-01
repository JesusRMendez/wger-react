/* eslint-disable @eslint-react/no-array-index-key, camelcase */
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
    RepetitionUnit,
    useFetchRoutineRepUnitsQuery,
    useFetchRoutineWeighUnitsQuery,
    WeightUnit
} from "@/components/Routines";
import { CoachErrorAlert } from "@/components/Coach/widgets/CoachErrorAlert";
import { ProposalExercise, WorkoutProposal } from "@/components/Coach/models";
import {
    useApplyWorkoutPlanMutation,
    useGenerateWorkoutPlanMutation,
    useGoalsQuery,
    useTrainingLocationsQuery
} from "@/components/Coach/queries";
import { makeLink, WgerLink } from "@/core/lib/url";

/*
 * Formats "4 × 8 repetitions @ 60 kg" with the units of the proposal
 */
export function formatSetsReps(
    e: ProposalExercise,
    repUnits: RepetitionUnit[] = [],
    weightUnits: WeightUnit[] = [],
): string {
    const repUnit = repUnits.find(u => u.id === e.repetition_unit_id)?.name;
    const weightUnit = weightUnits.find(u => u.id === e.weight_unit_id)?.name;
    let out = `${e.sets} × ${e.reps}`;
    if (repUnit) {
        out += ` ${repUnit}`;
    }
    if (e.weight != null) {
        out += ` @ ${e.weight}${weightUnit ? ` ${weightUnit}` : ''}`;
    }
    return out;
}

export const WorkoutProposalPreview = ({ proposal }: { proposal: WorkoutProposal }) => {
    const [t] = useTranslation();
    const repUnits = useFetchRoutineRepUnitsQuery();
    const weightUnits = useFetchRoutineWeighUnitsQuery();

    return <Stack spacing={2} data-testid="workout-proposal">
        <Typography variant="h5">{proposal.name}</Typography>
        {proposal.description && <Typography>{proposal.description}</Typography>}
        <Typography variant="body2" color="text.secondary">
            {t('coach.workout.weeks', { count: proposal.weeks })}
        </Typography>
        {proposal.order_rationale && <Alert severity="info" icon={false}>
            <strong>{t('coach.workout.orderRationale')}:</strong> {proposal.order_rationale}
        </Alert>}
        {proposal.days.map((day, i) => <Card key={i} variant="outlined">
            <CardContent>
                <Typography variant="h6">{day.name}</Typography>
                {day.exercises.map((e, j) => <Box key={j} sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontWeight: "bold" }}>{e.name}</Typography>
                    <Typography variant="body2">
                        {formatSetsReps(e, repUnits.data, weightUnits.data)}
                        {e.rest_seconds != null && ` · ${t('coach.workout.rest', { seconds: e.rest_seconds })}`}
                        {e.zone && ` · ${t('coach.workout.zone', { zone: e.zone })}`}
                    </Typography>
                    {e.why && <Typography variant="caption" color="text.secondary">{e.why}</Typography>}
                </Box>)}
            </CardContent>
        </Card>)}
    </Stack>;
};

export const WorkoutPlanGenerator = () => {
    const [t, i18n] = useTranslation();
    const navigate = useNavigate();
    const generate = useGenerateWorkoutPlanMutation();
    const apply = useApplyWorkoutPlanMutation();
    const locations = useTrainingLocationsQuery();
    const goals = useGoalsQuery();

    const [days, setDays] = useState(3);
    const [minutes, setMinutes] = useState(60);
    const [locationId, setLocationId] = useState<number | ''>('');
    const [goalId, setGoalId] = useState<number | ''>('');
    const [notes, setNotes] = useState('');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        generate.mutate({
            days_per_week: days,
            minutes_per_session: minutes,
            ...(locationId !== '' ? { location_id: locationId } : {}),
            ...(goalId !== '' ? { goal_id: goalId } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
    };

    const doApply = () => {
        if (!generate.data) {
            return;
        }
        apply.mutate(generate.data, {
            onSuccess: (r) => navigate(makeLink(WgerLink.ROUTINE_DETAIL, i18n.language, { id: r.routine_id })),
        });
    };

    return <Stack spacing={3}>
        <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        label={t('coach.workout.daysPerWeek')} type="number" size="small" value={days}
                        slotProps={{ htmlInput: { min: 1, max: 7 } }}
                        onChange={e => setDays(Number(e.target.value))} />
                    <TextField
                        label={t('coach.workout.minutes')} type="number" size="small" value={minutes}
                        slotProps={{ htmlInput: { min: 10, max: 240 } }}
                        onChange={e => setMinutes(Number(e.target.value))} />
                </Stack>
                <TextField
                    select size="small" label={t('coach.workout.location')} value={locationId}
                    onChange={e => setLocationId(e.target.value === '' ? '' : Number(e.target.value))}>
                    <MenuItem value="">{t('coach.workout.defaultLocation')}</MenuItem>
                    {(locations.data ?? []).map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                </TextField>
                <TextField
                    select size="small" label={t('coach.workout.goal')} value={goalId}
                    onChange={e => setGoalId(e.target.value === '' ? '' : Number(e.target.value))}>
                    <MenuItem value="">{t('coach.workout.noGoal')}</MenuItem>
                    {(goals.data ?? []).map(g => <MenuItem key={g.id} value={g.id}>{g.title}</MenuItem>)}
                </TextField>
                <TextField
                    label={t('coach.notes')} multiline minRows={2} size="small" value={notes}
                    onChange={e => setNotes(e.target.value)} />
                <Box>
                    <Button type="submit" variant="contained" disabled={generate.isPending}>
                        {generate.isPending ? t('coach.generating') : t('coach.generate')}
                    </Button>
                </Box>
            </Stack>
        </Box>

        <CoachErrorAlert error={generate.error} />

        {generate.data && <>
            <WorkoutProposalPreview proposal={generate.data} />
            <CoachErrorAlert error={apply.error} />
            <Box>
                <Button variant="contained" color="success" onClick={doApply} disabled={apply.isPending}>
                    {t('coach.workout.apply')}
                </Button>
            </Box>
        </>}
    </Stack>;
};
