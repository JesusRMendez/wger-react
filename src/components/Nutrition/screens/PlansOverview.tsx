import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import { Numeric } from "@/core/ui/Atlas";
import { atlas, motion } from "@/theme";
import { LoadingPlaceholder } from "@/core/ui/LoadingWidget/LoadingWidget";
import { WgerContainerRightSidebar } from "@/core/ui/Widgets/Container";
import { OverviewEmpty } from "@/core/ui/Widgets/OverviewEmpty";
import { NutritionalPlan } from "@/components/Nutrition/models/nutritionalPlan";
import { useFetchNutritionalPlansQuery } from "@/components/Nutrition/queries";
import { AddNutritionalPlanFab } from "@/components/Nutrition/widgets/Fab";
import React from "react";
import { useTranslation } from "react-i18next";
import { dateToLocale } from "@/core/lib/date";
import { makeLink, WgerLink } from "@/core/lib/url";

export const PlansOverview = () => {
    const plansQuery = useFetchNutritionalPlansQuery();
    const [t] = useTranslation();


    return plansQuery.isLoading
        ? <LoadingPlaceholder />
        : <WgerContainerRightSidebar
            title={t("nutrition.plans")}
            mainContent={<Stack spacing={2}>
                {plansQuery.data?.length === 0 && <OverviewEmpty />}
                <PlanList plans={plansQuery.data!} />
            </Stack>
            }
            fab={<AddNutritionalPlanFab />}
        />;
};


const PlanTile = (props: { plan: NutritionalPlan }) => {
    const [t, i18n] = useTranslation();
    const detailUrl = makeLink(WgerLink.NUTRITION_DETAIL, i18n.language, { id: props.plan.id! });

    return <Card sx={{ transition: `transform 240ms ${motion.easing}, border-color 240ms ${motion.easing}, box-shadow 240ms ${motion.easing}`,
        '&:hover': { borderColor: atlas.line2, transform: 'translateY(-2px)', boxShadow: '0 1px 2px rgba(13,19,33,.04), 0 12px 32px -12px rgba(13,19,33,.14)' } }}>
        <CardActionArea component="a" href={detailUrl} sx={{ height: '100%' }}>
            <CardContent>
                <Stack spacing={1.5}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        {props.plan.goalEnergy
                            ? <Chip size="small" color="primary" label={`${props.plan.goalEnergy} kcal`} />
                            : <Chip size="small" label={t('nutrition.plan')} />}
                        <ChevronRightIcon fontSize="small" sx={{ color: atlas.ink3 }} />
                    </Stack>
                    <Typography variant="h6" component="h2" sx={{ fontSize: 16 }}>
                        {props.plan.description !== '' ? props.plan.description : t('nutrition.plan')}
                    </Typography>
                    <Numeric size={12} weight={500} sx={{ color: atlas.ink3 }}>
                        {props.plan.end
                            ? `${dateToLocale(props.plan.start)} – ${dateToLocale(props.plan.end)}`
                            : `${dateToLocale(props.plan.start)}`}
                    </Numeric>
                </Stack>
            </CardContent>
        </CardActionArea>
    </Card>;
};

const PlanList = (props: { plans: NutritionalPlan[] }) => {

    return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {props.plans.map((plan) => <PlanTile plan={plan} key={plan.id} />)}
    </Box>;
};
