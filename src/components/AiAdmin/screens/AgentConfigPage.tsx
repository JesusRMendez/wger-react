/* eslint-disable camelcase */
import { Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAiConfigQuery, useSaveAiConfigMutation } from "@/components/AiAdmin/queries";
import { isForbidden } from "@/components/Coach/errors";
import { AiConfig, AiProviderName, ANTHROPIC_MODELS, RECOMMENDED_MODEL } from "@/components/Coach/models";
import { Numeric } from "@/core/ui/Atlas";
import { atlas, fontMono } from "@/theme";
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

    const skillsOn = draft.skills.filter(sk => sk.enabled).length;

    return <WgerContainerFullWidth title={t('coach.admin.configTitle')} maxWidth="lg">
        <Stack component="form" spacing={2} onSubmit={submit}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(12, minmax(0, 1fr))' }, gap: 2 }}>
                <Card sx={{ gridColumn: { md: 'span 7' } }}>
                    <CardContent>
                        <Stack spacing={2}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="h5">{t('coach.admin.systemPrompt')}</Typography>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">{t('coach.admin.serverKey')}</Typography>
                                    <Chip
                                        size="small"
                                        color={draft.server_key_configured ? 'success' : 'warning'}
                                        label={draft.server_key_configured ? t('coach.admin.keyConfigured') : t('coach.admin.keyMissing')} />
                                </Stack>
                            </Stack>
                            <TextField
                                label={t('coach.admin.systemPrompt')} multiline minRows={10} value={draft.system_prompt}
                                onChange={e => set({ system_prompt: e.target.value })}
                                sx={{ '& textarea': { fontFamily: fontMono, fontSize: 12.5, lineHeight: 1.6 } }} />
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
                        </Stack>
                    </CardContent>
                </Card>

                <Card sx={{ gridColumn: { md: 'span 5' } }}>
                    <CardContent>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h5">{t('coach.admin.skills')}</Typography>
                            <Numeric size={12} weight={500} sx={{ color: atlas.ink3 }}>{skillsOn} / {draft.skills.length}</Numeric>
                        </Stack>
                        {draft.skills.map((s, i) => <FormControlLabel
                            key={s.key}
                            labelPlacement="start"
                            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', m: 0, py: 0.75, borderTop: `1px solid ${atlas.line}` }}
                            slotProps={{ typography: { sx: { flex: 1 } } }}
                            control={<Switch checked={s.enabled} onChange={e => set({
                                skills: draft.skills.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x),
                            })} />}
                            label={<Stack><b style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</b><Typography variant="caption" color="text.secondary" component="span">
                                {s.description}
                            </Typography></Stack>} />)}
                    </CardContent>
                </Card>

                <Card sx={{ gridColumn: { md: 'span 12' } }}>
                    <CardContent>
                        <Typography variant="h5" sx={{ mb: 1 }}>{t('coach.admin.connectors')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, columnGap: 3 }}>
                            {draft.connectors.map((c, i) => <FormControlLabel
                                key={c.key}
                                labelPlacement="start"
                                sx={{ display: 'flex', justifyContent: 'space-between', m: 0, py: 0.5, borderTop: `1px solid ${atlas.line}` }}
                                slotProps={{ typography: { sx: { flex: 1 } } }}
                                control={<Switch checked={c.enabled} onChange={e => set({
                                    connectors: draft.connectors.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x),
                                })} />}
                                label={c.name} />)}
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {save.isSuccess && <Alert severity="success">{t('coach.settings.saved')}</Alert>}
            {save.isError && <Alert severity="error">{t('coach.errors.generic')}</Alert>}
            <div><Button type="submit" variant="contained" disabled={save.isPending}>{t('save')}</Button></div>
        </Stack>
    </WgerContainerFullWidth>;
};
