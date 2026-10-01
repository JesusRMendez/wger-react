import { formatClock, RepetitionUnitKind, RestAlert } from "@/components/Routines/gym/gymSession";
import { Button, Stack, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/*
 * Times the work interval of a set measured in time (seconds, minutes).
 *
 * With a planned duration it counts down and ends with the long tone, without
 * one it is a stopwatch. Either way the elapsed time is handed back so the
 * value of the set can be filled in.
 */
export const GymSetTimer = (props: {
    kind: RepetitionUnitKind,
    /** The planned duration in seconds, null for a stopwatch */
    targetSeconds: number | null,
    onResult: (elapsedSeconds: number) => void,
    playAlert: (alert: RestAlert) => void,
    unlock: () => void,
}) => {
    const { t } = useTranslation();
    const { targetSeconds, onResult, playAlert } = props;
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (startedAt === null) {
            return;
        }
        const id = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(id);
    }, [startedAt]);

    const isCountdown = targetSeconds !== null && targetSeconds > 0;
    const elapsed = startedAt === null ? 0 : Math.max(0, (now - startedAt) / 1000);

    // The planned time is up
    useEffect(() => {
        if (startedAt !== null && isCountdown && elapsed >= targetSeconds) {
            setStartedAt(null);
            playAlert('end');
            onResult(targetSeconds);
        }
    }, [startedAt, isCountdown, elapsed, targetSeconds, playAlert, onResult]);

    const shown = isCountdown
        ? (startedAt === null ? targetSeconds : Math.max(0, Math.ceil(targetSeconds - elapsed)))
        : Math.floor(elapsed);

    const start = () => {
        props.unlock();
        const current = Date.now();
        setNow(current);
        setStartedAt(current);
    };

    const stop = () => {
        setStartedAt(null);
        onResult(elapsed);
    };

    return <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Typography variant="h4" component="p" data-testid="set-timer" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatClock(shown)}
        </Typography>
        {startedAt === null
            ? <Button variant="outlined" onClick={start}>{t('routines.gym.startTimer')}</Button>
            : <Button variant="outlined" color="warning" onClick={stop}>{t('routines.gym.stopTimer')}</Button>}
    </Stack>;
};
