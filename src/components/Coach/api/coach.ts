import axios from "axios";
import { ResponseType } from "@/core/api/responseType";
import { makeHeader, makeUrl } from "@/core/lib/url";
import {
    AiProviderSettings,
    ChatMessage,
    ChatResponse,
    CoachAccess,
    CoachMemory,
    CoachUsage,
    Goal,
    GoalInput,
    IndicatorsResponse,
    MealApplyResponse,
    MealPlanRequest,
    MealProposal,
    RecommendationsResponse,
    TrainingLocation,
    WorkoutPlanRequest,
    WorkoutProposal
} from "@/components/Coach/models";

export const COACH_CHAT_PATH = 'coach/chat';
export const COACH_WORKOUT_PLAN_PATH = 'coach/workout-plan';
export const COACH_MEAL_PLAN_PATH = 'coach/meal-plan';
export const COACH_USAGE_PATH = 'coach/usage';
export const COACH_GOAL_PATH = 'coach-goal';
export const COACH_INDICATORS_PATH = 'coach-indicators';
export const COACH_RECOMMENDATIONS_PATH = 'coach-recommendations';
export const COACH_MEMORY_PATH = 'coach-memory';
export const COACH_ACCESS_PATH = 'ai-coach-access';
export const AI_PROVIDER_PATH = 'ai-provider';
export const TRAINING_LOCATION_PATH = 'training-location';

const headers = () => ({ headers: makeHeader() });

export const sendChat = async (message: string, history: ChatMessage[] = []): Promise<ChatResponse> => {
    const { data } = await axios.post<ChatResponse>(makeUrl(COACH_CHAT_PATH), { message, history }, headers());
    return data;
};

export const getUsage = async (): Promise<CoachUsage> => {
    const { data } = await axios.get<CoachUsage>(makeUrl(COACH_USAGE_PATH), headers());
    return data;
};

export const generateWorkoutPlan = async (request: WorkoutPlanRequest): Promise<WorkoutProposal> => {
    const { data } = await axios.post<WorkoutProposal>(makeUrl(COACH_WORKOUT_PLAN_PATH), request, headers());
    return data;
};

export const applyWorkoutPlan = async (proposal: WorkoutProposal): Promise<{ routine_id: number }> => {
    const { data } = await axios.post<{ routine_id: number }>(
        makeUrl(COACH_WORKOUT_PLAN_PATH, { objectMethod: 'apply' }), { proposal }, headers());
    return data;
};

export const generateMealPlan = async (request: MealPlanRequest): Promise<MealProposal> => {
    const { data } = await axios.post<MealProposal>(makeUrl(COACH_MEAL_PLAN_PATH), request, headers());
    return data;
};

export const applyMealPlan = async (proposal: MealProposal): Promise<MealApplyResponse> => {
    const { data } = await axios.post<MealApplyResponse>(
        makeUrl(COACH_MEAL_PLAN_PATH, { objectMethod: 'apply' }), { proposal }, headers());
    return data;
};

export const getTrainingLocations = async (): Promise<TrainingLocation[]> => {
    const { data } = await axios.get<ResponseType<TrainingLocation>>(makeUrl(TRAINING_LOCATION_PATH), headers());
    return data.results;
};

// Goals
export const getGoals = async (): Promise<Goal[]> => {
    const { data } = await axios.get<ResponseType<Goal>>(makeUrl(COACH_GOAL_PATH, { query: { limit: 100 } }), headers());
    return data.results;
};

export const addGoal = async (goal: GoalInput): Promise<Goal> => {
    const { data } = await axios.post<Goal>(makeUrl(COACH_GOAL_PATH), goal, headers());
    return data;
};

export const editGoal = async (id: number, goal: GoalInput): Promise<Goal> => {
    const { data } = await axios.patch<Goal>(makeUrl(COACH_GOAL_PATH, { id }), goal, headers());
    return data;
};

export const deleteGoal = async (id: number): Promise<void> => {
    await axios.delete(makeUrl(COACH_GOAL_PATH, { id }), headers());
};

export const getIndicators = async (window: number): Promise<IndicatorsResponse> => {
    const { data } = await axios.get<IndicatorsResponse>(
        makeUrl(COACH_INDICATORS_PATH, { query: { window } }), headers());
    return data;
};

export const getRecommendations = async (routineId?: number): Promise<RecommendationsResponse> => {
    const { data } = await axios.get<RecommendationsResponse>(
        makeUrl(COACH_RECOMMENDATIONS_PATH, routineId ? { query: { routine: routineId } } : undefined), headers());
    return data;
};

// Memory
export const getMemory = async (): Promise<CoachMemory[]> => {
    const { data } = await axios.get<ResponseType<CoachMemory>>(
        makeUrl(COACH_MEMORY_PATH, { query: { limit: 200 } }), headers());
    return data.results;
};

export const addMemory = async (entry: Pick<CoachMemory, 'text' | 'category'>): Promise<CoachMemory> => {
    const { data } = await axios.post<CoachMemory>(makeUrl(COACH_MEMORY_PATH), entry, headers());
    return data;
};

export const deleteMemory = async (id: number): Promise<void> => {
    await axios.delete(makeUrl(COACH_MEMORY_PATH, { id }), headers());
};

// Access (own record) and provider
export const getOwnAccess = async (username?: string): Promise<CoachAccess | null> => {
    const { data } = await axios.get<ResponseType<CoachAccess>>(makeUrl(COACH_ACCESS_PATH), headers());
    // Managers receive all users, so pick our own record
    return data.results.find(r => r.username === username) ?? data.results[0] ?? null;
};

export const getAiProvider = async (): Promise<AiProviderSettings> => {
    const { data } = await axios.get<AiProviderSettings>(makeUrl(AI_PROVIDER_PATH), headers());
    return data;
};

export const saveAiProvider = async (settings: Partial<AiProviderSettings>): Promise<AiProviderSettings> => {
    const { data } = await axios.patch<AiProviderSettings>(makeUrl(AI_PROVIDER_PATH), settings, headers());
    return data;
};
