import React from "react";
import { useTranslation } from "react-i18next";
import { numberGramLocale } from "@/core/lib/numbers";
import { MacroBar } from "@/core/ui/Atlas";
import { atlas } from "@/theme";

export const LinearPlannedLoggedChart = (props: {
    percentage: number,
    logged: number,
    title: string,
    planned: number,
    color?: string,
}) => {
    const { i18n } = useTranslation();

    const hasPlanned = props.planned > 0;
    const value = numberGramLocale(props.logged, i18n.language)
        + (hasPlanned ? ` / ${numberGramLocale(props.planned, i18n.language)}` : '');

    return <MacroBar
        label={props.title}
        color={props.color ?? atlas.brand}
        value={value}
        percent={props.percentage}
    />;
};
