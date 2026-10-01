import { Language } from "@/components/Exercises";
import { GymCurrentExercise } from "@/components/Routines/gym/GymCurrentExercise";
import { GymExerciseList } from "@/components/Routines/gym/GymExerciseList";
import { GymRestCard } from "@/components/Routines/gym/GymRestCard";
import {
    createGymState,
    findExercise,
    GymExercise,
    gymReducer,
    GymState,
    isComplete,
    latestLogFor,
    PreviousLike,
    progressOf,
    restAlertsBetween,
    restRemaining,
} from "@/components/Routines/gym/gymSession";
import { useGymAudio } from "@/components/Routines/gym/useGymAudio";
import { useGymPreferences } from "@/components/Routines/gym/useGymPreferences";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    LinearProgress,
    Stack,
    Typography
} from "@mui/material";
import Grid from "@mui/material/Grid";
import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/*
 * The live training session of one day: exercise list, current exercise and
 * rest timer. All the state transitions are in the reducer of gymSession, this
 * component only wires it to the clock, the alerts and the layout (three
 * columns on desktop, stacked with the current exercise first on mobile).
 */
export const GymSession = (props: {
    exercises: GymExercise[],
    language?: Language,
    previousLogs: PreviousLike[],
    /** Saves the session. Rejects if that fails, the page then stays as it is. */
    onFinish: (state: GymState) => Promise<void>,
}) => {
    const { t } = useTranslation();
    const [state, dispatch] = useReducer(gymReducer, undefined, () => createGymState(props.exercises, Date.now()));
    const [preferences, updatePreferences] = useGymPreferences();
    const { playAlert, unlock } = useGymAudio(preferences.soundEnabled);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);

    // The clock only runs while there is a rest to count down
    const [now, setNow] = useState(() => Date.now());
    const { rest } = state;
    const remaining = restRemaining(rest, now);
    const isRestOver = remaining === 0;

    useEffect(() => {
        if (rest === null || isRestOver) {
            return;
        }
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(id);
    }, [rest, isRestOver]);

    // Alerts: what was passed since the last look, and the end of the rest
    const tracker = useRef<{ startedAt: number, remaining: number } | null>(null);
    const { warningEnabled, autoAdvance } = preferences;
    useEffect(() => {
        if (rest === null) {
            tracker.current = null;
            return;
        }
        if (tracker.current?.startedAt !== rest.startedAt) {
            tracker.current = { startedAt: rest.startedAt, remaining: rest.duration };
        }

        const previous = tracker.current.remaining;
        if (remaining >= previous) {
            return;
        }
        tracker.current.remaining = remaining;

        for (const alert of restAlertsBetween(previous, remaining, rest.duration)) {
            if (alert !== 'warning' || warningEnabled) {
                playAlert(alert);
            }
        }
        if (remaining === 0 && autoAdvance) {
            dispatch({ type: 'advance' });
        }
    }, [rest, remaining, warningEnabled, autoAdvance, playAlert]);

    // Nothing to rest after (e.g. within a superset): go on right away
    const currentKey = state.currentKey;
    const currentIsComplete = currentKey !== null && isComplete(state, currentKey);
    useEffect(() => {
        if (autoAdvance && rest === null && currentIsComplete) {
            dispatch({ type: 'advance' });
        }
    }, [autoAdvance, rest, currentIsComplete]);

    // Logged sets are lost with the page, so ask before leaving with some
    const hasLogs = state.logged.length > 0;
    useEffect(() => {
        if (!hasLogs) {
            return;
        }
        const handler = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [hasLogs]);

    const handleDone = useCallback((repetitions: number | null, weight: number | null) => {
        dispatch({ type: 'logSet', repetitions, weight, now: Date.now() });
        setNow(Date.now());
    }, []);

    const doFinish = async () => {
        setConfirmOpen(false);
        setIsSaving(true);
        setSaveFailed(false);
        try {
            await props.onFinish(state);
        } catch {
            setSaveFailed(true);
        } finally {
            setIsSaving(false);
        }
    };

    const progress = progressOf(state);
    const current = findExercise(state, state.currentKey);
    const previous = current === undefined ? undefined : latestLogFor(props.previousLogs, current.exerciseId);

    return <>
        <Stack spacing={2}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
                <Stack spacing={1} sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">
                        {t('routines.gym.progress', { done: progress.done, total: progress.total })}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={progress.total === 0 ? 0 : 100 * progress.done / progress.total}
                        aria-hidden
                    />
                </Stack>
                <Button
                    variant="contained"
                    color="success"
                    disabled={!hasLogs || isSaving}
                    onClick={() => progress.done < progress.total ? setConfirmOpen(true) : doFinish()}
                >
                    {t('routines.gym.finish')}
                </Button>
            </Stack>

            {saveFailed && <Alert severity="error">{t('routines.gym.saveFailed')}</Alert>}

            <Grid container spacing={2}>
                {/* On small screens the current exercise comes first, then the timer, then the list */}
                <Grid size={{ xs: 12, md: 3 }} sx={{ order: { xs: 3, md: 1 } }}>
                    <GymExerciseList
                        state={state}
                        language={props.language}
                        onSelect={key => dispatch({ type: 'select', key })}
                        onMove={(key, direction) => dispatch({ type: 'move', key, direction })}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }} sx={{ order: { xs: 1, md: 2 } }}>
                    <GymCurrentExercise
                        state={state}
                        language={props.language}
                        previous={previous}
                        playAlert={playAlert}
                        unlock={unlock}
                        onDone={handleDone}
                        onRemoveSet={id => dispatch({ type: 'removeSet', id })}
                        onAdvance={() => dispatch({ type: 'advance' })}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }} sx={{ order: { xs: 2, md: 3 } }}>
                    <GymRestCard
                        state={state}
                        now={now}
                        preferences={preferences}
                        language={props.language}
                        onPreferencesChange={updatePreferences}
                        onSkip={() => dispatch({ type: 'finishRest', advance: preferences.autoAdvance })}
                    />
                </Grid>
            </Grid>
        </Stack>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <DialogTitle>{t('routines.gym.finishEarlyTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t('routines.gym.finishEarlyText', { count: progress.total - progress.done })}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setConfirmOpen(false)}>{t('routines.gym.keepTraining')}</Button>
                <Button onClick={doFinish} color="success">{t('routines.gym.finish')}</Button>
            </DialogActions>
        </Dialog>
    </>;
};
