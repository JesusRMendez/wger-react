import { ExerciseImageAvatar, Language } from "@/components/Exercises";
import {
    COUNTDOWN_SECONDS,
    createGuidedState,
    currentExercise,
    currentStep,
    findGuidedExercise,
    GuidedState,
    guidedProgress,
    guidedReducer,
    guidedWorkKind,
    jumpWarnings,
    phaseElapsed,
    phaseRemaining,
    reorderWarnings,
    stepsOf,
    toGymState,
    upcomingStep,
    canMoveExercise,
    isStepDone,
    remainingSeconds,
    GuidedWarning,
    ReorderWarning,
} from "@/components/Routines/gym/guidedEngine";
import {
    describePlannedSet,
    exerciseName,
    formatClock,
    formatNumber,
    GymExercise,
    GymState,
    parseNumberInput,
    restAlertsBetween,
    weightUnitKind,
} from "@/components/Routines/gym/gymSession";
import { MusicBpmCard } from "@/components/Routines/gym/MusicBpmCard";
import { musicPhaseForExercise, MusicPhase } from "@/components/Routines/gym/musicBpm";
import { useGymAudio } from "@/components/Routines/gym/useGymAudio";
import { useGymPreferences } from "@/components/Routines/gym/useGymPreferences";
import { Abbr, GlossaryButton } from "@/core/glossary";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
    Alert,
    Button,
    Card,
    CardContent,
    CardHeader,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import React, { useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Pending =
    | { kind: 'jump', stepId: string, warnings: GuidedWarning[] }
    | { kind: 'move', key: string, direction: 'up' | 'down', warnings: ReorderWarning[] };

/* The weight of the current exercise, which can be corrected before the set is done */
const WeightField = (props: { exercise: GymExercise, onChange: (weight: number | null) => void }) => {
    const { t } = useTranslation();
    const { exercise } = props;
    const [text, setText] = useState(exercise.weight === null ? '' : formatNumber(exercise.weight));
    const parsed = parseNumberInput(text);
    const kind = weightUnitKind(exercise.weightUnit);
    const unitName = exercise.weightUnit?.name ?? '';

    let label = t('weight');
    if (kind === 'bodyWeight') {
        label = t('routines.gym.additionalWeight', { unit: unitName });
    } else if (kind !== 'weight' && kind !== 'none') {
        label = unitName;
    }

    return <TextField
        label={label}
        value={text}
        onChange={event => {
            setText(event.target.value);
            const value = parseNumberInput(event.target.value);
            if (value !== undefined) {
                props.onChange(value);
            }
        }}
        error={parsed === undefined}
        helperText={parsed === undefined ? t('forms.enterNumber') : undefined}
        slotProps={{
            input: kind === 'weight' ? { endAdornment: <span>{unitName}</span> } : undefined,
            htmlInput: { inputMode: 'decimal' },
        }}
        size="small"
    />;
};

const MaxRepsAsk = (props: { exercise: GymExercise, onSubmit: (count: number) => void }) => {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const parsed = parseNumberInput(text);
    const valid = typeof parsed === 'number';

    return <Stack spacing={2}>
        <Typography>{t('routines.guided.howMany', { unit: props.exercise.repetitionUnit?.name ?? '' })}</Typography>
        <TextField
            label={t('routines.guided.repsAchieved')}
            value={text}
            onChange={event => setText(event.target.value)}
            error={parsed === undefined}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            autoFocus
            required
        />
        <Button variant="contained" size="large" disabled={!valid}
                onClick={() => valid && props.onSubmit(parsed)}>
            {t('routines.guided.confirmCount')}
        </Button>
    </Stack>;
};

const warningText = (t: (key: string, options?: Record<string, unknown>) => string,
                     warning: GuidedWarning | ReorderWarning, state: GuidedState, language?: Language): string => {
    if (typeof warning === 'string') {
        return t(`routines.guided.warnings.${warning}`);
    }
    switch (warning.type) {
        case 'skipsSets':
            return t('routines.guided.warnings.skipsSets', { count: warning.count });
        case 'leavesExercise':
            return t('routines.guided.warnings.leavesExercise', {
                name: exerciseName(findGuidedExercise(state, warning.key)!, language),
                count: warning.remaining,
            });
        case 'outOfPlan':
            return t('routines.guided.warnings.outOfPlan');
    }
};

/*
 * The guided routine: the day runs by itself as intervals, with a countdown,
 * the work, the rest of each exercise and the intro of what comes next. All
 * transitions are in guidedEngine, this component wires them to the clock, the
 * alerts and the layout.
 */
export const GuidedRoutine = (props: {
    exercises: GymExercise[],
    language?: Language,
    /** Saves the training. Rejects if that fails, the page then stays as it is. */
    onFinish: (state: GymState) => Promise<void>,
}) => {
    const { t } = useTranslation();
    const [state, dispatch] = useReducer(guidedReducer, undefined, () => createGuidedState(props.exercises, Date.now()));
    const [preferences, updatePreferences] = useGymPreferences();
    const { playAlert, unlock } = useGymAudio(preferences.soundEnabled);

    const [now, setNow] = useState(() => Date.now());
    const [pending, setPending] = useState<Pending | null>(null);
    const [confirmFinish, setConfirmFinish] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);

    const { phase, phaseStartedAt, phaseDuration } = state;
    const remaining = phaseRemaining(state, now);
    const hasClock = phaseDuration !== null && phaseStartedAt !== null;
    const { autoAdvance, warningEnabled } = preferences;

    // The clock only runs while a phase counts down
    useEffect(() => {
        if (!hasClock) {
            return;
        }
        setNow(Date.now());
        const id = setInterval(() => {
            const current = Date.now();
            setNow(current);
            dispatch({ type: 'tick', now: current, autoAdvance });
        }, 250);
        return () => clearInterval(id);
    }, [hasClock, phaseStartedAt, autoAdvance]);

    // Alerts of the countdown, the last seconds of a work and rest, and their end
    const tracker = useRef<{ startedAt: number, endsAt: number, duration: number, remaining: number } | null>(null);
    useEffect(() => {
        const play = (previous: number, next: number, duration: number) => {
            for (const alert of restAlertsBetween(previous, next, duration)) {
                if (alert !== 'warning' || warningEnabled) {
                    playAlert(alert);
                }
            }
        };

        const old = tracker.current;
        if (old !== null && old.startedAt !== phaseStartedAt) {
            // The phase that was counting down ended by itself when the next one starts exactly
            // at its end, which is when its closing tone is due. A phase cut short (skip, jump) has none.
            if (phaseStartedAt === old.endsAt && old.remaining > 0) {
                play(old.remaining, 0, old.duration);
            }
            tracker.current = null;
        }

        if (!hasClock || remaining === null) {
            return;
        }
        if (tracker.current === null) {
            tracker.current = {
                startedAt: phaseStartedAt!,
                endsAt: phaseStartedAt! + phaseDuration! * 1000,
                duration: phaseDuration!,
                remaining: phaseDuration!,
            };
        }
        const previous = tracker.current.remaining;
        if (remaining >= previous) {
            return;
        }
        tracker.current.remaining = remaining;
        play(previous, remaining, phaseDuration!);
    }, [hasClock, remaining, phaseStartedAt, phaseDuration, warningEnabled, playAlert]);

    const results = state.results.length;
    useEffect(() => {
        if (results === 0) {
            return;
        }
        const handler = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [results]);

    const progress = guidedProgress(state);
    const step = currentStep(state);
    const exercise = currentExercise(state);
    const upcoming = upcomingStep(state);
    const upcomingExercise = findGuidedExercise(state, upcoming?.exerciseKey ?? null);

    const doFinish = async () => {
        setConfirmFinish(false);
        setIsSaving(true);
        setSaveFailed(false);
        try {
            await props.onFinish(toGymState(state));
        } catch {
            setSaveFailed(true);
        } finally {
            setIsSaving(false);
        }
    };

    const requestJump = (stepId: string) => {
        const warnings = jumpWarnings(state, stepId);
        if (warnings.length === 0) {
            dispatch({ type: 'jump', stepId, now: Date.now() });
        } else {
            setPending({ kind: 'jump', stepId, warnings });
        }
    };

    const requestMove = (key: string, direction: 'up' | 'down') => {
        const warnings = reorderWarnings(state, key, direction);
        if (warnings.length === 0) {
            dispatch({ type: 'move', key, direction });
        } else {
            setPending({ kind: 'move', key, direction, warnings });
        }
    };

    const confirmPending = () => {
        if (pending?.kind === 'jump') {
            dispatch({ type: 'jump', stepId: pending.stepId, now: Date.now() });
        } else if (pending?.kind === 'move') {
            dispatch({ type: 'move', key: pending.key, direction: pending.direction });
        }
        setPending(null);
    };

    let musicPhase: MusicPhase;
    if (phase === 'countdown' && results === 0) {
        musicPhase = 'warmup';
    } else if (phase === 'work' || phase === 'countdown') {
        musicPhase = musicPhaseForExercise(exercise);
    } else {
        musicPhase = 'rest';
    }

    const clockText = remaining === null ? '' : formatClock(remaining);
    const workKind = exercise === undefined ? 'reps' : guidedWorkKind(exercise);
    const restedExercise = findGuidedExercise(state, state.restExerciseKey);
    const restIsOver = phase === 'rest' && remaining === 0;

    const main = <Card>
        <CardHeader
            title={<Typography variant="h6" component="h2">{t(`routines.guided.phases.${phase}`)}</Typography>}
            subheader={step !== undefined && exercise !== undefined && phase !== 'done' && phase !== 'ready'
                ? t('routines.gym.setNofM', { number: step.set, total: step.totalSets })
                : undefined}
        />
        <CardContent>
            <Stack spacing={2} sx={{ alignItems: 'stretch' }}>
                {phase === 'ready' && <>
                    <Typography>{t('routines.guided.readyText', { count: progress.total })}</Typography>
                    <Button variant="contained" size="large"
                            onClick={() => {
                                unlock();
                                dispatch({ type: 'start', now: Date.now() });
                            }}>
                        {t('routines.guided.begin')}
                    </Button>
                </>}

                {phase === 'countdown' && <>
                    {exercise !== undefined && <Typography variant="h5">{exerciseName(exercise, props.language)}</Typography>}
                    <Typography variant="h1" component="p" data-testid="guided-clock"
                                sx={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                        {Math.min(COUNTDOWN_SECONDS, remaining ?? COUNTDOWN_SECONDS)}
                    </Typography>
                </>}

                {phase === 'work' && exercise !== undefined && <>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <ExerciseImageAvatar image={exercise.exercise.mainImage} avatarSize={72} iconSize={48} />
                        <Typography variant="h5">{exerciseName(exercise, props.language)}</Typography>
                    </Stack>
                    <Typography>{describePlannedSet(exercise) || t('routines.gym.noPlannedValues')}</Typography>
                    {exercise.rir !== null && <Typography variant="body2"><Abbr term="RIR" />: {exercise.rir}</Typography>}
                    {workKind === 'timed' && <Typography variant="h2" component="p" data-testid="guided-clock"
                                                         sx={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                        {clockText}
                    </Typography>}
                    {(exercise.weight !== null || weightUnitKind(exercise.weightUnit) !== 'none') && <WeightField
                        key={exercise.key}
                        exercise={exercise}
                        onChange={weight => dispatch({ type: 'setWeight', key: exercise.key, weight })}
                    />}
                    <Button variant="contained" size="large"
                            onClick={() => {
                                unlock();
                                dispatch({ type: 'finishWork', now: Date.now() });
                            }}>
                        {workKind === 'timed' ? t('routines.guided.finishEarly') : t('routines.guided.doneSet')}
                    </Button>
                </>}

                {phase === 'askMaxReps' && exercise !== undefined && <MaxRepsAsk
                    exercise={exercise}
                    onSubmit={repetitions => dispatch({ type: 'submitMaxReps', repetitions, now: Date.now() })}
                />}

                {phase === 'rest' && <>
                    {restedExercise !== undefined && <Typography variant="body2">
                        {t('routines.gym.restAfter', { name: exerciseName(restedExercise, props.language) })}
                    </Typography>}
                    <Typography variant="h2" component="p" data-testid="guided-clock"
                                sx={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                        {clockText}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={phaseDuration ? Math.min(100, 100 * phaseElapsed(state, now) / phaseDuration) : 0}
                        aria-hidden
                    />
                    {upcomingExercise !== undefined && upcoming !== undefined && <Card variant="outlined"
                                                                                       data-testid="next-intro">
                        <CardHeader
                            avatar={<ExerciseImageAvatar image={upcomingExercise.exercise.mainImage} avatarSize={72}
                                                         iconSize={48} />}
                            title={<Typography variant="h6">
                                {t('routines.guided.upNext', { name: exerciseName(upcomingExercise, props.language) })}
                            </Typography>}
                            subheader={<>
                                {t('routines.gym.setNofM', { number: upcoming.set, total: upcoming.totalSets })}
                                {' - '}
                                {describePlannedSet(upcomingExercise) || t('routines.gym.noPlannedValues')}
                            </>}
                        />
                    </Card>}
                    <Button variant={restIsOver ? 'contained' : 'outlined'}
                            onClick={() => dispatch({ type: 'skipRest', now: Date.now() })}>
                        {restIsOver ? t('routines.guided.startNext') : t('routines.gym.skipRest')}
                    </Button>
                </>}

                {phase === 'done' && <Alert severity="success">{t('routines.guided.allDone')}</Alert>}
            </Stack>
        </CardContent>
    </Card>;

    const list = <Card>
        <CardHeader title={t('exercises.exercises')} subheader={t('routines.guided.remaining', {
            minutes: Math.ceil(remainingSeconds(state) / 60)
        })} />
        <CardContent sx={{ p: 0 }}>
            <List disablePadding>
                {state.order.map(key => {
                    const item = findGuidedExercise(state, key)!;
                    const steps = stepsOf(state).filter(s => s.exerciseKey === key);
                    const done = steps.filter(s => isStepDone(state, s.id)).length;
                    const nextStep = steps.find(s => !isStepDone(state, s.id));
                    const name = exerciseName(item, props.language);
                    return <ListItem
                        key={key}
                        disablePadding
                        secondaryAction={nextStep !== undefined && <Stack direction="row">
                            <IconButton size="small" aria-label={t('routines.gym.moveUp', { name })}
                                        disabled={!canMoveExercise(state, key, 'up')}
                                        onClick={() => requestMove(key, 'up')}>
                                <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" aria-label={t('routines.gym.moveDown', { name })}
                                        disabled={!canMoveExercise(state, key, 'down')}
                                        onClick={() => requestMove(key, 'down')}>
                                <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                        </Stack>}
                    >
                        <ListItemButton
                            selected={step?.exerciseKey === key}
                            disabled={nextStep === undefined || phase === 'ready' || phase === 'done'}
                            onClick={() => nextStep && requestJump(nextStep.id)}
                            sx={{ pr: nextStep === undefined ? 2 : 11 }}
                        >
                            <ListItemAvatar>
                                <ExerciseImageAvatar image={item.exercise.mainImage} />
                            </ListItemAvatar>
                            <ListItemText primary={name}
                                          secondary={t('routines.gym.setsDone', { done, total: steps.length })} />
                            {nextStep === undefined && <CheckCircleIcon color="success" fontSize="small" />}
                        </ListItemButton>
                    </ListItem>;
                })}
            </List>
        </CardContent>
    </Card>;

    return <>
        <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
                   sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                <Stack spacing={1} sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">
                        {t('routines.gym.progress', { done: progress.done, total: progress.total })}
                    </Typography>
                    <LinearProgress variant="determinate"
                                    value={progress.total === 0 ? 0 : 100 * progress.done / progress.total}
                                    aria-hidden />
                </Stack>
                <GlossaryButton />
                <Button variant="contained" color="success" disabled={results === 0 || isSaving}
                        onClick={() => progress.done < progress.total ? setConfirmFinish(true) : doFinish()}>
                    {t('routines.gym.finish')}
                </Button>
            </Stack>

            {saveFailed && <Alert severity="error">{t('routines.gym.saveFailed')}</Alert>}

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }} sx={{ order: { xs: 1, md: 2 } }}>{main}</Grid>
                <Grid size={{ xs: 12, md: 3 }} sx={{ order: { xs: 3, md: 1 } }}>{list}</Grid>
                <Grid size={{ xs: 12, md: 3 }} sx={{ order: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                        <MusicBpmCard phase={musicPhase} />
                        <Card>
                            <CardContent>
                                <FormControlLabel
                                    control={<Switch checked={preferences.soundEnabled}
                                                     onChange={e => updatePreferences({ soundEnabled: e.target.checked })} />}
                                    label={t('routines.gym.sound')} />
                                <FormControlLabel
                                    control={<Switch checked={preferences.warningEnabled}
                                                     onChange={e => updatePreferences({ warningEnabled: e.target.checked })} />}
                                    label={t('routines.gym.warning20')} />
                                <FormControlLabel
                                    control={<Switch checked={preferences.autoAdvance}
                                                     onChange={e => updatePreferences({ autoAdvance: e.target.checked })} />}
                                    label={t('routines.gym.autoAdvance')} />
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        </Stack>

        <Dialog open={pending !== null} onClose={() => setPending(null)}>
            <DialogTitle>{t('routines.guided.warningTitle')}</DialogTitle>
            <DialogContent>
                <Stack spacing={1}>
                    {pending?.warnings.map(warning => <DialogContentText key={typeof warning === 'string' ? warning : warning.type}>
                        {warningText(t as never, warning, state, props.language)}
                    </DialogContentText>)}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setPending(null)}>{t('cancel')}</Button>
                <Button onClick={confirmPending} color="warning">{t('routines.guided.continueAnyway')}</Button>
            </DialogActions>
        </Dialog>

        <Dialog open={confirmFinish} onClose={() => setConfirmFinish(false)}>
            <DialogTitle>{t('routines.gym.finishEarlyTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t('routines.gym.finishEarlyText', { count: progress.total - progress.done })}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setConfirmFinish(false)}>{t('routines.gym.keepTraining')}</Button>
                <Button onClick={doFinish} color="success">{t('routines.gym.finish')}</Button>
            </DialogActions>
        </Dialog>
    </>;
};
