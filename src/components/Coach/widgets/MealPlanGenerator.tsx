/* eslint-disable @eslint-react/no-array-index-key, camelcase */
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CoachErrorAlert } from "@/components/Coach/widgets/CoachErrorAlert";
import { MealProposal } from "@/components/Coach/models";
import { useApplyMealPlanMutation, useGenerateMealPlanMutation } from "@/components/Coach/queries";
import { makeLink, WgerLink } from "@/core/lib/url";

export const MealProposalPreview = ({ proposal }: { proposal: MealProposal }) => {
    const [t] = useTranslation();

    return <Stack spacing={2} data-testid="meal-proposal">
        <Typography variant="h5">{proposal.name}</Typography>
        <Typography>
            {t('coach.meal.totals', {
                kcal: proposal.totals.kcal,
                protein: proposal.totals.protein,
                carbs: proposal.totals.carbs,
                fat: proposal.totals.fat,
            })}
        </Typography>
        {proposal.meals.map((meal, i) => <Card key={i} variant="outlined">
            <CardContent>
                <Typography variant="h6">{meal.name}{meal.time ? ` (${meal.time})` : ''}</Typography>
                {meal.items.map((item, j) => <Typography key={j} variant="body2">
                    {item.name} - {item.amount_g} g
                </Typography>)}
            </CardContent>
        </Card>)}
    </Stack>;
};

export const MealPlanGenerator = () => {
    const [t, i18n] = useTranslation();
    const navigate = useNavigate();
    const generate = useGenerateMealPlanMutation();
    const apply = useApplyMealPlanMutation();

    const [kcal, setKcal] = useState('');
    const [meals, setMeals] = useState(3);
    const [preferences, setPreferences] = useState('');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        generate.mutate({
            meals_per_day: meals,
            ...(kcal !== '' ? { kcal_target: Number(kcal) } : {}),
            ...(preferences.trim() ? { preferences: preferences.trim() } : {}),
        });
    };

    const doApply = () => {
        if (!generate.data) {
            return;
        }
        apply.mutate(generate.data);
    };

    const skipped = apply.data?.skipped ?? [];

    return <Stack spacing={3}>
        <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        label={t('coach.meal.kcalTarget')} type="number" size="small" value={kcal}
                        onChange={e => setKcal(e.target.value)} />
                    <TextField
                        label={t('coach.meal.mealsPerDay')} type="number" size="small" value={meals}
                        slotProps={{ htmlInput: { min: 1, max: 8 } }}
                        onChange={e => setMeals(Number(e.target.value))} />
                </Stack>
                <TextField
                    label={t('coach.meal.preferences')} multiline minRows={2} size="small" value={preferences}
                    onChange={e => setPreferences(e.target.value)} />
                <Box>
                    <Button type="submit" variant="contained" disabled={generate.isPending}>
                        {generate.isPending ? t('coach.generating') : t('coach.generate')}
                    </Button>
                </Box>
            </Stack>
        </Box>

        <CoachErrorAlert error={generate.error} />

        {generate.data && <>
            <MealProposalPreview proposal={generate.data} />
            <CoachErrorAlert error={apply.error} />
            {apply.data && <Alert severity={skipped.length > 0 ? 'warning' : 'success'} data-testid="meal-applied">
                {t('coach.meal.applied')}
                {skipped.length > 0 && <> {t('coach.meal.skipped', { count: skipped.length })}</>}
                {' '}
                <Button size="small" onClick={() => navigate(makeLink(WgerLink.NUTRITION_DETAIL, i18n.language, { id: apply.data.nutrition_plan_id }))}>
                    {t('coach.meal.open')}
                </Button>
            </Alert>}
            {!apply.data && <Box>
                <Button variant="contained" color="success" onClick={doApply} disabled={apply.isPending}>
                    {t('coach.meal.apply')}
                </Button>
            </Box>}
        </>}
    </Stack>;
};
