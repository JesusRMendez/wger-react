import { LoadingPlaceholder } from "@/core/ui/LoadingWidget/LoadingWidget";
import { EmptyCard } from "@/components/Dashboard/EmptyCard";
import {
    getDayName,
    Routine,
    RoutineDayData,
    SetConfigData,
    useActiveRoutineQuery
} from "@/components/Routines";
import { getLanguageByShortName, useLanguageQuery } from "@/components/Exercises";
import { isSameDay } from "@/core/lib/date";
import { makeLink, WgerLink } from "@/core/lib/url";
import { Numeric } from "@/core/ui/Atlas";
import { atlas, eyebrow, motion } from "@/theme";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Button, Chip, Collapse, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardCard } from "./DashboardCard";

export const RoutineCard = () => {
    const [t, i18n] = useTranslation();
    const routineQuery = useActiveRoutineQuery();

    if (routineQuery.isLoading) {
        return <LoadingPlaceholder />;
    }

    // The data is null when the user has no routine and undefined when the query failed
    return routineQuery.data ? (
        <RoutineCardContent routine={routineQuery.data} />
    ) : (
        <EmptyCard title={t("routines.routine")} link={makeLink(WgerLink.ROUTINE_ADD, i18n.language)} />
    );
};

/*
 * The day to feature in the hero: today if it is a training day, otherwise the next
 * training day of the current iteration (or the first one)
 */
export const pickFeaturedDay = (days: RoutineDayData[], today: Date = new Date()): RoutineDayData | undefined => {
    const training = days.filter(d => d.day !== null && !d.day.isRest);
    return training.find(d => isSameDay(d.date, today))
        ?? training.find(d => d.date.getTime() > today.getTime())
        ?? training[0];
};

const exerciseName = (setConfig: SetConfigData, language: ReturnType<typeof getLanguageByShortName>, fallback: string) =>
    setConfig.exercise ? setConfig.exercise.getTranslation(language).name : fallback;

const FeaturedDay = (props: { routine: Routine, dayData: RoutineDayData }) => {
    const { t, i18n } = useTranslation();
    const languageQuery = useLanguageQuery();
    const language = languageQuery.isSuccess ? getLanguageByShortName(i18n.language, languageQuery.data!) : undefined;
    const { routine, dayData } = props;
    const isToday = isSameDay(dayData.date, new Date());

    const setConfigs = dayData.slots.flatMap(slot => slot.setConfigs);
    const totalSets = setConfigs.reduce((sum, sc) => sum + (sc.nrOfSets ?? 0), 0);
    const shown = setConfigs.slice(0, 5);

    return (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
                <Typography component="span" sx={{ ...eyebrow, color: atlas.onInkMuted }}>
                    {isToday ? t('dashboard.today') : t('dashboard.next')}
                </Typography>
                {totalSets > 0 && <Chip size="small" label={t('dashboard.setsCount', { count: totalSets })}
                                        sx={{ bgcolor: 'rgba(255,255,255,.1)', color: '#E6EAF2' }} />}
            </Stack>
            <Typography component="h2" sx={{ fontSize: { xs: 26, sm: 30 }, fontWeight: 650, letterSpacing: '-0.035em', lineHeight: 1.1 }}>
                {getDayName(dayData.day)}
            </Typography>
            <Box>
                {shown.map(sc => (
                    <Stack
                        key={`feat-${sc.slotEntryId}-${sc.exerciseId}`}
                        direction={{ xs: 'column', sm: 'row' }}
                        sx={{ justifyContent: 'space-between', gap: { xs: 0.25, sm: 2 }, py: 1.1, borderTop: '1px solid rgba(255,255,255,.08)' }}
                    >
                        <Typography variant="body1" noWrap sx={{ minWidth: 0 }}>
                            {exerciseName(sc, language, t('routines.exerciseNotAvailable'))}
                        </Typography>
                        <Numeric size={13} weight={500} sx={{ color: atlas.onInkMuted, whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>
                            {sc.textRepr}
                        </Numeric>
                    </Stack>
                ))}
                {setConfigs.length > shown.length && (
                    <Typography variant="caption" sx={{ color: atlas.onInkMuted }}>
                        +{setConfigs.length - shown.length}
                    </Typography>
                )}
            </Box>
            {dayData.day?.id !== undefined && dayData.day?.id !== null && (
                <Box>
                    <Button
                        variant="contained"
                        href={makeLink(WgerLink.ROUTINE_GYM_MODE, i18n.language, { id: routine.id!, id2: dayData.day.id })}
                        startIcon={<PlayArrowRoundedIcon />}
                        sx={{
                            bgcolor: '#fff',
                            color: atlas.ink,
                            '&:hover': { bgcolor: '#E6EAF2' },
                            '&.MuiButton-contained': { bgcolor: '#fff', color: atlas.ink },
                        }}
                    >
                        {t('routines.gym.start')}
                    </Button>
                </Box>
            )}
        </Stack>
    );
};

const RoutineCardContent = (props: { routine: Routine }) => {
    const [t, i18n] = useTranslation();
    const days = props.routine.dayDataCurrentIterationFiltered;
    const featured = pickFeaturedDay(days);

    return (
        <DashboardCard
            tone="dark"
            title={t("routines.routine")}
            subheader={props.routine.name ?? "."}
            actions={
                <Button size="small" href={makeLink(WgerLink.ROUTINE_DETAIL, i18n.language, { id: props.routine.id! })}>
                    {t("seeDetails")}
                </Button>
            }
        >
            {featured && <FeaturedDay routine={props.routine} dayData={featured} />}
            <List disablePadding>
                {days.filter(d => d !== featured).map((dayData) => (
                    <DayListItem dayData={dayData} key={`dayDetails-${dayData.date.toISOString()}`} />
                ))}
            </List>
        </DashboardCard>
    );
};

const DayListItem = (props: { dayData: RoutineDayData }) => {
    const { t, i18n } = useTranslation();
    const languageQuery = useLanguageQuery();
    const language = languageQuery.isSuccess ? getLanguageByShortName(i18n.language, languageQuery.data!) : undefined;
    const [expandView, setExpandView] = useState(false);

    const handleToggleExpand = () => setExpandView(!expandView);
    const isToday = isSameDay(props.dayData.date, new Date());

    return (
        <>
            <ListItemButton
                onClick={handleToggleExpand}
                disabled={props.dayData.day === null || props.dayData.day?.isRest}
                sx={{
                    color: atlas.onInk,
                    px: 1,
                    '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
                    '&.Mui-disabled': { opacity: 0.6 },
                }}
            >
                <ListItemIcon sx={{ minWidth: 32, color: atlas.onInkMuted }}>
                    {expandView ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                    primary={getDayName(props.dayData.day)}
                    slotProps={{
                        primary: { sx: { fontSize: 14, fontWeight: 500 } },
                        secondary: { noWrap: true, sx: { color: atlas.onInkMuted, fontSize: 12.5 } },
                    }}
                    secondary={props.dayData.day?.description}
                />
                {isToday && <Chip size="small" label={t('dashboard.today')}
                                  sx={{ bgcolor: 'rgba(255,255,255,.14)', color: '#fff' }} />}
            </ListItemButton>

            <Collapse in={expandView} timeout={motion.lift} unmountOnExit>
                <Box sx={{ pl: 5, pr: 1, pb: 1 }}>
                    {props.dayData.slots.flatMap(slot => slot.setConfigs).map((sc) => (
                        <Stack
                            key={`set-config-${sc.slotEntryId}-${sc.exerciseId}`}
                            direction="row"
                            sx={{ justifyContent: 'space-between', gap: 2, py: 0.6 }}
                        >
                            <Typography variant="body2" noWrap>
                                {exerciseName(sc, language, t('routines.exerciseNotAvailable'))}
                            </Typography>
                            <Numeric size={12} weight={500} sx={{ color: atlas.onInkMuted, whiteSpace: 'nowrap' }}>
                                {sc.textRepr}
                            </Numeric>
                        </Stack>
                    ))}
                </Box>
            </Collapse>
        </>
    );
};
