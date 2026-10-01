import { Stack } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { GoalsSection } from "@/components/Coach/widgets/GoalsSection";
import { IndicatorsSection } from "@/components/Coach/widgets/IndicatorsSection";
import { RecommendationsCard } from "@/components/Coach/widgets/RecommendationsCard";
import { WgerContainerFullWidth } from "@/core/ui/Widgets/Container";

export const GoalsPage = () => {
    const [t] = useTranslation();

    return <WgerContainerFullWidth title={t('coach.goalsPage.title')} maxWidth="lg">
        <Stack spacing={4}>
            <GoalsSection />
            <RecommendationsCard />
            <IndicatorsSection />
        </Stack>
    </WgerContainerFullWidth>;
};
