import { Box, BoxProps } from "@mui/material";
import React from "react";
import { numeric } from "@/theme";

/**
 * Renders a figure (weight, reps, kcal, time...) in Geist Mono with tabular numbers
 */
export const Numeric = (props: BoxProps & { size?: number | string; weight?: number }) => {
    const { size, weight = 600, sx, ...rest } = props;
    return <Box
        component="span"
        {...rest}
        sx={{ ...numeric, fontWeight: weight, fontSize: size, ...(sx as object) }}
    />;
};
