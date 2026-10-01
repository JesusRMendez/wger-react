/* eslint-disable camelcase */
import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AiProviderName, ANTHROPIC_MODELS, RECOMMENDED_MODEL } from "@/components/Coach/models";
import { useAiProviderQuery, useSaveAiProviderMutation } from "@/components/Coach/queries";
import { WgerContainerFullWidth } from "@/core/ui/Widgets/Container";
import { LoadingWidget } from "@/core/ui/LoadingWidget/LoadingWidget";

export const AiSettingsPage = () => {
    const [t] = useTranslation();
    const query = useAiProviderQuery();
    const save = useSaveAiProviderMutation();

    const [provider, setProvider] = useState<AiProviderName>('none');
    const [model, setModel] = useState('');
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        if (query.data) {
            setProvider(query.data.provider);
            setModel(query.data.model);
        }
    }, [query.data]);

    if (query.isLoading) {
        return <LoadingWidget />;
    }

    const hasKey = query.data?.has_api_key ?? false;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        save.mutate({ provider, model, ...(apiKey !== '' ? { api_key: apiKey } : {}) }, {
            onSuccess: () => setApiKey(''),
        });
    };

    return <WgerContainerFullWidth title={t('coach.settings.title')} maxWidth="sm">
        <Stack component="form" spacing={2} onSubmit={submit}>
            <Typography color="text.secondary">{t('coach.settings.description')}</Typography>
            <TextField select label={t('coach.settings.provider')} size="small" value={provider}
                       onChange={e => setProvider(e.target.value as AiProviderName)}>
                <MenuItem value="none">{t('coach.settings.providerNone')}</MenuItem>
                <MenuItem value="anthropic">Anthropic</MenuItem>
                <MenuItem value="openai">OpenAI</MenuItem>
            </TextField>
            {provider === 'anthropic' && <TextField
                select label={t('coach.settings.model')} size="small" value={model}
                onChange={e => setModel(e.target.value)}>
                {ANTHROPIC_MODELS.map(m => <MenuItem key={m} value={m}>
                    {m}{m === RECOMMENDED_MODEL ? ` (${t('coach.recommended')})` : ''}
                </MenuItem>)}
            </TextField>}
            {provider === 'openai' && <TextField
                label={t('coach.settings.model')} size="small" value={model}
                onChange={e => setModel(e.target.value)} />}
            {provider !== 'none' && <>
                <TextField
                    label={t('coach.settings.apiKey')}
                    type="password"
                    size="small"
                    autoComplete="off"
                    value={apiKey}
                    placeholder={hasKey ? `•••• ${query.data?.api_key_last4 ?? ''}` : ''}
                    helperText={hasKey ? t('coach.settings.keyStored', { last4: query.data?.api_key_last4 ?? '' }) : t('coach.settings.keyWriteOnly')}
                    onChange={e => setApiKey(e.target.value)} />
                {hasKey && <Button color="error" onClick={() => save.mutate({ api_key: '' })}>
                    {t('coach.settings.clearKey')}
                </Button>}
            </>}
            {save.isSuccess && <Alert severity="success">{t('coach.settings.saved')}</Alert>}
            {save.isError && <Alert severity="error">{t('coach.errors.generic')}</Alert>}
            <Button type="submit" variant="contained" disabled={save.isPending}>{t('save')}</Button>
        </Stack>
    </WgerContainerFullWidth>;
};
