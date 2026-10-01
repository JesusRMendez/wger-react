
/*
 * Types of the AI coach API (snake_case, as sent by the server)
 */

export type AiMode = 'server' | 'byo' | 'none';
export type AiProviderName = 'openai' | 'anthropic' | 'none';

export interface CoachUsage {
    month: string,
    input_tokens: number,
    output_tokens: number,
    limit: number | null,
    mode: AiMode,
}

export interface ChatMessage {
    role: 'user' | 'assistant',
    content: string,
}

export interface ChatResponse {
    reply: string,
    usage: { input_tokens: number, output_tokens: number },
}

export interface WorkoutPlanRequest {
    goal_id?: number,
    days_per_week: number,
    minutes_per_session: number,
    location_id?: number,
    notes?: string,
}

export interface ProposalExercise {
    exercise_id: number,
    name: string,
    sets: number,
    reps: number,
    repetition_unit_id: number | null,
    weight_unit_id: number | null,
    weight: number | null,
    rest_seconds: number | null,
    zone?: string | null,
    why?: string | null,
}

export interface WorkoutProposal {
    name: string,
    description: string,
    weeks: number,
    order_rationale?: string | null,
    days: { name: string, exercises: ProposalExercise[] }[],
}

export interface MealPlanRequest {
    kcal_target?: number,
    meals_per_day: number,
    preferences?: string,
}

export interface MealProposal {
    name: string,
    kcal_target: number,
    meals: {
        name: string,
        time?: string | null,
        items: { ingredient_id: number | null, name: string, amount_g: number }[],
    }[],
    totals: { kcal: number, protein: number, carbs: number, fat: number },
}

export interface MealApplyResponse {
    nutrition_plan_id: number,
    skipped?: unknown[],
}

export interface TrainingLocation {
    id: number,
    name: string,
    is_default: boolean,
    equipment: number[],
    available_minutes: number | null,
}

export type GoalKind = 'strength' | 'body_weight' | 'body_fat' | 'habit' | 'nutrition' | 'endurance' | 'steps';
export type GoalPeriod = 'weekly' | 'monthly' | 'quarterly' | 'plan';
export type GoalStatus = 'active' | 'achieved' | 'missed' | 'paused';

export const GOAL_KINDS: GoalKind[] = ['strength', 'body_weight', 'body_fat', 'habit', 'nutrition', 'endurance', 'steps'];
export const GOAL_PERIODS: GoalPeriod[] = ['weekly', 'monthly', 'quarterly', 'plan'];
export const GOAL_STATUSES: GoalStatus[] = ['active', 'achieved', 'missed', 'paused'];

export interface Goal {
    id: number,
    title: string,
    kind: GoalKind,
    period: GoalPeriod,
    indicator: string,
    exercise: number | null,
    target_value: string,
    unit: string,
    baseline_value: string | null,
    current_value: string | null,
    progress_pct: number,
    start_date: string,
    end_date: string,
    status: GoalStatus,
}

export type GoalInput = Partial<Omit<Goal, 'id' | 'current_value' | 'progress_pct'>>;

export interface Indicator {
    key: string,
    label: string,
    value: number,
    unit: string,
    trend?: 'up' | 'down' | 'flat',
    target?: number | null,
    exercise_id?: number,
}

export interface MissingData {
    key: string,
    title: string,
    detail: string,
    action: string | null,
}

export interface IndicatorsResponse {
    window: number,
    indicators: Indicator[],
    data_quality: { score: number, missing: MissingData[] },
}

export interface Recommendation {
    key: string,
    severity: 'info' | 'warning' | 'success',
    title: string,
    detail: string,
    action: string | null,
}

export interface RecommendationsResponse {
    routine: number | null,
    week: number,
    phase: { key: string, name: string, week_from: number, week_to: number | null },
    recommendations: Recommendation[],
}

export type MemoryCategory = 'preference' | 'behavior' | 'constraint' | 'injury';
export const MEMORY_CATEGORIES: MemoryCategory[] = ['preference', 'behavior', 'constraint', 'injury'];

export interface CoachMemory {
    id: number,
    text: string,
    category: MemoryCategory,
    source: 'user' | 'ai' | 'system',
    created: string,
}

export interface CoachAccess {
    id: number,
    user: number,
    username: string,
    server_ai_enabled: boolean,
    granted_by: number | null,
    granted_at: string | null,
    monthly_token_limit: number | null,
    memory_enabled: boolean,
    effective_mode: AiMode,
}

export interface AiProviderSettings {
    provider: AiProviderName,
    model: string,
    api_key?: string,
    has_api_key: boolean,
    api_key_last4: string | null,
}

export interface AiConfig {
    system_prompt: string,
    default_provider: AiProviderName,
    default_model: string,
    skills: { key: string, name: string, description: string, enabled: boolean }[],
    connectors: { key: string, name: string, enabled: boolean }[],
    memory_retention_days: number,
    server_key_configured: boolean,
}

export const ANTHROPIC_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5'];
export const RECOMMENDED_MODEL = 'claude-opus-5-5';
