import { Stack, Typography } from "@mui/material";
import { NutritionalPlan } from "@/components/Nutrition/models/nutritionalPlan";
import { LinearPlannedLoggedChart } from "@/components/Nutrition/widgets/charts/LinearPlannedLoggedChart";
import { atlas } from "@/theme";
import React from "react";
import { useTranslation } from "react-i18next";


export const PlanSidebar = (props: { plan: NutritionalPlan }) => {
    const [t] = useTranslation();

    const planned = props.plan.plannedNutritionalValues;
    const loggedToday = props.plan.loggedNutritionalValuesToday;
    const percentages = props.plan.percentageValuesLoggedToday;


    return <>
        <Stack direction="column" spacing={1.5}>
            <Typography gutterBottom variant="h6">
                {t('nutrition.goalsTitle')}
            </Typography>

            <LinearPlannedLoggedChart
                title={t('nutrition.protein')}
                color={atlas.protein}
                percentage={percentages.protein}
                logged={loggedToday.protein}
                planned={planned.protein}
            />

            <LinearPlannedLoggedChart
                title={t('nutrition.carbohydrates')}
                color={atlas.carbs}
                percentage={percentages.carbohydrates}
                logged={loggedToday.carbohydrates}
                planned={planned.carbohydrates}
            />

            <LinearPlannedLoggedChart
                title={t('nutrition.fat')}
                color={atlas.fat}
                percentage={percentages.fat}
                logged={loggedToday.fat}
                planned={planned.fat}
            />
        </Stack>
    </>;
};