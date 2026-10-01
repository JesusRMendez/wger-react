import { AxiosError } from "axios";
import { coachErrorKind, isForbidden } from "@/components/Coach/errors";

const err = (status: number, data: object) => new AxiosError('x', 'E', undefined, undefined, {
    status, data, statusText: '', headers: {}, config: {} as never,
});

describe("coachErrorKind", () => {
    test("maps codes", () => {
        expect(coachErrorKind(err(403, { code: 'ai_not_available' }))).toBe('not_available');
        expect(coachErrorKind(err(429, { code: 'ai_quota_exceeded' }))).toBe('quota_exceeded');
        expect(coachErrorKind(err(403, {}))).toBe('forbidden');
        expect(coachErrorKind(err(500, {}))).toBe('other');
        expect(coachErrorKind(new Error('x'))).toBe('other');
    });
    test("isForbidden", () => {
        expect(isForbidden(err(403, {}))).toBe(true);
        expect(isForbidden(err(404, {}))).toBe(false);
    });
});
