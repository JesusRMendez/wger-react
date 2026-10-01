import { ExerciseImageAvatar, Language } from "@/components/Exercises";
import { GymSetTimer } from "@/components/Routines/gym/GymSetTimer";
import {
    describePlannedSet,
    doneSetsOf,
    exerciseName,
    findExercise,
    formatNumber,
    formatRepetitions,
    formatWeight,
    GymExercise,
    GymState,
    isAllDone,
    isComplete,
    isOutOfOrder,
    isTimeKind,
    parseNumberInput,
    PreviousLike,
    repetitionUnitKind,
    RestAlert,
    secondsToValue,
    valueToSeconds,
    weightUnitKind,
} from "@/components/Routines/gym/gymSession";
import { REP_UNIT_REPETITIONS } from "@/core/lib/consts";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    IconButton,
    InputAdornment,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

const initialText = (value: number | null | undefined): string =>
    value === null || value === undefined ? '' : formatNumber(value);

/*
 * The value and weight inputs of one set. The labels are driven by the units
 * of the exercise: what is called a repetition, a second or a plate is up to
 * the data, nothing is assumed here.
 */
const GymSetInputs = (props: {
    exercise: GymExercise,
    previous?: PreviousLike,
    setNumber: number,
    playAlert: (alert: RestAlert) => void,
    unlock: () => void,
    onDone: (repetitions: number | null, weight: number | null) => void,
}) => {
    const { t } = useTranslation();
    const { exercise, previous } = props;

    const [repetitions, setRepetitions] = useState(
        initialText(exercise.repetitions ?? previous?.repetitions)
    );
    const [weight, setWeight] = useState(initialText(exercise.weight ?? previous?.weight));

    const repKind = repetitionUnitKind(exercise.repetitionUnit);
    const weightKind = weightUnitKind(exercise.weightUnit);
    const repUnitName = exercise.repetitionUnit?.name ?? '';
    const weightUnitName = exercise.weightUnit?.name ?? '';

    const parsedRepetitions = parseNumberInput(repetitions);
    const parsedWeight = parseNumberInput(weight);
    const isValid = parsedRepetitions !== undefined && parsedWeight !== undefined;

    // The plain repetitions are labelled as such, any other unit is named
    const repLabel = repKind === 'repetitions' || repKind === 'failure' ? t('server.repetitions') : repUnitName;
    const showRepUnit = exercise.repetitionUnit !== null
        && exercise.repetitionUnit.id !== REP_UNIT_REPETITIONS
        && repUnitName.toLowerCase() !== repLabel.toLowerCase();

    // A real weight has its unit next to the number. Body weight, plates or a speed are named
    // by their unit instead, so the field says what is entered.
    let weightLabel = t('weight');
    let showWeightUnit = false;
    if (weightKind === 'weight') {
        showWeightUnit = true;
    } else if (weightKind === 'bodyWeight') {
        weightLabel = t('routines.gym.additionalWeight', { unit: weightUnitName });
    } else if (weightKind === 'plates' || weightKind === 'speed' || weightKind === 'other') {
        weightLabel = weightUnitName;
    }

    const targetSeconds = exercise.repetitions !== null ? valueToSeconds(exercise.repetitions, repKind) : null;

    const applyValues = (reps: number | null, weight: number | null) => {
        setRepetitions(initialText(reps));
        setWeight(initialText(weight));
    };

    return <Stack spacing={2}>
        {isTimeKind(repKind) && <GymSetTimer
            kind={repKind}
            targetSeconds={targetSeconds}
            playAlert={props.playAlert}
            unlock={props.unlock}
            onResult={seconds => setRepetitions(formatNumber(secondsToValue(seconds, repKind)))}
        />}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
                label={repLabel}
                value={repetitions}
                onChange={event => setRepetitions(event.target.value)}
                error={parsedRepetitions === undefined}
                helperText={parsedRepetitions === undefined ? t('forms.enterNumber') : undefined}
                slotProps={{
                    input: {
                        endAdornment: showRepUnit
                            ? <InputAdornment position="end">{repUnitName}</InputAdornment>
                            : undefined
                    },
                    htmlInput: { inputMode: 'decimal' }
                }}
                fullWidth
            />
            <TextField
                label={weightLabel}
                value={weight}
                onChange={event => setWeight(event.target.value)}
                error={parsedWeight === undefined}
                helperText={parsedWeight === undefined ? t('forms.enterNumber') : undefined}
                slotProps={{
                    input: {
                        endAdornment: showWeightUnit
                            ? <InputAdornment position="end">{weightUnitName}</InputAdornment>
                            : undefined
                    },
                    htmlInput: { inputMode: 'decimal' }
                }}
                fullWidth
            />
        </Stack>

        {previous !== undefined && <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
                {t('routines.gym.previous', {
                    value: [
                        formatRepetitions(previous.repetitions, null, previous.repetitionUnitObj),
                        formatWeight(previous.weight, null, previous.weightUnitObj)
                    ].filter(part => part !== '').join(' x '),
                    date: previous.date.toLocaleDateString(),
                })}
            </Typography>
            <Button size="small" onClick={() => applyValues(previous.repetitions, previous.weight)}>
                {t('routines.gym.usePrevious')}
            </Button>
        </Stack>}

        <Button
            variant="contained"
            size="large"
            disabled={!isValid}
            onClick={() => {
                props.unlock();
                props.onDone(parsedRepetitions ?? null, parsedWeight ?? null);
            }}
        >
            {t('routines.gym.doneSet', { number: props.setNumber })}
        </Button>
    </Stack>;
};


const GymLoggedSets = (props: {
    state: GymState,
    language?: Language,
    onRemove: (id: number) => void,
}) => {
    const { t } = useTranslation();
    const { state } = props;

    if (state.logged.length === 0) {
        return <Typography variant="body2" color="text.secondary">{t('routines.gym.noSetsYet')}</Typography>;
    }

    return <Table size="small" aria-label={t('routines.gym.loggedSets')}>
        <TableHead>
            <TableRow>
                <TableCell>{t('routines.gym.exercise')}</TableCell>
                <TableCell>{t('routines.gym.value')}</TableCell>
                <TableCell>{t('weight')}</TableCell>
                <TableCell>{t('routines.restTime')}</TableCell>
                <TableCell />
            </TableRow>
        </TableHead>
        <TableBody>
            {state.logged.map(set => {
                const exercise = findExercise(state, set.exerciseKey);
                return <TableRow key={set.id}>
                    <TableCell>{exercise ? exerciseName(exercise, props.language) : ''}</TableCell>
                    <TableCell>{formatRepetitions(set.repetitions, null, set.repetitionUnit)}</TableCell>
                    <TableCell>{formatWeight(set.weight, null, set.weightUnit)}</TableCell>
                    <TableCell>{set.restSeconds}s</TableCell>
                    <TableCell>
                        <IconButton
                            size="small"
                            aria-label={t('routines.gym.removeSet')}
                            onClick={() => props.onRemove(set.id)}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </TableCell>
                </TableRow>;
            })}
        </TableBody>
    </Table>;
};


export const GymCurrentExercise = (props: {
    state: GymState,
    language?: Language,
    previous?: PreviousLike,
    playAlert: (alert: RestAlert) => void,
    unlock: () => void,
    onDone: (repetitions: number | null, weight: number | null) => void,
    onRemoveSet: (id: number) => void,
    onAdvance: () => void,
}) => {
    const { t } = useTranslation();
    const { state } = props;
    const exercise = findExercise(state, state.currentKey);

    if (exercise === undefined) {
        return <Alert severity="info">{t('routines.gym.noExercises')}</Alert>;
    }

    const complete = isComplete(state, exercise.key);
    const done = doneSetsOf(state, exercise.key);

    return <Stack spacing={2}>
        <Card>
            <CardHeader
                avatar={<ExerciseImageAvatar image={exercise.exercise.mainImage} avatarSize={72} iconSize={48} />}
                title={<Typography variant="h5">{exerciseName(exercise, props.language)}</Typography>}
                subheader={t('routines.gym.setNofM', {
                    number: Math.min(done + 1, exercise.nrOfSets),
                    total: exercise.nrOfSets
                })}
            />
            <CardContent>
                <Stack spacing={2}>
                    {isOutOfOrder(state) && <Alert severity="warning">{t('routines.gym.outOfOrder')}</Alert>}

                    <Box>
                        <Typography variant="subtitle2">{t('routines.gym.planned')}</Typography>
                        <Typography>
                            {describePlannedSet(exercise) || t('routines.gym.noPlannedValues')}
                            {exercise.type !== 'normal'
                                && <Chip label={exercise.type} color="info" size="small" sx={{ ml: 1 }} />}
                        </Typography>
                        {exercise.comment !== '' && <Typography variant="caption">{exercise.comment}</Typography>}
                    </Box>

                    {!complete && <GymSetInputs
                        // Fresh inputs for every exercise, the values carry over from set to set
                        key={exercise.key}
                        exercise={exercise}
                        previous={props.previous}
                        setNumber={done + 1}
                        playAlert={props.playAlert}
                        unlock={props.unlock}
                        onDone={props.onDone}
                    />}

                    {complete && <Stack spacing={1}>
                        <Alert severity="success">{t('routines.gym.exerciseDone')}</Alert>
                        {!isAllDone(state) && <Button variant="contained" onClick={props.onAdvance}>
                            {t('routines.gym.nextExercise')}
                        </Button>}
                    </Stack>}
                </Stack>
            </CardContent>
        </Card>

        <Card>
            <CardHeader title={t('routines.gym.loggedSets')} />
            <CardContent sx={{ overflowX: 'auto' }}>
                <GymLoggedSets state={state} language={props.language} onRemove={props.onRemoveSet} />
            </CardContent>
        </Card>
    </Stack>;
};
