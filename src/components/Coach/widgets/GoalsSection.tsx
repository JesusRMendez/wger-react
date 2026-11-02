import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    IconButton,
    Stack,
    Tab,
    Tabs,
    Typography
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Goal, GOAL_PERIODS, GoalPeriod } from "@/components/Coach/models";
import { useDeleteGoalMutation, useGoalsQuery } from "@/components/Coach/queries";
import { Numeric, Ring } from "@/core/ui/Atlas";
import { atlas } from "@/theme";
import { GoalForm } from "@/components/Coach/widgets/GoalForm";

export const GoalsSection = () => {
    const [t] = useTranslation();
    const query = useGoalsQuery();
    const deleteMutation = useDeleteGoalMutation();
    const [period, setPeriod] = useState<GoalPeriod>('weekly');
    const [formGoal, setFormGoal] = useState<Goal | undefined>(undefined);
    const [formOpen, setFormOpen] = useState(false);

    const goals = (query.data ?? []).filter(g => g.period === period);

    return <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">{t('coach.goals.title')}</Typography>
            <Button variant="contained" onClick={() => {
                setFormGoal(undefined);
                setFormOpen(true);
            }}>{t('coach.goals.add')}</Button>
        </Stack>

        <Tabs value={period} onChange={(_, v) => setPeriod(v)} variant="scrollable">
            {GOAL_PERIODS.map(p => <Tab key={p} value={p} label={t(`coach.goals.periods.${p}`)} />)}
        </Tabs>

        {goals.length === 0 && !query.isLoading && <Typography color="text.secondary">{t('coach.goals.empty')}</Typography>}

        {goals.map(goal => <Card key={goal.id} data-testid={`goal-${goal.id}`}>
            <CardContent>
                <Stack direction="row" spacing={2.5} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Ring
                        progressbar
                        label={goal.title}
                        value={goal.progress_pct / 100}
                        size={84}
                        thickness={8}
                        color={goal.status === 'achieved' ? atlas.ok : goal.status === 'missed' ? atlas.accent : atlas.brand}
                    >
                        <Numeric size={18}>{goal.progress_pct}%</Numeric>
                    </Ring>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6">{goal.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('coach.goals.progressText', {
                                current: goal.current_value ?? '-',
                                target: goal.target_value,
                                unit: goal.unit,
                            })}
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip size="small" label={t(`coach.goals.statuses.${goal.status}`)}
                              color={goal.status === 'achieved' ? 'success' : goal.status === 'missed' ? 'error' : 'default'} />
                        <IconButton aria-label={t('edit')} onClick={() => {
                            setFormGoal(goal);
                            setFormOpen(true);
                        }}><EditIcon /></IconButton>
                        <IconButton aria-label={t('delete')} onClick={() => deleteMutation.mutate(goal.id)}>
                            <DeleteIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>)}

        {formOpen && <GoalForm
            key={formGoal?.id ?? 'new'}
            goal={formGoal}
            open={formOpen}
            defaultPeriod={period}
            onClose={() => setFormOpen(false)} />}
    </Stack>;
};
