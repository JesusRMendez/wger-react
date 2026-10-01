import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Chip, IconButton, List, ListItem, ListItemText, MenuItem, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { MEMORY_CATEGORIES, MemoryCategory } from "@/components/Coach/models";
import {
    useAddMemoryMutation,
    useDeleteMemoryMutation,
    useMemoryQuery,
    useOwnAccessQuery
} from "@/components/Coach/queries";
import { useProfileQuery } from "@/components/User";

/*
 * The things the coach remembers about the user. Only shown if the memory is
 * enabled for the account.
 */
export const MemorySection = () => {
    const profile = useProfileQuery();
    const access = useOwnAccessQuery(profile.data?.username);
    if (!access.data?.memory_enabled) {
        return null;
    }
    return <MemoryList />;
};

export const MemoryList = () => {
    const [t] = useTranslation();
    const query = useMemoryQuery();
    const addMutation = useAddMemoryMutation();
    const deleteMutation = useDeleteMemoryMutation();
    const [text, setText] = useState('');
    const [category, setCategory] = useState<MemoryCategory>('preference');

    const add = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) {
            return;
        }
        addMutation.mutate({ text: text.trim(), category }, { onSuccess: () => setText('') });
    };

    return <Stack spacing={2} data-testid="coach-memory">
        <Typography variant="h5">{t('coach.memory.title')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('coach.memory.description')}</Typography>
        <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} onSubmit={add}>
            <TextField
                fullWidth size="small" label={t('coach.memory.text')} value={text}
                onChange={e => setText(e.target.value)} />
            <TextField
                select size="small" label={t('coach.memory.category')} value={category} sx={{ minWidth: 160 }}
                onChange={e => setCategory(e.target.value as MemoryCategory)}>
                {MEMORY_CATEGORIES.map(c => <MenuItem key={c} value={c}>{t(`coach.memory.categories.${c}`)}</MenuItem>)}
            </TextField>
            <Button type="submit" variant="contained" disabled={addMutation.isPending}>{t('add')}</Button>
        </Stack>
        {(query.data ?? []).length === 0 && !query.isLoading &&
            <Typography color="text.secondary">{t('coach.memory.empty')}</Typography>}
        <List>
            {(query.data ?? []).map(m => <ListItem
                key={m.id}
                secondaryAction={<IconButton aria-label={t('delete')} onClick={() => deleteMutation.mutate(m.id)}>
                    <DeleteIcon />
                </IconButton>}>
                <ListItemText
                    primary={m.text}
                    secondary={<Chip size="small" label={t(`coach.memory.categories.${m.category}`)} />} />
            </ListItem>)}
        </List>
    </Stack>;
};
