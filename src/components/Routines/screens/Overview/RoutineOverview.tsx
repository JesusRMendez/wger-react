import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Card, CardActionArea, CardContent, Chip, Divider, ListItem, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import { Numeric } from "@/core/ui/Atlas";
import { atlas, motion } from "@/theme";
import { LoadingPlaceholder } from "@/core/ui/LoadingWidget/LoadingWidget";
import { WgerContainerRightSidebar } from "@/core/ui/Widgets/Container";
import { OverviewEmpty } from "@/core/ui/Widgets/OverviewEmpty";
import { Routine } from "@/components/Routines/models/Routine";
import { AddRoutineFab } from "@/components/Routines/screens/Overview/Fab";
import { useRoutinesShallowQuery } from "@/components/Routines/queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { dateToLocale } from "@/core/lib/date";
import { makeLink, WgerLink } from "@/core/lib/url";

export const RoutineList = (props: {
    routine: Routine,
    linkDestination?: WgerLink,
    showTemplateChip?: boolean,
    showTemplateVisibility?: boolean
}) => {
    const [t, i18n] = useTranslation();

    const showTemplateChip = props.showTemplateChip ?? true;
    const showTemplateVisibility = props.showTemplateVisibility ?? false;

    const destination = props.linkDestination ?? WgerLink.ROUTINE_DETAIL;
    const detailUrl = makeLink(destination, i18n.language, { id: props.routine.id! });

    const primaryText = props.routine.name !== '' ? props.routine.name : t('routines.routine');

    const chipTemplate = props.routine.isTemplate && showTemplateChip
        ? <Chip color="info" size="small" label={t('routines.template')} />
        : null;

    const chipVisibility = props.routine.isTemplate && showTemplateVisibility
        ? <Chip color="info" size="small"
                label={t(props.routine.isPublic ? 'public' : 'private')} />
        : null;


    return <>
        <ListItem sx={{ p: 0 }}>
            <ListItemButton component="a" href={detailUrl}>
                <ListItemText
                    primary={<>{primaryText} {chipTemplate} {chipVisibility}</>}
                    secondary={`${props.routine.durationText} (${dateToLocale(props.routine.start)} - ${dateToLocale(props.routine.end)})`}
                />
                <ChevronRightIcon />
            </ListItemButton>
        </ListItem>
        <Divider component="li" />
    </>;
};

/*
 * A routine as a card of the overview grid: duration chip, name and the dates
 */
export const RoutineTile = (props: { routine: Routine }) => {
    const [t, i18n] = useTranslation();
    const detailUrl = makeLink(WgerLink.ROUTINE_DETAIL, i18n.language, { id: props.routine.id! });
    const primaryText = props.routine.name !== '' ? props.routine.name : t('routines.routine');

    return <Card sx={{ transition: `transform 240ms ${motion.easing}, border-color 240ms ${motion.easing}, box-shadow 240ms ${motion.easing}`,
        '&:hover': { borderColor: atlas.line2, transform: 'translateY(-2px)', boxShadow: '0 1px 2px rgba(13,19,33,.04), 0 12px 32px -12px rgba(13,19,33,.14)' } }}>
        <CardActionArea component="a" href={detailUrl} sx={{ height: '100%' }}>
            <CardContent>
                <Stack spacing={1.5}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Stack direction="row" spacing={0.75}>
                            <Chip size="small" label={props.routine.durationText} />
                            {props.routine.isTemplate && <Chip color="info" size="small" label={t('routines.template')} />}
                        </Stack>
                        <ChevronRightIcon fontSize="small" sx={{ color: atlas.ink3 }} />
                    </Stack>
                    <Typography variant="h6" component="h2" sx={{ fontSize: 16 }}>{primaryText}</Typography>
                    <Numeric size={12} weight={500} sx={{ color: atlas.ink3 }}>
                        {dateToLocale(props.routine.start)} - {dateToLocale(props.routine.end)}
                    </Numeric>
                </Stack>
            </CardContent>
        </CardActionArea>
    </Card>;
};

export const RoutineOverview = () => {
    const routineQuery = useRoutinesShallowQuery();
    const [t] = useTranslation();

    if (routineQuery.isLoading) {
        return <LoadingPlaceholder />;
    }


    return <WgerContainerRightSidebar
        title={t("routines.routines")}
        mainContent={<>
            {routineQuery.data!.length === 0
                ? <OverviewEmpty />
                : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
                    {routineQuery.data!.map(r => <RoutineTile routine={r} key={r.id} />)}
                </Box>}
        </>}
        fab={<AddRoutineFab />}
    />;
};
