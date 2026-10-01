import { getLanguageByShortName, useLanguageQuery } from "@/components/Exercises";
import { GymSession } from "@/components/Routines/gym/GymSession";
import { buildGymPlan } from "@/components/Routines/gym/gymSession";
import { useGymSave } from "@/components/Routines/gym/useGymSave";
import { getDayName } from "@/components/Routines/models/Day";
import {
    useRoutineDetailQuery,
    useRoutineLogQuery
} from "@/components/Routines/queries";
import { makeLink, WgerLink } from "@/core/lib/url";
import { WgerContainerFullWidth } from "@/core/ui/Widgets/Container";
import { RenderLoadingQuery } from "@/core/ui/Widgets/RenderLoadingQuery";
import { Alert } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

/*
 * Gym mode: trains one day of a routine step by step.
 *
 * Nothing is sent while training. On "Finish" a session is created with the
 * same API calls the log form uses, followed by one log per set done, each with
 * its repetition and weight unit.
 */
export const GymMode = () => {
    const params = useParams<{ routineId: string, dayId: string }>();
    const routineId = parseInt(params.routineId ?? '');
    const dayId = parseInt(params.dayId ?? '');

    if (Number.isNaN(routineId)) {
        return <p>Please pass an integer as the routine id.</p>;
    }
    if (Number.isNaN(dayId)) {
        return <p>Please pass an integer as the day id.</p>;
    }

    return <GymModeLoader routineId={routineId} dayId={dayId} />;
};

const GymModeLoader = ({ routineId, dayId }: { routineId: number, dayId: number }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const routineQuery = useRoutineDetailQuery(routineId);
    const languageQuery = useLanguageQuery();
    // The most recent logs, to show what was done the last time. These are the ones of this routine.
    const logsQuery = useRoutineLogQuery(routineId);
    const language = languageQuery.isSuccess
        ? getLanguageByShortName(i18n.language, languageQuery.data!)
        : undefined;

    const backToUrl = makeLink(WgerLink.ROUTINE_DETAIL, i18n.language, { id: routineId });

    const routine = routineQuery.data;
    const day = routine?.days.find(d => d.id === dayId);
    const plan = routine !== undefined ? buildGymPlan(routine, dayId, new Date()) : undefined;

    const handleFinish = useGymSave(routineId, dayId, plan?.iteration ?? null, () => navigate(backToUrl));

    return <WgerContainerFullWidth
        maxWidth="xl"
        title={day !== undefined ? `${t('routines.gym.title')}: ${getDayName(day)}` : t('routines.gym.title')}
        backToUrl={backToUrl}
        backToTitle={t('routines.backToRoutine')}
    >
        <RenderLoadingQuery
            query={routineQuery}
            child={routineQuery.isSuccess && (plan!.exercises.length === 0
                ? <Alert severity="info">{t('routines.gym.noExercises')}</Alert>
                : <GymSession
                    exercises={plan!.exercises}
                    language={language}
                    previousLogs={logsQuery.data ?? []}
                    routineId={routineId}
                    dayId={dayId}
                    onFinish={handleFinish}
                />)}
        />
    </WgerContainerFullWidth>;
};
