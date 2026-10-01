import { Box, Button, Card, CardContent, CardHeader, Chip, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { WgerContainerRightSidebar } from "@/core/ui/Widgets/Container";
import { RenderLoadingQuery } from "@/core/ui/Widgets/RenderLoadingQuery";
import { MuscleOverview } from "@/components/Muscles/MuscleOverview";
import { useRoutineDetailQuery } from "@/components/Routines/queries";
import { RoutineDetailDropdown } from "@/components/Routines/widgets/RoutineDetailDropdown";
import { DayDetailsCard } from "@/components/Routines/widgets/RoutineDetailsCard";
import { GlossaryButton } from "@/core/glossary";
import i18n from "@/i18n";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { dateToLocale } from "@/core/lib/date";
import { makeLink, WgerLink } from "@/core/lib/url";

export const RoutineDetail = () => {
    const { t } = useTranslation();
    const params = useParams<{ routineId: string }>();
    const routineId = parseInt(params.routineId ?? '');
    if (Number.isNaN(routineId)) {
        return <p>Please pass an integer as the routine id.</p>;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const routineQuery = useRoutineDetailQuery(routineId);

    const routine = routineQuery.data;
    const subtitle = routine !== undefined ? `${dateToLocale(routine!.start)} - ${dateToLocale(routine!.end)} (${routine?.durationText})` : '';
    const chip = routine?.isTemplate
        ? <Chip color="info" size="small" label={t('routines.template')} />
        : null;

    return <RenderLoadingQuery
        query={routineQuery}
        child={routineQuery.isSuccess
            && <WgerContainerRightSidebar
                title={<>{routine!.name} {chip}</>}
                subTitle={subtitle}
                optionsMenu={<Stack direction="row"><GlossaryButton /><RoutineDetailDropdown routine={routineQuery.data!} /></Stack>}
                mainContent={
                    <Stack spacing={2}>

                        {routine!.description !== ''
                            && <Typography variant={"body2"} sx={{ whiteSpace: 'pre-line' }}>
                                {routine?.description}
                            </Typography>
                        }

                        {routine!.isTemplate && <Button
                            component="a"
                            href={makeLink(WgerLink.ROUTINE_COPY, i18n.language, { id: routineId })}
                            variant={"contained"}
                        >{t('routines.copyAndUseTemplate')}</Button>}
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(auto-fill, minmax(380px, 1fr))' },
                            gap: 2,
                            alignItems: 'start',
                        }}>
                            {routine!.daysCurrentIteration.map(({ day, dayData }) =>
                                <DayDetailsCard
                                    routineId={routineId}
                                    day={day}
                                    dayData={dayData}
                                    key={`dayDetails-${day.id}`}
                                    readOnly={routine!.isTemplate}
                                />
                            )}
                        </Box>
                    </Stack>
                }
                sideBar={(routine!.mainMuscles.length + routine!.secondaryMuscles.length) === 0 ? undefined :
                    <Card>
                        <CardHeader title={t('routines.muscles')} subheader={t('routines.musclesHint')} />
                        <CardContent>
                        <Grid container>
                            <Grid size={6}>
                                <MuscleOverview
                                    primaryMuscles={routine!.mainMuscles.filter(m => m.isFront)}
                                    secondaryMuscles={routine!.secondaryMuscles.filter(m => m.isFront)}
                                    isFront={true}
                                />
                            </Grid>
                            <Grid size={6}>
                                <MuscleOverview
                                    primaryMuscles={routine!.mainMuscles.filter(m => !m.isFront)}
                                    secondaryMuscles={routine!.secondaryMuscles.filter(m => !m.isFront)}
                                    isFront={false}
                                />
                            </Grid>
                        </Grid>
                        </CardContent>
                    </Card>
                }
            />}
    />;
};