import { GLOSSARY_TERMS, GlossaryTerm, useGlossaryText } from "@/core/glossary/glossary";
import { GlossaryEntry } from "@/core/glossary/GlossaryEntry";
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    TextField,
    Typography
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/** The terms whose abbreviation, name or text contain the search, in glossary order */
export function filterTerms(
    terms: readonly GlossaryTerm[],
    search: string,
    translate: (term: GlossaryTerm, part: 'abbr' | 'name' | 'what' | 'how' | 'example') => string,
): GlossaryTerm[] {
    const needle = search.trim().toLowerCase();
    if (needle === '') {
        return [...terms];
    }
    return terms.filter(term =>
        (['abbr', 'name', 'what', 'how', 'example'] as const)
            .some(part => translate(term, part).toLowerCase().includes(needle))
    );
}

/** The whole glossary, with a search */
export const GlossaryDialog = (props: { open: boolean, onClose: () => void }) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

    const text = useGlossaryText();
    const terms = filterTerms(GLOSSARY_TERMS, search, text);

    return <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>{t('glossary.title')}</DialogTitle>
        <DialogContent dividers>
            <TextField
                label={t('glossary.search')}
                value={search}
                onChange={event => setSearch(event.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
            />
            {terms.length === 0 && <Typography variant="body2">{t('glossary.noResults')}</Typography>}
            {terms.map((term, index) => <Box key={term}>
                {index > 0 && <Divider sx={{ my: 2 }} />}
                <GlossaryEntry term={term} />
            </Box>)}
        </DialogContent>
    </Dialog>;
};
