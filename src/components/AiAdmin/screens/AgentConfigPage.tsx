/* eslint-disable camelcase */
import { Alert, Button, Chip, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAiConfigQuery, useSaveAiConfigMutation } from "@/components/AiAdmin/queries";
import { isForbidden } from "@/components/Coach/errors";
import { AiConfig, AiProviderName, ANTHROPIC_MODELS, RECOMMENDED_MODEL } from "@/components/Coach/models";
import { makeLink, WgerLink } from "@/core/lib/url";
import { LoadingWidget } from "@/core/ui/LoadingWidget/LoadingWidget";
import { WgerContainerFullWidth } from "@/core/ui/Widgets/Container";

export const AgentConfigPage = () => {
    const [t, i18n] = useTranslation();
    const query = useAiConfigQuery();
    const save = useSaveAiConfigMutation();
    const [draft, setDraft] = useState<AiConfig | null>(null);

    useEffect(() => {
        if (query.data) {
            setDraft(query.data);
        }
    }, [query.data]);

    if (query.isLoading || (query.isSuccess && !draft)) {
        return <LoadingWidget />;
    }
    if (query.isError && isForbidden(query.error)) {
        return <Navigate to={makeLink(WgerLink.COACH, i18n.language)} replace />;
    }
    if (query.isError || !draft) {
        return <Alert severity="error">{t('coach.errors.generic')}</Alert>;
    }

    const set = (patch: Partial<AiConfig>) => setDraft({ ...draft, ...patch });
    const isAnthropic = draft.default_provider === 'anthropic';

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        save.mutate({
            system_prompt: draft.system_prompt,
            default_provider: draft.default_provider,
            default_model: draft.default_model,
            skills: draft.skills,
            connectors: draft.connectors,
            memory_retention_days: draft.memory_retention_days,
        });
    };

    return <WgerContainerFullWidth title={t('coach.admin.configTitle')} maxWidth="md">
        <Stack component="form" spacing={3} onSubmit={submit}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography>{t('coach.admin.serverKey')}</Typography>
                <Chip
                    size="small"
                    color={draft.server_key_configured ? 'success' : 'warning'}
                    label={draft.server_key_configured ? t('coach.admin.keyConfigured') : t('coach.admin.keyMissing')} />
            </Stack>

            <TextField
                label={t('coach.admin.systemPrompt')} multiline minRows={6} value={draft.system_prompt}
                onChange={e => set({ system_prompt: e.target.value })} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField select size="small" label={t('coach.settings.provider')} value={draft.default_provider}
                           sx={{ minWidth: 180 }}
                           onChange={e => {
                               const p = e.target.value as AiProviderName;
                               set({ default_provider: p, default_model: p === 'anthropic' ? RECOMMENDED_MODEL : '' });
                           }}>
                    <MenuItem value="anthropic">Anthropic</MenuItem>
                    <MenuItem value="openai">OpenAI</MenuItem>
                    <MenuItem value="none">{t('coach.settings.providerNone')}</MenuItem>
                </TextField>
                {isAnthropic
                    ? <TextField select size="small" label={t('coach.settings.model')} value={draft.default_model}
                                 sx={{ minWidth: 260 }} onChange={e => set({ default_model: e.target.value })}>
                        {ANTHROPIC_MODELS.map(m => <MenuItem key={m} value={m}>
                            {m}{m === RECOMMENDED_MODEL ? ` (${t('coach.recommended')})` : ''}
                        </MenuItem>)}
                    </TextField>
                    : <TextField size="small" label={t('coach.settings.model')} value={draft.default_model}
                                 onChange={e => set({ default_model: e.target.value })} />}
            </Stack>

            <Stack>
                <Typography variant="h6">{t('coach.admin.skills')}</Typography>
                {draft.skills.map((s, i) => <FormControlLabel
                    key={s.key}
                    control={<Switch checked={s.enabled} onChange={e => set({
                        skills: draft.skills.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x),
                    })} />}
                    label={<>{s.name}<Typography variant="caption" color="text.secondary" component="span">
                        {' '}{s.description}
                    </Typography></>} />)}
            </Stack>

            <Stack>
                <Typography variant="h6">{t('coach.admin.connectors')}</Typography>
                {draft.connectors.map((c, i) => <FormControlLabel
                    key={c.key}
                    control={<Switch checked={c.enabled} onChange={e => set({
                        connectors: draft.connectors.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x),
                    })} />}
                    label={c.name} />)}
            </Stack>

            {save.isSuccess && <Alert severity="success">{t('coach.settings.saved')}</Alert>}
            {save.isError && <Alert severity="error">{t('coach.errors.generic')}</Alert>}
            <div><Button type="submit" variant="contained" disabled={save.isPending}>{t('save')}</Button></div>
        </Stack>
    </WgerContainerFullWidth>;
};
