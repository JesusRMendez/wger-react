/* eslint-disable camelcase */
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Goal,
    GOAL_KINDS,
    GOAL_PERIODS,
    GOAL_STATUSES,
    GoalInput,
    GoalKind,
    GoalPeriod,
    GoalStatus
} from "@/components/Coach/models";
import { useAddGoalMutation, useEditGoalMutation } from "@/components/Coach/queries";

// Default indicator per goal kind
const KIND_INDICATOR: Record<GoalKind, string> = {
    strength: 'est_1rm',
    body_weight: 'body_weight_avg7',
    body_fat: 'body_fat',
    habit: 'sessions_per_week',
    nutrition: 'kcal_adherence',
    endurance: 'weekly_volume_sets',
    steps: 'steps',
};

const today = () => new Date().toISOString().slice(0, 10);

export const GoalForm = ({ goal, open, onClose, defaultPeriod = 'monthly' }: {
    goal?: Goal,
    open: boolean,
    onClose: () => void,
    defaultPeriod?: GoalPeriod,
}) => {
    const [t] = useTranslation();
    const add = useAddGoalMutation();
    const edit = useEditGoalMutation();

    const [title, setTitle] = useState(goal?.title ?? '');
    const [kind, setKind] = useState<GoalKind>(goal?.kind ?? 'strength');
    const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? defaultPeriod);
    const [target, setTarget] = useState(goal?.target_value ?? '');
    const [unit, setUnit] = useState(goal?.unit ?? 'kg');
    const [start, setStart] = useState(goal?.start_date ?? today());
    const [end, setEnd] = useState(goal?.end_date ?? '');
    const [status, setStatus] = useState<GoalStatus>(goal?.status ?? 'active');

    const valid = title.trim() !== '' && target !== '' && !isNaN(Number(target)) && end !== '';

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!valid) {
            return;
        }
        const data: GoalInput = {
            title: title.trim(),
            kind,
            period,
            indicator: goal && goal.kind === kind ? goal.indicator : KIND_INDICATOR[kind],
            target_value: target,
            unit,
            start_date: start,
            end_date: end,
            status,
        };
        const options = { onSuccess: onClose };
        if (goal) {
            edit.mutate({ id: goal.id, goal: data }, options);
        } else {
            add.mutate(data, options);
        }
    };

    return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <form onSubmit={submit}>
            <DialogTitle>{goal ? t('coach.goals.edit') : t('coach.goals.add')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label={t('coach.goals.name')} value={title} size="small"
                               onChange={e => setTitle(e.target.value)} required />
                    <TextField select label={t('coach.goals.kind')} value={kind} size="small"
                               onChange={e => setKind(e.target.value as GoalKind)}>
                        {GOAL_KINDS.map(k => <MenuItem key={k} value={k}>{t(`coach.goals.kinds.${k}`)}</MenuItem>)}
                    </TextField>
                    <TextField select label={t('coach.goals.period')} value={period} size="small"
                               onChange={e => setPeriod(e.target.value as GoalPeriod)}>
                        {GOAL_PERIODS.map(p => <MenuItem key={p} value={p}>{t(`coach.goals.periods.${p}`)}</MenuItem>)}
                    </TextField>
                    <Stack direction="row" spacing={2}>
                        <TextField label={t('coach.goals.target')} value={target} size="small" type="number"
                                   onChange={e => setTarget(e.target.value)} required />
                        <TextField label={t('coach.goals.unit')} value={unit} size="small"
                                   onChange={e => setUnit(e.target.value)} />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TextField label={t('coach.goals.start')} type="date" value={start} size="small"
                                   slotProps={{ inputLabel: { shrink: true } }}
                                   onChange={e => setStart(e.target.value)} />
                        <TextField label={t('coach.goals.end')} type="date" value={end} size="small" required
                                   slotProps={{ inputLabel: { shrink: true } }}
                                   onChange={e => setEnd(e.target.value)} />
                    </Stack>
                    {goal && <TextField select label={t('coach.goals.status')} value={status} size="small"
                                        onChange={e => setStatus(e.target.value as GoalStatus)}>
                        {GOAL_STATUSES.map(s => <MenuItem key={s} value={s}>{t(`coach.goals.statuses.${s}`)}</MenuItem>)}
                    </TextField>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('cancel')}</Button>
                <Button type="submit" variant="contained" disabled={!valid}>{t('save')}</Button>
            </DialogActions>
        </form>
    </Dialog>;
};
