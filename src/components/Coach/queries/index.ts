import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addGoal,
    addMemory,
    applyMealPlan,
    applyWorkoutPlan,
    deleteGoal,
    deleteMemory,
    editGoal,
    generateMealPlan,
    generateWorkoutPlan,
    getAiProvider,
    getGoals,
    getIndicators,
    getMemory,
    getOwnAccess,
    getRecommendations,
    getTrainingLocations,
    getUsage,
    saveAiProvider,
    sendChat
} from "@/components/Coach/api/coach";
import { ChatMessage, GoalInput, MealProposal, WorkoutProposal } from "@/components/Coach/models";
import { QueryKey } from "@/core/lib/consts";

export const useCoachUsageQuery = () => useQuery({
    queryKey: [QueryKey.COACH_USAGE],
    queryFn: getUsage,
});

export const useChatMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ message, history }: { message: string, history?: ChatMessage[] }) => sendChat(message, history),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.COACH_USAGE] }),
    });
};

export const useGenerateWorkoutPlanMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: generateWorkoutPlan,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.COACH_USAGE] }),
    });
};

export const useApplyWorkoutPlanMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (proposal: WorkoutProposal) => applyWorkoutPlan(proposal),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QueryKey.ROUTINE_OVERVIEW] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.ROUTINES_ACTIVE] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.ROUTINES_SHALLOW] });
        },
    });
};

export const useGenerateMealPlanMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: generateMealPlan,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.COACH_USAGE] }),
    });
};

export const useApplyMealPlanMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (proposal: MealProposal) => applyMealPlan(proposal),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.NUTRITIONAL_PLANS] }),
    });
};

export const useTrainingLocationsQuery = () => useQuery({
    queryKey: [QueryKey.COACH_LOCATIONS],
    queryFn: getTrainingLocations,
});

// Goals
export const useGoalsQuery = () => useQuery({
    queryKey: [QueryKey.COACH_GOALS],
    queryFn: getGoals,
});

export const useAddGoalMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (goal: GoalInput) => addGoal(goal),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.COACH_GOALS] }),
    });
};

export const useEditGoalMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, goal }: { id: number, goal: GoalInput }) => editGoal(id, goal),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.COACH_GOALS] }),
    });
};

export const useDeleteGoalMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteGoal(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.COACH_GOALS] }),
    });
};

export const useIndicatorsQuery = (window: number) => useQuery({
    queryKey: [QueryKey.COACH_INDICATORS, window],
    queryFn: () => getIndicators(window),
});

export const useRecommendationsQuery = (routineId?: number) => useQuery({
    queryKey: [QueryKey.COACH_RECOMMENDATIONS, routineId ?? null],
    queryFn: () => getRecommendations(routineId),
});

// Memory
export const useMemoryQuery = (enabled = true) => useQuery({
    queryKey: [QueryKey.COACH_MEMORY],
    queryFn: getMemory,
    enabled,
});

export const useAddMemoryMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addMemory,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.COACH_MEMORY] }),
    });
};

export const useDeleteMemoryMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteMemory(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.COACH_MEMORY] }),
    });
};

// Access and provider
export const useOwnAccessQuery = (username?: string) => useQuery({
    queryKey: [QueryKey.COACH_ACCESS, username ?? null],
    queryFn: () => getOwnAccess(username),
});

export const useAiProviderQuery = () => useQuery({
    queryKey: [QueryKey.AI_PROVIDER],
    queryFn: getAiProvider,
});

export const useSaveAiProviderMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveAiProvider,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QueryKey.AI_PROVIDER] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.COACH_USAGE] });
        },
    });
};
