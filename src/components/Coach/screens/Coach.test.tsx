import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Mock } from "vitest";
import * as api from "@/components/Coach/api/coach";
import { CoachPage } from "@/components/Coach/screens/CoachPage";
import { GoalsPage } from "@/components/Coach/screens/GoalsPage";
import { AiSettingsPage } from "@/components/Coach/screens/AiSettingsPage";
import { getTestQueryClient } from "@/tests/queryClient";

vi.mock("@/components/Coach/api/coach");
vi.mock("@/components/Routines/api/workoutUnits", () => ({
    getRoutineRepUnits: vi.fn().mockResolvedValue([{ id: 1, name: 'repetitions' }]),
    getRoutineWeightUnits: vi.fn().mockResolvedValue([{ id: 1, name: 'kg' }]),
}));
vi.mock("@/components/User/api/profile", () => ({ getProfile: vi.fn().mockResolvedValue({ username: 'me' }) }));

const apiError = (status: number, code: string) => new AxiosError('x', 'E', undefined, undefined, {
    status, data: { code }, statusText: '', headers: {}, config: {} as never,
});

const renderPage = (el: React.ReactElement) => render(
    <QueryClientProvider client={getTestQueryClient()}>
        <MemoryRouter initialEntries={['/en/x']}>
            <Routes>
                <Route path="/en/x" element={el} />
                <Route path="/en/routine/:id/view" element={<div>routine-created</div>} />
            </Routes>
        </MemoryRouter>
    </QueryClientProvider>
);

const usage = { month: '2026-10', input_tokens: 100, output_tokens: 50, limit: 1000, mode: 'server' };

describe("CoachPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (api.getUsage as Mock).mockResolvedValue(usage);
        (api.getTrainingLocations as Mock).mockResolvedValue([{ id: 3, name: 'Gym', is_default: true, equipment: [], available_minutes: null }]);
        (api.getGoals as Mock).mockResolvedValue([]);
        (api.getOwnAccess as Mock).mockResolvedValue({ memory_enabled: false });
        (api.getMemory as Mock).mockResolvedValue([]);
    });

    test("shows the mode badge and usage", async () => {
        renderPage(<CoachPage />);
        expect(await screen.findByText('coach.mode.server')).toBeInTheDocument();
        expect(screen.getByText('coach.usage.withLimit')).toBeInTheDocument();
    });

    test("memory hidden when disabled, shown when enabled", async () => {
        renderPage(<CoachPage />);
        await screen.findByText('coach.mode.server');
        await waitFor(() => expect(api.getOwnAccess).toHaveBeenCalled());
        expect(screen.queryByTestId('coach-memory')).not.toBeInTheDocument();
    });

    test("memory add and delete when enabled", async () => {
        (api.getOwnAccess as Mock).mockResolvedValue({ memory_enabled: true });
        (api.getMemory as Mock).mockResolvedValue([{ id: 5, text: 'Bad knee', category: 'injury', source: 'user', created: '' }]);
        (api.addMemory as Mock).mockResolvedValue({});
        (api.deleteMemory as Mock).mockResolvedValue(undefined);
        renderPage(<CoachPage />);
        expect(await screen.findByText('Bad knee')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('coach.memory.text'), { target: { value: 'No jumping' } });
        fireEvent.click(screen.getByText('add'));
        await waitFor(() => expect((api.addMemory as Mock).mock.calls[0][0]).toEqual({ text: 'No jumping', category: 'preference' }));
        fireEvent.click(screen.getByLabelText('delete'));
        await waitFor(() => expect((api.deleteMemory as Mock).mock.calls[0][0]).toBe(5));
    });

    test("chat sends and shows reply", async () => {
        (api.sendChat as Mock).mockResolvedValue({ reply: 'Lift heavy', usage: { input_tokens: 1, output_tokens: 1 } });
        renderPage(<CoachPage />);
        fireEvent.change(screen.getByLabelText('coach.chat.placeholder'), { target: { value: 'Hi coach' } });
        fireEvent.click(screen.getByLabelText('coach.chat.send'));
        expect(await screen.findByText('Lift heavy')).toBeInTheDocument();
        expect((api.sendChat as Mock).mock.calls[0][0]).toBe('Hi coach');
    });

    test("chat shows friendly 403 and 429 messages", async () => {
        (api.sendChat as Mock).mockRejectedValueOnce(apiError(403, 'ai_not_available'));
        renderPage(<CoachPage />);
        fireEvent.change(screen.getByLabelText('coach.chat.placeholder'), { target: { value: 'a' } });
        fireEvent.click(screen.getByLabelText('coach.chat.send'));
        expect(await screen.findByTestId('coach-error-not-available')).toBeInTheDocument();
    });

    test("chat quota error", async () => {
        (api.sendChat as Mock).mockRejectedValueOnce(apiError(429, 'ai_quota_exceeded'));
        renderPage(<CoachPage />);
        fireEvent.change(screen.getByLabelText('coach.chat.placeholder'), { target: { value: 'a' } });
        fireEvent.click(screen.getByLabelText('coach.chat.send'));
        expect(await screen.findByTestId('coach-error-quota')).toBeInTheDocument();
    });

    test("generates a workout plan and applies it", async () => {
        (api.generateWorkoutPlan as Mock).mockResolvedValue({
            name: 'Plan A', description: '', weeks: 8, order_rationale: 'Big lifts first',
            days: [{
                name: 'Push', exercises: [{
                    exercise_id: 1, name: 'Bench press', sets: 4, reps: 8, repetition_unit_id: 1,
                    weight_unit_id: 1, weight: null, rest_seconds: 180, zone: 'Rack', why: 'Chest',
                }]
            }],
        });
        (api.applyWorkoutPlan as Mock).mockResolvedValue({ routine_id: 9 });
        renderPage(<CoachPage />);
        fireEvent.click(screen.getByText('coach.tabs.workout'));
        fireEvent.click(screen.getByText('coach.generate'));
        expect(await screen.findByText('Bench press')).toBeInTheDocument();
        expect(await screen.findByText(/4 × 8 repetitions/)).toBeInTheDocument();
        expect(screen.getByText(/Big lifts first/)).toBeInTheDocument();
        expect((api.generateWorkoutPlan as Mock).mock.calls[0][0]).toEqual({ days_per_week: 3, minutes_per_session: 60 });
        fireEvent.click(screen.getByText('coach.workout.apply'));
        expect(await screen.findByText('routine-created')).toBeInTheDocument();
    });

    test("meal plan with skipped items notice", async () => {
        (api.generateMealPlan as Mock).mockResolvedValue({
            name: 'Meals', kcal_target: 2000,
            meals: [{ name: 'Breakfast', time: '08:00', items: [{ ingredient_id: null, name: 'Oats', amount_g: 80 }] }],
            totals: { kcal: 2000, protein: 100, carbs: 200, fat: 60 },
        });
        (api.applyMealPlan as Mock).mockResolvedValue({ nutrition_plan_id: 3, skipped: [{ name: 'Oats' }] });
        renderPage(<CoachPage />);
        fireEvent.click(screen.getByText('coach.tabs.meal'));
        fireEvent.click(screen.getByText('coach.generate'));
        expect(await screen.findByTestId('meal-proposal')).toBeInTheDocument();
        fireEvent.click(screen.getByText('coach.meal.apply'));
        expect(await screen.findByTestId('meal-applied')).toBeInTheDocument();
        expect(screen.getByText(/coach.meal.skipped/)).toBeInTheDocument();
    });
});

describe("GoalsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (api.getGoals as Mock).mockResolvedValue([{
            id: 1, title: 'Bench 100', kind: 'strength', period: 'weekly', indicator: 'est_1rm', exercise: null,
            target_value: '100', unit: 'kg', baseline_value: '90', current_value: '95', progress_pct: 50,
            start_date: '2026-10-01', end_date: '2026-10-31', status: 'active',
        }]);
        (api.getIndicators as Mock).mockResolvedValue({
            window: 28,
            indicators: [{ key: 'sessions_per_week', label: 'Sessions / week', value: 3.5, unit: '', trend: 'up', target: 4 }],
            data_quality: { score: 56, missing: [{ key: 'rir', title: 'Record RIR', detail: 'd', action: 'log_rir' }] },
        });
        (api.getRecommendations as Mock).mockResolvedValue({
            routine: 7, week: 6, phase: { key: 'progression', name: 'Progression', week_from: 5, week_to: 8 },
            recommendations: [{ key: 'k', severity: 'info', title: 'Deload soon', detail: 'x', action: null }],
        });
    });

    test("renders goals, indicators, quality and phase", async () => {
        renderPage(<GoalsPage />);
        expect(await screen.findByText('Bench 100')).toBeInTheDocument();
        expect(await screen.findByTestId('indicator-sessions_per_week')).toBeInTheDocument();
        expect(screen.getByTitle('coach.indicators.trend.up')).toBeInTheDocument();
        expect(screen.getByText('Record RIR')).toBeInTheDocument();
        expect(screen.getByText('Deload soon')).toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: 'Bench 100' })).toHaveAttribute('aria-valuenow', '50');
        expect(screen.getByText('coach.recommendations.phases.progression').closest('[aria-current]')).toHaveAttribute('aria-current', 'step');
    });

    test("switching period filters goals and window refetches", async () => {
        renderPage(<GoalsPage />);
        await screen.findByText('Bench 100');
        fireEvent.click(screen.getByText('coach.goals.periods.monthly'));
        await waitFor(() => expect(screen.queryByText('Bench 100')).not.toBeInTheDocument());
        fireEvent.click(screen.getAllByText('coach.indicators.days')[0]);
        await waitFor(() => expect((api.getIndicators as Mock).mock.calls.map(c => c[0])).toContain(7));
    });

    test("delete goal", async () => {
        (api.deleteGoal as Mock).mockResolvedValue(undefined);
        renderPage(<GoalsPage />);
        await screen.findByText('Bench 100');
        fireEvent.click(screen.getByLabelText('delete'));
        await waitFor(() => expect((api.deleteGoal as Mock).mock.calls[0][0]).toBe(1));
    });

    test("add goal", async () => {
        (api.addGoal as Mock).mockResolvedValue({});
        renderPage(<GoalsPage />);
        await screen.findByText('Bench 100');
        fireEvent.click(screen.getByText('coach.goals.add'));
        fireEvent.change(screen.getByLabelText(/coach.goals.name/), { target: { value: 'Run' } });
        fireEvent.change(screen.getByLabelText(/coach.goals.target/), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText(/coach.goals.end/), { target: { value: '2026-12-01' } });
        fireEvent.click(screen.getAllByText('save')[0]);
        await waitFor(() => expect(api.addGoal).toHaveBeenCalled());
        expect((api.addGoal as Mock).mock.calls[0][0]).toMatchObject({ title: 'Run', target_value: '5', period: 'weekly' });
    });
});

describe("AiSettingsPage", () => {
    test("shows last4 and clears the key", async () => {
        (api.getAiProvider as Mock).mockResolvedValue({ provider: 'openai', model: 'gpt-x', has_api_key: true, api_key_last4: '1234' });
        (api.saveAiProvider as Mock).mockResolvedValue({});
        renderPage(<AiSettingsPage />);
        const key = await screen.findByLabelText('coach.settings.apiKey');
        expect(key).toHaveAttribute('type', 'password');
        expect(key).toHaveAttribute('placeholder', '•••• 1234');
        fireEvent.click(screen.getByText('coach.settings.clearKey'));
        await waitFor(() => expect((api.saveAiProvider as Mock).mock.calls[0][0]).toEqual({ api_key: '' }));
    });

    test("saves provider, model and new key", async () => {
        (api.getAiProvider as Mock).mockResolvedValue({ provider: 'openai', model: 'gpt-x', has_api_key: false, api_key_last4: null });
        (api.saveAiProvider as Mock).mockResolvedValue({});
        renderPage(<AiSettingsPage />);
        fireEvent.change(await screen.findByLabelText('coach.settings.apiKey'), { target: { value: 'sk-secret' } });
        fireEvent.click(screen.getByText('save'));
        await waitFor(() => expect((api.saveAiProvider as Mock).mock.calls[0][0]).toEqual({ provider: 'openai', model: 'gpt-x', api_key: 'sk-secret' }));
    });
});
