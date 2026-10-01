import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { Alert, Box, Card, CardContent, LinearProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Indicator } from "@/components/Coach/models";
import { useIndicatorsQuery } from "@/components/Coach/queries";

export const WINDOWS = [7, 28, 90];

const TrendArrow = ({ trend }: { trend?: Indicator['trend'] }) => {
    const [t] = useTranslation();
    if (trend === 'up') {
        return <ArrowUpwardIcon fontSize="small" color="success" titleAccess={t('coach.indicators.trend.up')} />;
    }
    if (trend === 'down') {
        return <ArrowDownwardIcon fontSize="small" color="warning" titleAccess={t('coach.indicators.trend.down')} />;
    }
    if (trend === 'flat') {
        return <ArrowForwardIcon fontSize="small" color="disabled" titleAccess={t('coach.indicators.trend.flat')} />;
    }
    return null;
};

export const IndicatorsSection = () => {
    const [t] = useTranslation();
    const [window, setWindow] = useState(28);
    const query = useIndicatorsQuery(window);
    const data = query.data;

    return <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">{t('coach.indicators.title')}</Typography>
            <ToggleButtonGroup size="small" exclusive value={window} onChange={(_, v) => v && setWindow(v)}>
                {WINDOWS.map(w => <ToggleButton key={w} value={w}>{t('coach.indicators.days', { count: w })}</ToggleButton>)}
            </ToggleButtonGroup>
        </Stack>

        {query.isError && <Alert severity="error">{t('coach.errors.generic')}</Alert>}
        {data && data.indicators.length === 0 && <Typography color="text.secondary">{t('coach.indicators.empty')}</Typography>}

        <Grid container spacing={2}>
            {(data?.indicators ?? []).map((ind, i) => <Grid key={`${ind.key}-${ind.exercise_id ?? i}`} size={{ xs: 6, sm: 4 }}>
                <Card variant="outlined" data-testid={`indicator-${ind.key}`}>
                    <CardContent>
                        <Typography variant="caption" color="text.secondary">{ind.label}</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Typography variant="h5">{ind.value}{ind.unit ? ` ${ind.unit}` : ''}</Typography>
                            <TrendArrow trend={ind.trend} />
                        </Stack>
                        {ind.target != null && <Typography variant="caption">
                            {t('coach.indicators.target', { target: ind.target })}
                        </Typography>}
                    </CardContent>
                </Card>
            </Grid>)}
        </Grid>

        {data && <Card variant="outlined" data-testid="data-quality">
            <CardContent>
                <Typography variant="h6">{t('coach.dataQuality.title')}</Typography>
                <Box sx={{ my: 1 }}>
                    <Typography variant="body2">{t('coach.dataQuality.score', { score: data.data_quality.score })}</Typography>
                    <LinearProgress variant="determinate" value={data.data_quality.score} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                {data.data_quality.missing.map(m => <Alert key={m.key} severity="info" sx={{ mt: 1 }}>
                    <strong>{m.title}</strong> {m.detail}
                </Alert>)}
            </CardContent>
        </Card>}
    </Stack>;
};
