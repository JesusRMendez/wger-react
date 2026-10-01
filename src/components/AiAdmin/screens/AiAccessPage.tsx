/* eslint-disable camelcase */
import { Alert, Box, Button, Checkbox, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useBulkUpdateAccessMutation, useAccessListQuery, useEditAccessMutation } from "@/components/AiAdmin/queries";
import { isForbidden } from "@/components/Coach/errors";
import { CoachAccess } from "@/components/Coach/models";
import { makeLink, WgerLink } from "@/core/lib/url";
import { LoadingWidget } from "@/core/ui/LoadingWidget/LoadingWidget";
import { WgerContainerFullWidth } from "@/core/ui/Widgets/Container";

const LimitCell = ({ access }: { access: CoachAccess }) => {
    const [t] = useTranslation();
    const edit = useEditAccessMutation();
    const [value, setValue] = useState(access.monthly_token_limit?.toString() ?? '');
    const changed = value !== (access.monthly_token_limit?.toString() ?? '');

    return <Stack direction="row" spacing={1}>
        <TextField
            size="small" type="number" value={value} sx={{ width: 140 }}
            placeholder={t('coach.admin.unlimited')}
            slotProps={{ htmlInput: { 'aria-label': t('coach.admin.limitFor', { user: access.username }) } }}
            onChange={e => setValue(e.target.value)} />
        {changed && <Button size="small" onClick={() => edit.mutate({
            id: access.id,
            data: { monthly_token_limit: value === '' ? null : Number(value) },
        })}>{t('save')}</Button>}
    </Stack>;
};

export const AiAccessPage = () => {
    const [t, i18n] = useTranslation();
    const query = useAccessListQuery();
    const bulk = useBulkUpdateAccessMutation();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<number[]>([]);

    if (query.isLoading) {
        return <LoadingWidget />;
    }
    // Only managers may see this page
    if (query.isError && isForbidden(query.error)) {
        return <Navigate to={makeLink(WgerLink.COACH, i18n.language)} replace />;
    }
    if (query.isError) {
        return <Alert severity="error">{t('coach.errors.generic')}</Alert>;
    }

    const rows = (query.data ?? []).filter(a => a.username.toLowerCase().includes(search.toLowerCase()));
    const allSelected = rows.length > 0 && rows.every(r => selected.includes(r.user));
    const toggle = (user: number) => setSelected(s => s.includes(user) ? s.filter(x => x !== user) : [...s, user]);
    const run = (enabled: boolean) => bulk.mutate({ userIds: selected, enabled }, { onSuccess: () => setSelected([]) });

    return <WgerContainerFullWidth title={t('coach.admin.accessTitle')}>
        <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField size="small" label={t('coach.admin.search')} value={search} onChange={e => setSearch(e.target.value)} />
                <Button variant="contained" disabled={selected.length === 0 || bulk.isPending} onClick={() => run(true)}>
                    {t('coach.admin.enableSelected')}
                </Button>
                <Button variant="outlined" disabled={selected.length === 0 || bulk.isPending} onClick={() => run(false)}>
                    {t('coach.admin.disableSelected')}
                </Button>
            </Stack>
            {bulk.isError && <Alert severity="error">{t('coach.errors.generic')}</Alert>}
            <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    checked={allSelected}
                                    slotProps={{ input: { 'aria-label': t('coach.admin.selectAll') } }}
                                    onChange={() => setSelected(allSelected ? [] : rows.map(r => r.user))} />
                            </TableCell>
                            <TableCell>{t('coach.admin.user')}</TableCell>
                            <TableCell>{t('coach.admin.serverAi')}</TableCell>
                            <TableCell>{t('coach.admin.tokenLimit')}</TableCell>
                            <TableCell>{t('coach.admin.effectiveMode')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(a => <TableRow key={a.id}>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    checked={selected.includes(a.user)}
                                    slotProps={{ input: { 'aria-label': t('coach.admin.select', { user: a.username }) } }}
                                    onChange={() => toggle(a.user)} />
                            </TableCell>
                            <TableCell>{a.username}</TableCell>
                            <TableCell>{a.server_ai_enabled ? t('coach.admin.enabled') : t('coach.admin.disabled')}</TableCell>
                            <TableCell><LimitCell access={a} /></TableCell>
                            <TableCell>{t(`coach.mode.${a.effective_mode}`)}</TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
            </Box>
        </Stack>
    </WgerContainerFullWidth>;
};
