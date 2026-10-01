import { Alert, Link as MuiLink } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { coachErrorKind } from "@/components/Coach/errors";
import { makeLink, WgerLink } from "@/core/lib/url";

/*
 * Friendly message for an error returned by one of the AI endpoints
 */
export const CoachErrorAlert = ({ error }: { error: unknown }) => {
    const [t, i18n] = useTranslation();
    if (!error) {
        return null;
    }
    const kind = coachErrorKind(error);

    if (kind === 'not_available') {
        return <Alert severity="info" data-testid="coach-error-not-available">
            {t('coach.errors.notAvailable')}{' '}
            <MuiLink component={Link} to={makeLink(WgerLink.COACH_SETTINGS, i18n.language)}>
                {t('coach.errors.openSettings')}
            </MuiLink>
        </Alert>;
    }
    if (kind === 'quota_exceeded') {
        return <Alert severity="warning" data-testid="coach-error-quota">{t('coach.errors.quotaExceeded')}</Alert>;
    }
    if (kind === 'forbidden') {
        return <Alert severity="error">{t('coach.errors.forbidden')}</Alert>;
    }
    return <Alert severity="error">{t('coach.errors.generic')}</Alert>;
};
