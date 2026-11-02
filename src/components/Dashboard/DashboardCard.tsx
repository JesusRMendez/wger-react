import { Card, CardActions, CardContent, CardHeader } from "@mui/material";
import { atlas, motion } from "@/theme";
import React from "react";

export interface DashboardCardProps {
    /**
     * Card title displayed in the header
     */
    title: string;

    /**
     * Optional subtitle displayed below the title
     */
    subheader?: string;

    /**
     * Main content of the card
     */
    children: React.ReactNode;

    /**
     * Optional actions to display at the bottom of the card (buttons, icons, etc.)
     */
    actions?: React.ReactNode;

    /**
     * Optional header action (typically an icon button in the top-right)
     */
    headerAction?: React.ReactNode;

    /**
     * Custom height for the content area (default: auto-fills available space)
     * Use this if you need to override the default flex behavior
     */
    contentHeight?: string | number;

    /**
     * Whether the content should scroll when it overflows (default: true)
     */
    scrollable?: boolean;

    /**
     * "dark" renders the card as an ink surface, used for the hero card of the dashboard
     */
    tone?: "default" | "dark";

    /**
     * Additional sx props for the Card component
     */
    cardSx?: React.ComponentProps<typeof Card>["sx"];

    /**
     * Additional sx props for the CardContent component
     */
    contentSx?: React.ComponentProps<typeof CardContent>["sx"];
}

/**
 * DashboardCard - A reusable card component for the configurable dashboard
 *
 * This component handles all the responsive layout logic so individual widgets
 * don't need to worry about flexbox, height calculations, or scrolling.
 *
 * Features:
 * - Automatically fills the grid cell height
 * - Proper scrolling behavior
 * - Consistent styling across all dashboard widgets
 * - Easy to use for future widgets
 *
 * @example
 * ```tsx
 * <DashboardCard
 *   title="My Widget"
 *   subheader="Widget description"
 *   actions={<Button>See Details</Button>}
 * >
 *   <YourContent />
 * </DashboardCard>
 * ```
 */
export const DashboardCard: React.FC<DashboardCardProps> = (
    {
    title,
    subheader,
    children,
    actions,
    headerAction,
    contentHeight,
    scrollable = true,
    tone = "default",
    cardSx = {},
    contentSx = {},
}) => {
    return (
        <Card
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: `border-color 240ms ${motion.easing}, box-shadow 240ms ${motion.easing}`,
                '&:hover': { borderColor: tone === "dark" ? atlas.ink : atlas.line2 },
                ...(tone === "dark" ? {
                    bgcolor: atlas.ink,
                    borderColor: atlas.ink,
                    color: atlas.onInk,
                    '& .MuiCardHeader-subheader': { color: atlas.onInkMuted },
                    '& .MuiButton-text': { color: atlas.onInk, '&:hover': { backgroundColor: 'rgba(255,255,255,.08)' } },
                    '& .MuiIconButton-root': { color: atlas.onInk, '&:hover': { backgroundColor: 'rgba(255,255,255,.08)' } },
                } : {}),
                ...cardSx,
            }}
        >
            {title !== '' && <CardHeader title={title} subheader={subheader} action={headerAction} />}

            <CardContent
                sx={{
                    flexGrow: 1,
                    overflow: scrollable ? "auto" : "visible",
                    minHeight: 0, // Critical for flexbox scrolling
                    // A scrollbar appearing and disappearing changes the width of the charts
                    scrollbarGutter: scrollable ? "stable" : undefined,
                    height: contentHeight,
                    ...contentSx,
                }}
            >
                {children}
            </CardContent>

            {actions && (
                <CardActions
                    sx={{
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                    }}
                >
                    {actions}
                </CardActions>
            )}
        </Card>
    );
};
