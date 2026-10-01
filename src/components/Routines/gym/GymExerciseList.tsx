import { ExerciseImageAvatar, Language } from "@/components/Exercises";
import {
    canMove,
    doneSetsOf,
    exerciseName,
    GymState,
    isComplete,
    orderedExercises
} from "@/components/Routines/gym/gymSession";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
    Card,
    Chip,
    CardContent,
    CardHeader,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Stack,
} from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";

/*
 * The exercises of the day in the order they are trained, with the sets done.
 * A pending exercise can be made the current one by clicking it and moved up
 * and down; finished ones stay in the list but can't be picked anymore.
 */
export const GymExerciseList = (props: {
    state: GymState,
    language?: Language,
    onSelect: (key: string) => void,
    onMove: (key: string, direction: 'up' | 'down') => void,
    /** The zone of each exercise by key, when a location is known */
    zones?: Record<string, string>,
}) => {
    const { t } = useTranslation();
    const { state } = props;

    return <Card>
        <CardHeader title={t('exercises.exercises')} />
        <CardContent sx={{ p: 0 }}>
            <List disablePadding>
                {orderedExercises(state).map(exercise => {
                    const complete = isComplete(state, exercise.key);
                    const name = exerciseName(exercise, props.language);

                    return <ListItem
                        key={exercise.key}
                        disablePadding
                        secondaryAction={!complete && <Stack direction="row">
                            <IconButton
                                size="small"
                                aria-label={t('routines.gym.moveUp', { name })}
                                disabled={!canMove(state, exercise.key, 'up')}
                                onClick={() => props.onMove(exercise.key, 'up')}
                            >
                                <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                aria-label={t('routines.gym.moveDown', { name })}
                                disabled={!canMove(state, exercise.key, 'down')}
                                onClick={() => props.onMove(exercise.key, 'down')}
                            >
                                <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                        </Stack>}
                    >
                        <ListItemButton
                            selected={exercise.key === state.currentKey}
                            disabled={complete}
                            onClick={() => props.onSelect(exercise.key)}
                            // Room for the two buttons on the right
                            sx={{ pr: complete ? 2 : 11 }}
                        >
                            <ListItemAvatar>
                                <ExerciseImageAvatar image={exercise.exercise.mainImage} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={name}
                                slotProps={{ secondary: { component: 'div' } }}
                                secondary={<>
                                    {t('routines.gym.setsDone', {
                                        done: Math.min(doneSetsOf(state, exercise.key), exercise.nrOfSets),
                                        total: exercise.nrOfSets,
                                    })}
                                    {props.zones?.[exercise.key] !== undefined && <Chip
                                        size="small"
                                        variant="outlined"
                                        label={props.zones[exercise.key]}
                                        sx={{ ml: 1 }}
                                    />}
                                </>}
                            />
                            {complete && <CheckCircleIcon color="success" fontSize="small" />}
                        </ListItemButton>
                    </ListItem>;
                })}
            </List>
        </CardContent>
    </Card>;
};
