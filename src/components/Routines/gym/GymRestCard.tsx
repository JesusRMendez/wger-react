import { Language } from "@/components/Exercises";
import {
    exerciseName,
    findExercise,
    formatClock,
    GymState,
    restRemaining,
} from "@/components/Routines/gym/gymSession";
import { GymPreferences } from "@/components/Routines/gym/useGymPreferences";
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    FormControlLabel,
    LinearProgress,
    Stack,
    Switch,
    Typography
} from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";

/*
 * The rest countdown and the toggles for how it alerts. The countdown runs on
 * the rest of the exercise that was just done, which is why the card names it.
 */
export const GymRestCard = (props: {
    state: GymState,
    now: number,
    preferences: GymPreferences,
    language?: Language,
    onPreferencesChange: (changes: Partial<GymPreferences>) => void,
    onSkip: () => void,
}) => {
    const { t } = useTranslation();
    const { rest } = props.state;

    const remaining = restRemaining(rest, props.now);
    const isOver = rest !== null && remaining === 0;
    const progress = rest === null ? 0 : 100 * (1 - remaining / rest.duration);
    const restedExercise = findExercise(props.state, rest?.exerciseKey ?? null);

    return <Card>
        <CardHeader title={t('routines.restTime')} />
        <CardContent>
            <Stack spacing={2}>
                <Typography
                    variant="h2"
                    component="p"
                    data-testid="rest-countdown"
                    sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}
                >
                    {formatClock(remaining)}
                </Typography>

                <LinearProgress variant="determinate" value={progress} aria-hidden />

                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    {rest === null && t('routines.gym.noRestRunning')}
                    {isOver && t('routines.gym.restOver')}
                    {rest !== null && !isOver && restedExercise !== undefined && t('routines.gym.restAfter', {
                        name: exerciseName(restedExercise, props.language),
                    })}
                </Typography>

                <Button variant="outlined" disabled={rest === null} onClick={props.onSkip}>
                    {isOver ? t('routines.gym.dismissRest') : t('routines.gym.skipRest')}
                </Button>

                <Stack>
                    <FormControlLabel
                        control={<Switch
                            checked={props.preferences.soundEnabled}
                            onChange={event => props.onPreferencesChange({ soundEnabled: event.target.checked })}
                        />}
                        label={t('routines.gym.sound')}
                    />
                    <FormControlLabel
                        control={<Switch
                            checked={props.preferences.warningEnabled}
                            onChange={event => props.onPreferencesChange({ warningEnabled: event.target.checked })}
                        />}
                        label={t('routines.gym.warning20')}
                    />
                    <FormControlLabel
                        control={<Switch
                            checked={props.preferences.autoAdvance}
                            onChange={event => props.onPreferencesChange({ autoAdvance: event.target.checked })}
                        />}
                        label={t('routines.gym.autoAdvance')}
                    />
                </Stack>
            </Stack>
        </CardContent>
    </Card>;
};
