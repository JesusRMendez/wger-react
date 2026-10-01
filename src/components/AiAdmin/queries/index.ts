import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkUpdateAccess, editAccess, getAccessList, getAiConfig, saveAiConfig } from "@/components/AiAdmin/api/aiAdmin";
import { AiConfig, CoachAccess } from "@/components/Coach/models";
import { QueryKey } from "@/core/lib/consts";

export const useAccessListQuery = () => useQuery({
    queryKey: [QueryKey.AI_ACCESS_ADMIN],
    queryFn: getAccessList,
    retry: false,
});

export const useEditAccessMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<Pick<CoachAccess, 'server_ai_enabled' | 'monthly_token_limit' | 'memory_enabled'>> }) =>
            editAccess(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.AI_ACCESS_ADMIN] }),
    });
};

export const useBulkUpdateAccessMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userIds, enabled }: { userIds: number[], enabled: boolean }) => bulkUpdateAccess(userIds, enabled),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.AI_ACCESS_ADMIN] }),
    });
};

export const useAiConfigQuery = () => useQuery({
    queryKey: [QueryKey.AI_CONFIG],
    queryFn: getAiConfig,
});

export const useSaveAiConfigMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (config: Partial<Omit<AiConfig, 'server_key_configured'>>) => saveAiConfig(config),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.AI_CONFIG] }),
    });
};
