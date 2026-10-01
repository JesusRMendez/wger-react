import axios from "axios";
import { AiConfig, CoachAccess } from "@/components/Coach/models";
import { ResponseType } from "@/core/api/responseType";
import { makeHeader, makeUrl } from "@/core/lib/url";

export const AI_ACCESS_PATH = 'ai-coach-access';
export const AI_CONFIG_PATH = 'ai-coach-config';

export const getAccessList = async (): Promise<CoachAccess[]> => {
    const results: CoachAccess[] = [];
    let url: string | null = makeUrl(AI_ACCESS_PATH, { query: { limit: 200 } });
    while (url) {
        const { data }: { data: ResponseType<CoachAccess> } = await axios.get(url, { headers: makeHeader() });
        results.push(...data.results);
        url = data.next ? String(data.next) : null;
    }
    return results;
};

export const editAccess = async (id: number, data: Partial<Pick<CoachAccess, 'server_ai_enabled' | 'monthly_token_limit' | 'memory_enabled'>>): Promise<CoachAccess> => {
    const response = await axios.patch<CoachAccess>(makeUrl(AI_ACCESS_PATH, { id }), data, { headers: makeHeader() });
    return response.data;
};

export const bulkUpdateAccess = async (userIds: number[], enabled: boolean): Promise<void> => {
    await axios.post(
        makeUrl(AI_ACCESS_PATH, { objectMethod: 'bulk-update' }),
        { user_ids: userIds, server_ai_enabled: enabled },
        { headers: makeHeader() }
    );
};

export const getAiConfig = async (): Promise<AiConfig> => {
    const { data } = await axios.get<AiConfig>(makeUrl(AI_CONFIG_PATH), { headers: makeHeader() });
    return data;
};

export const saveAiConfig = async (config: Partial<Omit<AiConfig, 'server_key_configured'>>): Promise<AiConfig> => {
    const { data } = await axios.patch<AiConfig>(makeUrl(AI_CONFIG_PATH), config, { headers: makeHeader() });
    return data;
};
