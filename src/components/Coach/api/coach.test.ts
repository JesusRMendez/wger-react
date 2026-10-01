import axios from "axios";
import type { Mock } from "vitest";
import {
    applyMealPlan,
    applyWorkoutPlan,
    generateWorkoutPlan,
    getGoals,
    getIndicators,
    getOwnAccess,
    getUsage,
    saveAiProvider,
    sendChat
} from "@/components/Coach/api/coach";

vi.mock("axios");

describe("coach api", () => {
    beforeEach(() => vi.clearAllMocks());

    test("sendChat posts message and history", async () => {
        (axios.post as Mock).mockResolvedValue({ data: { reply: 'hi', usage: { input_tokens: 1, output_tokens: 2 } } });
        const r = await sendChat('hello', [{ role: 'user', content: 'x' }]);
        expect(r.reply).toBe('hi');
        expect((axios.post as Mock).mock.calls[0][0]).toBe('https://example.com/api/v2/coach/chat/');
        expect((axios.post as Mock).mock.calls[0][1]).toEqual({ message: 'hello', history: [{ role: 'user', content: 'x' }] });
    });

    test("getUsage", async () => {
        (axios.get as Mock).mockResolvedValue({ data: { mode: 'server' } });
        expect((await getUsage()).mode).toBe('server');
        expect((axios.get as Mock).mock.calls[0][0]).toBe('https://example.com/api/v2/coach/usage/');
    });

    test("workout plan generate and apply", async () => {
        (axios.post as Mock).mockResolvedValue({ data: { routine_id: 4 } });
        await generateWorkoutPlan({ days_per_week: 3, minutes_per_session: 60 });
        expect((axios.post as Mock).mock.calls[0][0]).toBe('https://example.com/api/v2/coach/workout-plan/');
        const r = await applyWorkoutPlan({ name: 'a', description: '', weeks: 8, days: [] });
        expect(r.routine_id).toBe(4);
        expect((axios.post as Mock).mock.calls[1][0]).toBe('https://example.com/api/v2/coach/workout-plan/apply/');
        expect((axios.post as Mock).mock.calls[1][1].proposal.name).toBe('a');
    });

    test("meal plan apply url", async () => {
        (axios.post as Mock).mockResolvedValue({ data: { nutrition_plan_id: 2 } });
        await applyMealPlan({ name: 'm', kcal_target: 2000, meals: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } });
        expect((axios.post as Mock).mock.calls[0][0]).toBe('https://example.com/api/v2/coach/meal-plan/apply/');
    });

    test("goals and indicators", async () => {
        (axios.get as Mock).mockResolvedValueOnce({ data: { results: [{ id: 1 }] } });
        expect(await getGoals()).toEqual([{ id: 1 }]);
        (axios.get as Mock).mockResolvedValueOnce({ data: { window: 7, indicators: [], data_quality: { score: 1, missing: [] } } });
        await getIndicators(7);
        expect((axios.get as Mock).mock.calls[1][0]).toBe('https://example.com/api/v2/coach-indicators/?window=7');
    });

    test("getOwnAccess picks own record", async () => {
        (axios.get as Mock).mockResolvedValue({ data: { results: [{ username: 'a' }, { username: 'me' }] } });
        expect((await getOwnAccess('me'))?.username).toBe('me');
    });

    test("saveAiProvider patches", async () => {
        (axios.patch as Mock).mockResolvedValue({ data: { provider: 'openai' } });
        await saveAiProvider({ provider: 'openai', api_key: 'k' });
        expect((axios.patch as Mock).mock.calls[0][1]).toEqual({ provider: 'openai', api_key: 'k' });
    });
});
