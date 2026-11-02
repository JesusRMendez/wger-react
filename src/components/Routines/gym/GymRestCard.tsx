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
    Stack,
    Switch,
    Typography
} from "@mui/material";
import { Ring } from "@/core/ui/Atlas";
import { atlas, motion, numeric } from "@/theme";
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
    const warning = rest !== null && !isOver && remaining <= 20;
    const restedExercise = findExercise(props.state, rest?.exerciseKey ?? null);

    return <Card>
        <CardHeader title={t('routines.restTime')} />
        <CardContent>
            <Stack spacing={2}>
                <Stack sx={{ alignItems: 'center' }}>
                    <Ring
                        value={rest === null ? 0 : progress / 100}
                        size={160}
                        thickness={10}
                        duration={1000}
                        color={isOver ? atlas.ok : warning ? atlas.warn : atlas.ink}
                    >
                        <Typography
                            component="p"
                            data-testid="rest-countdown"
                            aria-live="off"
                            sx={{
                                ...numeric,
                                m: 0,
                                fontSize: remaining <= 5 && rest !== null && !isOver ? 56 : 40,
                                fontWeight: 600,
                                letterSpacing: '-0.05em',
                                lineHeight: 1,
                                color: isOver ? atlas.okText : warning ? atlas.warnText : atlas.ink,
                                transition: `font-size 200ms ${motion.easing}`,
                            }}
                        >
                            {formatClock(remaining)}
                        </Typography>
                    </Ring>
                </Stack>

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
