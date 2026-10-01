import { Chip, LinearProgress, Link as MuiLink, Stack, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useCoachUsageQuery } from "@/components/Coach/queries";
import { makeLink, WgerLink } from "@/core/lib/url";

/*
 * Shows which AI mode is active (server / own AI / not available) and the
 * token usage of the month
 */
export const ModeBadge = () => {
    const [t, i18n] = useTranslation();
    const query = useCoachUsageQuery();

    if (query.isLoading) {
        return null;
    }
    if (query.isError || !query.data) {
        return <Chip size="small" color="default" label={t('coach.mode.none')} />;
    }

    const usage = query.data;
    const total = usage.input_tokens + usage.output_tokens;
    const color = usage.mode === 'server' ? 'primary' : usage.mode === 'byo' ? 'secondary' : 'default';

    return <Stack spacing={0.5} data-testid="coach-mode-badge">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip size="small" color={color} label={t(`coach.mode.${usage.mode}`)} />
            {usage.mode === 'none' && <MuiLink component={Link} to={makeLink(WgerLink.COACH_SETTINGS, i18n.language)}>
                {t('coach.mode.configure')}
            </MuiLink>}
        </Stack>
        <Typography variant="caption" color="text.secondary">
            {usage.limit
                ? t('coach.usage.withLimit', { used: total, limit: usage.limit })
                : t('coach.usage.noLimit', { used: total })}
        </Typography>
        {usage.limit ? <LinearProgress
            variant="determinate"
            value={Math.min(100, (total / usage.limit) * 100)}
            color={total >= usage.limit ? 'error' : 'primary'} /> : null}
    </Stack>;
};
