import { getLanguageByShortName, useLanguageQuery } from "@/components/Exercises";
import { buildGymPlan } from "@/components/Routines/gym/gymSession";
import { useGymSave } from "@/components/Routines/gym/useGymSave";
import { GuidedRoutine } from "@/components/Routines/guided/GuidedRoutine";
import { getDayName } from "@/components/Routines/models/Day";
import { useRoutineDetailQuery } from "@/components/Routines/queries";
import { makeLink, WgerLink } from "@/core/lib/url";
import { WgerContainerFullWidth } from "@/core/ui/Widgets/Container";
import { RenderLoadingQuery } from "@/core/ui/Widgets/RenderLoadingQuery";
import { Alert } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

/*
 * Guided routine: trains one day of a routine as timed intervals. Like the gym
 * mode, nothing is sent until the user finishes.
 */
export const GuidedMode = () => {
    const params = useParams<{ routineId: string, dayId: string }>();
    const routineId = parseInt(params.routineId ?? '');
    const dayId = parseInt(params.dayId ?? '');

    if (Number.isNaN(routineId)) {
        return <p>Please pass an integer as the routine id.</p>;
    }
    if (Number.isNaN(dayId)) {
        return <p>Please pass an integer as the day id.</p>;
    }

    return <GuidedModeLoader routineId={routineId} dayId={dayId} />;
};

const GuidedModeLoader = ({ routineId, dayId }: { routineId: number, dayId: number }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const routineQuery = useRoutineDetailQuery(routineId);
    const languageQuery = useLanguageQuery();

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
        title={day !== undefined ? `${t('routines.guided.title')}: ${getDayName(day)}` : t('routines.guided.title')}
        backToUrl={backToUrl}
        backToTitle={t('routines.backToRoutine')}
    >
        <RenderLoadingQuery
            query={routineQuery}
            child={routineQuery.isSuccess && (plan!.exercises.length === 0
                ? <Alert severity="info">{t('routines.gym.noExercises')}</Alert>
                : <GuidedRoutine exercises={plan!.exercises} language={language} onFinish={handleFinish} />)}
        />
    </WgerContainerFullWidth>;
};
