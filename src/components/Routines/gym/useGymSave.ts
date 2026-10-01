import { GymState, toLogEntries } from "@/components/Routines/gym/gymSession";
import { IMPRESSION_NEUTRAL, WorkoutSession } from "@/components/Routines/models/WorkoutSession";
import { useAddRoutineLogsQuery, useAddSessionQuery } from "@/components/Routines/queries";
import { logsPayload } from "@/components/Routines/widgets/forms/sessionLogsFormData";
import { DateTime } from "luxon";
import { useRef } from "react";

/**
 * Saves a finished training (gym mode or guided): a session, then one log per
 * set with its units. A failed save can be tried again, what already made it
 * to the server is remembered so that it is not created twice.
 */
export function useGymSave(routineId: number, dayId: number, iteration: number | null, onSaved: () => void) {
    const addSessionQuery = useAddSessionQuery();
    const addLogsQuery = useAddRoutineLogsQuery(routineId);
    const savedSessionId = useRef<string | null>(null);
    const savedLogs = useRef(0);

    return async (state: GymState) => {
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
            iteration: iteration,
            dayId: dayId,
            routineId: routineId,
            includeEmpty: true,
        });
        while (savedLogs.current < entries.length) {
            await addLogsQuery.mutateAsync([entries[savedLogs.current]]);
            savedLogs.current++;
        }

        onSaved();
    };
}
