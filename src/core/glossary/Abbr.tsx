import { GlossaryTerm, resolveTerm, useGlossaryText } from "@/core/glossary/glossary";
import { GlossaryEntry } from "@/core/glossary/GlossaryEntry";
import { Box, Popover } from "@mui/material";
import React, { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

/*
 * An abbreviation that explains itself: a small chip that opens a popover with
 * what the term is, how it helps and an example.
 *
 * `term` is the id of a glossary entry or the abbreviation itself ("RIR",
 * "1RM"). Something that is not in the glossary is rendered as plain text, so
 * wrapping a value that might be anything never breaks the screen.
 */
export const Abbr = (props: { term: GlossaryTerm | string, children?: ReactNode }) => {
    const { t } = useTranslation();
    const text = useGlossaryText();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const term = resolveTerm(props.term);
    if (term === undefined) {
        return <>{props.children ?? props.term}</>;
    }

    const label = props.children ?? text(term, 'abbr');

    return <>
        <Box
            component="button"
            type="button"
            aria-label={t('glossary.explain', { term: text(term, 'name') })}
            aria-haspopup="dialog"
            onClick={event => setAnchor(event.currentTarget)}
            sx={theme => ({
                font: 'inherit',
                color: 'inherit',
                cursor: 'help',
                background: 'transparent',
                border: 0,
                borderBottom: `1px dotted ${theme.palette.text.secondary}`,
                borderRadius: 0,
                p: 0,
                m: 0,
                '&:hover, &:focus-visible': {
                    color: theme.palette.primary.main,
                    borderBottomColor: theme.palette.primary.main,
                },
            })}
        >
            {label}
        </Box>
        <Popover
            open={anchor !== null}
            anchorEl={anchor}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            slotProps={{ paper: { sx: { maxWidth: 360, p: 2 } } }}
        >
            <GlossaryEntry term={term} />
        </Popover>
    </>;
};
