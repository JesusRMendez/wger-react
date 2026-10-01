import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Mock } from "vitest";
import * as api from "@/components/AiAdmin/api/aiAdmin";
import { AgentConfigPage } from "@/components/AiAdmin/screens/AgentConfigPage";
import { AiAccessPage } from "@/components/AiAdmin/screens/AiAccessPage";
import { getTestQueryClient } from "@/tests/queryClient";

vi.mock("@/components/AiAdmin/api/aiAdmin");

const forbidden = new AxiosError('x', 'E', undefined, undefined, {
    status: 403, data: {}, statusText: '', headers: {}, config: {} as never,
});

const renderPage = (el: React.ReactElement) => render(
    <QueryClientProvider client={getTestQueryClient()}>
        <MemoryRouter initialEntries={['/en/admin']}>
            <Routes>
                <Route path="/en/admin" element={el} />
                <Route path="/en/coach" element={<div>coach-home</div>} />
            </Routes>
        </MemoryRouter>
    </QueryClientProvider>
);

const access = (id: number, username: string, enabled = false) => ({
    id, user: id + 100, username, server_ai_enabled: enabled, granted_by: null, granted_at: null,
    monthly_token_limit: null, memory_enabled: false, effective_mode: enabled ? 'server' : 'none',
});

describe("AiAccessPage", () => {
    test("redirects non managers on 403", async () => {
        (api.getAccessList as Mock).mockRejectedValue(forbidden);
        renderPage(<AiAccessPage />);
        expect(await screen.findByText('coach-home')).toBeInTheDocument();
    });

    test("search, bulk enable and limit edit", async () => {
        (api.getAccessList as Mock).mockResolvedValue([access(1, 'alice'), access(2, 'bob', true)]);
        (api.bulkUpdateAccess as Mock).mockResolvedValue(undefined);
        (api.editAccess as Mock).mockResolvedValue({});
        renderPage(<AiAccessPage />);
        expect(await screen.findByText('alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('coach.admin.search'), { target: { value: 'ali' } });
        expect(screen.queryByText('bob')).not.toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('coach.admin.select'));
        fireEvent.click(screen.getByText('coach.admin.enableSelected'));
        await waitFor(() => expect((api.bulkUpdateAccess as Mock).mock.calls[0].slice(0, 2)).toEqual([[101], true]));

        fireEvent.change(screen.getByLabelText('coach.admin.limitFor'), { target: { value: '5000' } });
        fireEvent.click(screen.getByText('save'));
        await waitFor(() => expect(api.editAccess).toHaveBeenCalledWith(1, { monthly_token_limit: 5000 }));
    });
});

describe("AgentConfigPage", () => {
    const config = {
        system_prompt: 'You are a coach', default_provider: 'anthropic', default_model: 'claude-opus-5-5',
        skills: [{ key: 'periodization', name: 'Periodization', description: 'd', enabled: true }],
        connectors: [{ key: 'weight', name: 'Weight', enabled: true }],
        memory_retention_days: 180, server_key_configured: true,
    };

    test("shows key indicator and saves edits", async () => {
        (api.getAiConfig as Mock).mockResolvedValue(config);
        (api.saveAiConfig as Mock).mockResolvedValue(config);
        renderPage(<AgentConfigPage />);
        expect(await screen.findByText('coach.admin.keyConfigured')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('coach.admin.systemPrompt'), { target: { value: 'New prompt' } });
        fireEvent.click(screen.getByLabelText(/Periodization/));
        fireEvent.click(screen.getByLabelText('Weight'));
        fireEvent.click(screen.getByText('save'));
        await waitFor(() => expect(api.saveAiConfig).toHaveBeenCalled());
        const sent = (api.saveAiConfig as Mock).mock.calls[0][0];
        expect(sent.system_prompt).toBe('New prompt');
        expect(sent.skills[0].enabled).toBe(false);
        expect(sent.connectors[0].enabled).toBe(false);
        expect(sent.default_model).toBe('claude-opus-5-5');
        expect(sent).not.toHaveProperty('server_key_configured');
    });

    test("redirects on 403", async () => {
        (api.getAiConfig as Mock).mockRejectedValue(forbidden);
        renderPage(<AgentConfigPage />);
        expect(await screen.findByText('coach-home')).toBeInTheDocument();
    });
});
