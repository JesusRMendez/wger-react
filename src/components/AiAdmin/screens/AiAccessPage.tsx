/* eslint-disable camelcase */
import SearchIcon from "@mui/icons-material/Search";
import { Alert, Avatar, Box, Button, Card, Checkbox, Chip, InputAdornment, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useBulkUpdateAccessMutation, useAccessListQuery, useEditAccessMutation } from "@/components/AiAdmin/queries";
import { isForbidden } from "@/components/Coach/errors";
import { CoachAccess } from "@/components/Coach/models";
import { makeLink, WgerLink } from "@/core/lib/url";
import { Numeric } from "@/core/ui/Atlas";
import { atlas, motion } from "@/theme";
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

    const all = query.data ?? [];
    const countBy = (mode: string) => all.filter(a => a.effective_mode === mode).length;
    const stats = [
        { label: t('coach.mode.server'), value: countBy('server') },
        { label: t('coach.mode.byo'), value: countBy('byo') },
        { label: t('coach.mode.none'), value: countBy('none') },
    ];
    const modeChip = (mode: string): 'success' | 'primary' | 'default' =>
        mode === 'server' ? 'success' : mode === 'byo' ? 'primary' : 'default';

    return <WgerContainerFullWidth title={t('coach.admin.accessTitle')}>
        <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                {stats.map(stat => <Box key={stat.label} sx={{ p: 1.5, borderRadius: '14px', bgcolor: atlas.surface, border: `1px solid ${atlas.line}` }}>
                    <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                    <Numeric size={26} sx={{ display: 'block', lineHeight: 1.2 }}>{stat.value}</Numeric>
                </Box>)}
            </Box>
            <Card>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="h5">{t('coach.admin.user')}</Typography>
                        <Chip size="small" label={all.length} />
                    </Stack>
                    <TextField size="small" label={t('coach.admin.search')} value={search} onChange={e => setSearch(e.target.value)}
                               slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
                </Stack>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{
                        mx: 2,
                        mb: 1.5,
                        p: 1.25,
                        borderRadius: '12px',
                        bgcolor: selected.length > 0 ? atlas.ink : atlas.surface2,
                        transition: `background-color 200ms ${motion.easing}`,
                        alignItems: { sm: 'center' },
                    }}
                >
                    <Typography sx={{ flex: 1, fontWeight: 600, fontSize: 13, color: selected.length > 0 ? '#fff' : atlas.ink3, pl: 0.5 }}>
                        {selected.length > 0 ? `${selected.length} / ${rows.length}` : ''}
                    </Typography>
                    <Button variant="contained" size="small" disabled={selected.length === 0 || bulk.isPending} onClick={() => run(true)}
                            sx={selected.length > 0 ? { bgcolor: '#fff', color: atlas.ink, '&:hover': { bgcolor: '#E6EAF2' }, '&.MuiButton-contained': { bgcolor: '#fff', color: atlas.ink } } : undefined}>
                        {t('coach.admin.enableSelected')}
                    </Button>
                    <Button variant="outlined" size="small" disabled={selected.length === 0 || bulk.isPending} onClick={() => run(false)}
                            sx={selected.length > 0 ? { bgcolor: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.3)', '&:hover': { bgcolor: 'rgba(255,255,255,.08)', borderColor: '#fff' } } : undefined}>
                        {t('coach.admin.disableSelected')}
                    </Button>
                </Stack>
                {bulk.isError && <Alert severity="error" sx={{ mx: 2, mb: 1 }}>{t('coach.errors.generic')}</Alert>}
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 640 }}>
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
                            {rows.map(a => <TableRow key={a.id} hover selected={selected.includes(a.user)}>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={selected.includes(a.user)}
                                        slotProps={{ input: { 'aria-label': t('coach.admin.select', { user: a.username }) } }}
                                        onChange={() => toggle(a.user)} />
                                </TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                                        <Avatar sx={{ width: 30, height: 30, bgcolor: atlas.brand, fontSize: 12 }}>
                                            {a.username.slice(0, 2).toUpperCase()}
                                        </Avatar>
                                        <b style={{ fontWeight: 600 }}>{a.username}</b>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Chip size="small" color={a.server_ai_enabled ? 'success' : 'default'}
                                          label={a.server_ai_enabled ? t('coach.admin.enabled') : t('coach.admin.disabled')} />
                                </TableCell>
                                <TableCell><LimitCell access={a} /></TableCell>
                                <TableCell><Chip size="small" color={modeChip(a.effective_mode)} label={t(`coach.mode.${a.effective_mode}`)} /></TableCell>
                            </TableRow>)}
                        </TableBody>
                    </Table>
                </Box>
            </Card>
        </Stack>
    </WgerContainerFullWidth>;
};
