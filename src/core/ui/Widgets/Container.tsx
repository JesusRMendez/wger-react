import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { Breakpoint, Button, Container, Stack, Typography } from "@mui/material";
import Grid from '@mui/material/Grid';
import React, { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type WgerTemplateContainerRightSidebarProps = {
    title?: string | ReactElement;
    subTitle?: string | ReactElement;
    mainContent: ReactElement | null;
    sideBar?: ReactElement;
    optionsMenu?: ReactElement;
    backToTitle?: string;
    backToUrl?: string;
    fab?: ReactElement;
};

function BackButton(props: { href: string | undefined, backToTitle: string | undefined }) {
    const { t } = useTranslation();

    return <Button
        size="small"
        component="a"
        href={props.href}
        sx={{
            minHeight: 24,
            px: 0.5,
            ml: -0.5,
            color: 'text.secondary',
            fontWeight: 500,
            '&:hover': { color: 'text.primary', backgroundColor: 'transparent' },
        }}>
        <ChevronLeftIcon fontSize="inherit" />
        {props.backToTitle ?? t('goBack')}
    </Button>;
}

export const WgerContainerRightSidebar = (props: WgerTemplateContainerRightSidebarProps) => {
    const backTo = <BackButton href={props.backToUrl} backToTitle={props.backToTitle} />;

    return (
        <Container maxWidth="lg">
            <Grid container spacing={2}>
                <Grid sx={{ mb: 1 }} size={12}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Stack sx={{ alignItems: "start", gap: 0.5 }}>
                            {props.backToUrl && backTo}
                            <Typography variant="h3" component="h1">
                                {props.title}
                            </Typography>
                            {props.subTitle && <Typography variant="body1" color="text.secondary">
                                {props.subTitle}
                            </Typography>}
                        </Stack>
                        {props.optionsMenu}
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: props.sideBar ? 8 : 12 }}>
                    {props.mainContent}
                </Grid>
                {props.sideBar && <Grid size={{ xs: 12, md: 4 }}>
                    {props.sideBar}
                </Grid>}
            </Grid>
            {props.fab}
        </Container>
    );
};

type WgerTemplateContainerFullWidthProps = {
    title?: string;
    children: ReactNode;
    backToTitle?: string;
    backToUrl?: string;
    optionsMenu?: ReactElement;
    maxWidth?: false | Breakpoint | undefined
    fab?: ReactElement;
};

export const WgerContainerFullWidth = (props: WgerTemplateContainerFullWidthProps) => {
    const backTo = <BackButton href={props.backToUrl} backToTitle={props.backToTitle} />;

    return (
        <Container maxWidth={props.maxWidth}>
            <Grid container spacing={2}>
                <Grid sx={{ mb: 1 }} size={12}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>

                        <Stack sx={{ alignItems: "start", gap: 0.5 }}>
                            {props.backToUrl && backTo}
                            <Typography variant="h3" component="h1">
                                {props.title}
                            </Typography>
                        </Stack>

                        {props.optionsMenu}
                    </Stack>
                </Grid>

                <Grid size={12}>
                    {props.children}
                </Grid>
            </Grid>
            {props.fab}
        </Container>
    );
};