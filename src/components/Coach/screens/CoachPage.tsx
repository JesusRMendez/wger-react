import { Box, Stack, Tab, Tabs } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChatPanel } from "@/components/Coach/widgets/ChatPanel";
import { MealPlanGenerator } from "@/components/Coach/widgets/MealPlanGenerator";
import { MemorySection } from "@/components/Coach/widgets/MemoryList";
import { ModeBadge } from "@/components/Coach/widgets/ModeBadge";
import { WorkoutPlanGenerator } from "@/components/Coach/widgets/WorkoutPlanGenerator";
import { WgerContainerFullWidth } from "@/core/ui/Widgets/Container";
import { makeLink, WgerLink } from "@/core/lib/url";

export const CoachPage = () => {
    const [t, i18n] = useTranslation();
    const [tab, setTab] = useState(0);

    return <WgerContainerFullWidth title={t('coach.title')} maxWidth="md">
        <Stack spacing={3}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <ModeBadge />
                <Stack direction="row" spacing={2}>
                    <Link to={makeLink(WgerLink.COACH_GOALS, i18n.language)}>{t('coach.goalsLink')}</Link>
                    <Link to={makeLink(WgerLink.COACH_SETTINGS, i18n.language)}>{t('coach.settingsLink')}</Link>
                </Stack>
            </Stack>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
                <Tab label={t('coach.tabs.chat')} />
                <Tab label={t('coach.tabs.workout')} />
                <Tab label={t('coach.tabs.meal')} />
            </Tabs>
            <Box>
                {tab === 0 && <ChatPanel />}
                {tab === 1 && <WorkoutPlanGenerator />}
                {tab === 2 && <MealPlanGenerator />}
            </Box>

            <MemorySection />
        </Stack>
    </WgerContainerFullWidth>;
};
