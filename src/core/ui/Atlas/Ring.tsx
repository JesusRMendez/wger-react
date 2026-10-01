import { Box } from "@mui/material";
import React, { ReactNode } from "react";
import { atlas, motion } from "@/theme";

type RingProps = {
    /** 0 to 1 (values outside are clamped) */
    value: number;
    size?: number;
    thickness?: number;
    color?: string;
    track?: string;
    /** Content shown in the middle of the ring (usually a figure and a caption) */
    children?: ReactNode;
    label?: string;
    /** Exposes the ring as a progressbar (needs a label) */
    progressbar?: boolean;
    /** Duration of the transition when the value changes */
    duration?: number;
};

/*
 * Progress ring from the boards: round caps, a track in the "surface 3" tone and the
 * figure in the middle. Used for macros/energy, the rest timer and goal progress.
 */
export const Ring = (props: RingProps) => {
    const {
        value,
        size = 112,
        thickness = 9,
        color = atlas.ink,
        track = atlas.surface3,
        duration = 600,
    } = props;
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

    return (
        <Box
            role={props.progressbar ? 'progressbar' : props.label ? 'img' : undefined}
            aria-label={props.label}
            aria-valuemin={props.progressbar ? 0 : undefined}
            aria-valuemax={props.progressbar ? 100 : undefined}
            aria-valuenow={props.progressbar ? Math.round(pct * 100) : undefined}
            sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true"
                 style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - pct)}
                    style={{ transition: `stroke-dashoffset ${duration}ms ${motion.easing}, stroke 300ms ${motion.easing}` }}
                />
            </svg>
            <Box sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
            }}>
                {props.children}
            </Box>
        </Box>
    );
};
