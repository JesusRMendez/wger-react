import { isAxiosError } from "axios";

export type CoachErrorKind = 'not_available' | 'quota_exceeded' | 'forbidden' | 'other';

/*
 * Maps an error of the AI endpoints to a kind we can show a friendly message for
 */
export function coachErrorKind(error: unknown): CoachErrorKind {
    if (!isAxiosError(error) || !error.response) {
        return 'other';
    }
    const code = error.response.data?.code;
    if (error.response.status === 403) {
        return code === 'ai_not_available' ? 'not_available' : 'forbidden';
    }
    if (error.response.status === 429 || code === 'ai_quota_exceeded') {
        return 'quota_exceeded';
    }
    return 'other';
}

export function isForbidden(error: unknown): boolean {
    return isAxiosError(error) && error.response?.status === 403;
}
