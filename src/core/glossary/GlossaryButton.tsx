import { GlossaryDialog } from "@/core/glossary/GlossaryDialog";
import HelpOutlinedIcon from "@mui/icons-material/HelpOutlined";
import { IconButton, Tooltip } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/** The "?" button that opens the glossary */
export const GlossaryButton = () => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return <>
        <Tooltip title={t('glossary.help')}>
            <IconButton aria-label={t('glossary.help')} onClick={() => setOpen(true)}>
                <HelpOutlinedIcon />
            </IconButton>
        </Tooltip>
        <GlossaryDialog open={open} onClose={() => setOpen(false)} />
    </>;
};
