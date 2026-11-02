import { Box, Stack, Typography } from "@mui/material";
import React from "react";
import { Numeric } from "@/core/ui/Atlas/Numeric";
import { atlas, motion } from "@/theme";

type MacroBarProps = {
    label: string;
    color: string;
    /** Text shown at the right, e.g. "62 / 160 g" */
    value: string;
    /** 0 to 100 */
    percent: number;
};

/*
 * A label with a coloured dot, the figures at the right and a thin progress bar.
 * The colour is never the only carrier of the meaning: the label is always there.
 */
export const MacroBar = (props: MacroBarProps) => {
    const pct = Math.max(0, Math.min(100, Number.isFinite(props.percent) ? props.percent : 0));
    return (
        <Stack spacing={0.5}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', columnGap: 1, flexWrap: 'wrap' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: props.color, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ lineHeight: 1.25 }}>{props.label}</Typography>
                </Stack>
                <Numeric size={12} weight={500} sx={{ color: atlas.ink3, whiteSpace: 'nowrap' }}>{props.value}</Numeric>
            </Stack>
            <Box sx={{ height: 6, borderRadius: 999, bgcolor: atlas.surface3, overflow: 'hidden' }}
                 role="progressbar" aria-label={props.label} aria-valuemin={0} aria-valuemax={100}
                 aria-valuenow={Math.round(pct)}>
                <Box sx={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 999,
                    bgcolor: props.color,
                    transition: `width 600ms ${motion.easing}`,
                }} />
            </Box>
        </Stack>
    );
};
