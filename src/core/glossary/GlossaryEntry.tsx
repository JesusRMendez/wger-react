import { GlossaryTerm, useGlossaryText } from "@/core/glossary/glossary";
import { Stack, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";

/** One glossary entry: the name, what it is, how it helps and an example */
export const GlossaryEntry = (props: { term: GlossaryTerm }) => {
    const { t } = useTranslation();
    const text = useGlossaryText();
    const { term } = props;

    return <Stack spacing={1} data-testid={`glossary-entry-${term}`}>
        <Typography variant="subtitle1" component="h3">
            {text(term, 'abbr')}
            {text(term, 'abbr') !== text(term, 'name') && ` – ${text(term, 'name')}`}
        </Typography>
        <div>
            <Typography variant="caption" color="text.secondary">{t('glossary.whatItIs')}</Typography>
            <Typography variant="body2">{text(term, 'what')}</Typography>
        </div>
        <div>
            <Typography variant="caption" color="text.secondary">{t('glossary.howItHelps')}</Typography>
            <Typography variant="body2">{text(term, 'how')}</Typography>
        </div>
        <div>
            <Typography variant="caption" color="text.secondary">{t('glossary.example')}</Typography>
            <Typography variant="body2">{text(term, 'example')}</Typography>
        </div>
    </Stack>;
};
