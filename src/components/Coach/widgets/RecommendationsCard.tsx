import CheckIcon from "@mui/icons-material/Check";
import { Alert, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { atlas, motion } from "@/theme";
import { useRecommendationsQuery } from "@/components/Coach/queries";

export const PHASES = ['adaptation', 'progression', 'deload', 'consolidation'] as const;

export const RecommendationsCard = () => {
    const [t] = useTranslation();
    const query = useRecommendationsQuery();
    const data = query.data;

    if (!data) {
        return null;
    }

    return <Card data-testid="recommendations">
        <CardContent>
            <Stack spacing={2}>
                <Typography variant="h5">{t('coach.recommendations.title')}</Typography>
                <Typography>
                    {t('coach.recommendations.currentPhase', { week: data.week, phase: data.phase.name })}
                </Typography>
                <Box
                    data-testid="phase-timeline"
                    sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}
                >
                    {PHASES.map((p, i) => {
                        const current = PHASES.indexOf(data.phase.key as typeof PHASES[number]);
                        const isCurrent = p === data.phase.key;
                        const isDone = current >= 0 && i < current;
                        return <Box
                            key={p}
                            aria-current={isCurrent ? 'step' : undefined}
                            sx={{
                                p: 1.5,
                                borderRadius: '14px',
                                border: `1px solid ${isCurrent ? atlas.brand : atlas.line}`,
                                bgcolor: isCurrent ? atlas.surface : atlas.surface2,
                                transition: `border-color 240ms ${motion.easing}`,
                            }}
                        >
                            <Box sx={{ height: 6, borderRadius: 999, mb: 1, bgcolor: isDone ? atlas.ok : isCurrent ? atlas.brand : atlas.surface3 }} />
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{t(`coach.recommendations.phases.${p}`)}</Typography>
                                {isDone && <CheckIcon sx={{ fontSize: 16, color: atlas.ok }} />}
                            </Stack>
                        </Box>;
                    })}
                </Box>
                <Box>
                    {data.recommendations.map(r => <Alert key={r.key} severity={r.severity} sx={{ mb: 1 }}>
                        <strong>{r.title}</strong> {r.detail}
                    </Alert>)}
                </Box>
            </Stack>
        </CardContent>
    </Card>;
};
