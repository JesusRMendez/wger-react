import { Stack, Typography } from "@mui/material";
import { NutritionalValues } from "@/components/Nutrition/helpers/nutritionalValues";
import { LinearPlannedLoggedChart } from "@/components/Nutrition/widgets/charts/LinearPlannedLoggedChart";
import { Numeric, Ring } from "@/core/ui/Atlas";
import { atlas } from "@/theme";
import React from 'react';
import { useTranslation } from "react-i18next";
import { numberLocale } from "@/core/lib/numbers";


/*
 * Energy ring (what is left of today's goal) with the three macros next to it
 */
export const NutritionalValuesDashboardChart = (props: {
    percentage: NutritionalValues,
    logged: NutritionalValues,
    planned: NutritionalValues,
}) => {

    const energyPercentage = props.planned.energy > 0 ? props.logged.energy / props.planned.energy * 100 : 100;
    const energyDiff = props.planned.energy > 0 ? props.planned.energy - props.logged.energy : props.logged.energy;

    const [t, i18n] = useTranslation();
    const over = props.planned.energy > 0 && energyPercentage >= 100;

    return <Stack direction={'row'} spacing={2.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 2 }}>
        <Ring
            value={energyPercentage / 100}
            size={100}
            thickness={9}
            color={over ? atlas.warn : atlas.ink}
            label={t('nutrition.valueEnergyKcal', { value: numberLocale(energyDiff, i18n.language) })}
        >
            <Numeric size={22}>{numberLocale(Math.abs(energyDiff), i18n.language)}</Numeric>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.2 }}>
                kcal{props.planned.energy > 0 && <> {t(over ? 'nutrition.valueTooMany' : 'nutrition.valueRemaining')}</>}
            </Typography>
        </Ring>
        <Stack spacing={1.25} sx={{ flex: 1, minWidth: 190 }}>
            <LinearPlannedLoggedChart
                title={t('nutrition.protein')}
                color={atlas.protein}
                percentage={props.percentage.protein}
                logged={props.logged.protein}
                planned={props.planned.protein}
            />
            <LinearPlannedLoggedChart
                title={t('nutrition.carbohydrates')}
                color={atlas.carbs}
                percentage={props.percentage.carbohydrates}
                logged={props.logged.carbohydrates}
                planned={props.planned.carbohydrates}
            />
            <LinearPlannedLoggedChart
                title={t('nutrition.fat')}
                color={atlas.fat}
                percentage={props.percentage.fat}
                logged={props.logged.fat}
                planned={props.planned.fat}
            />
        </Stack>
    </Stack>;
};
