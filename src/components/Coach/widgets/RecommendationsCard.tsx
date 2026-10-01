import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { useRecommendationsQuery } from "@/components/Coach/queries";

export const PHASES = ['adaptation', 'progression', 'deload', 'consolidation'] as const;

export const RecommendationsCard = () => {
    const [t] = useTranslation();
    const query = useRecommendationsQuery();
    const data = query.data;

    if (!data) {
        return null;
    }

    return <Card variant="outlined" data-testid="recommendations">
        <CardContent>
            <Stack spacing={2}>
                <Typography variant="h5">{t('coach.recommendations.title')}</Typography>
                <Typography>
                    {t('coach.recommendations.currentPhase', { week: data.week, phase: data.phase.name })}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }} data-testid="phase-timeline">
                    {PHASES.map(p => <Chip
                        key={p}
                        label={t(`coach.recommendations.phases.${p}`)}
                        color={p === data.phase.key ? 'primary' : 'default'}
                        variant={p === data.phase.key ? 'filled' : 'outlined'}
                        aria-current={p === data.phase.key ? 'step' : undefined} />)}
                </Stack>
                <Box>
                    {data.recommendations.map(r => <Alert key={r.key} severity={r.severity} sx={{ mb: 1 }}>
                        <strong>{r.title}</strong> {r.detail}
                    </Alert>)}
                </Box>
            </Stack>
        </CardContent>
    </Card>;
};
