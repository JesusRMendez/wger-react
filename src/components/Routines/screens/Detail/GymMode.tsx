import { getLanguageByShortName, useLanguageQuery } from "@/components/Exercises";
import { GymSession } from "@/components/Routines/gym/GymSession";
import { buildGymPlan, GymState, toLogEntries } from "@/components/Routines/gym/gymSession";
import { getDayName } from "@/components/Routines/models/Day";
import { IMPRESSION_NEUTRAL, WorkoutSession } from "@/components/Routines/models/WorkoutSession";
import {
    useAddRoutineLogsQuery,
    useAddSessionQuery,
    useRoutineDetailQuery,
    useRoutineLogQuery
} from "@/components/Routines/queries";
import { logsPayload } from "@/components/Routines/widgets/forms/sessionLogsFormData";
import { makeLink, WgerLink } from "@/core/lib/url";
import { WgerContainerFullWidth } from "@/core/ui/Widgets/Container";
import { RenderLoadingQuery } from "@/core/ui/Widgets/RenderLoadingQuery";
import { Alert } from "@mui/material";
import { DateTime } from "luxon";
import React, { useRef } from "react";
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
    const addSessionQuery = useAddSessionQuery();
    const addLogsQuery = useAddRoutineLogsQuery(routineId);

    // A failed save can be tried again: what already made it to the server is
    // remembered so that it is not created twice
    const savedSessionId = useRef<string | null>(null);
    const savedLogs = useRef(0);

    const language = languageQuery.isSuccess
        ? getLanguageByShortName(i18n.language, languageQuery.data!)
        : undefined;

    const backToUrl = makeLink(WgerLink.ROUTINE_DETAIL, i18n.language, { id: routineId });

    const routine = routineQuery.data;
    const day = routine?.days.find(d => d.id === dayId);
    const plan = routine !== undefined ? buildGymPlan(routine, dayId, new Date()) : undefined;

    const handleFinish = async (state: GymState) => {
        const end = new Date();

        if (savedSessionId.current === null) {
            const session = await addSessionQuery.mutateAsync(new WorkoutSession({
                id: null,
                dayId: dayId,
                routineId: routineId,
                datetimeStart: new Date(state.startedAt),
                datetimeEnd: end,
                notes: '',
                impression: IMPRESSION_NEUTRAL,
            }));
            savedSessionId.current = session.id;
        }

        const entries = logsPayload(toLogEntries(state), {
            date: DateTime.fromJSDate(end),
            sessionId: savedSessionId.current,
            iteration: plan?.iteration ?? null,
            dayId: dayId,
            routineId: routineId,
            // A set trained until failure may have no number to enter
            includeEmpty: true,
        });
        while (savedLogs.current < entries.length) {
            await addLogsQuery.mutateAsync([entries[savedLogs.current]]);
            savedLogs.current++;
        }

        navigate(backToUrl);
    };

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
                    onFinish={handleFinish}
                />)}
        />
    </WgerContainerFullWidth>;
};
