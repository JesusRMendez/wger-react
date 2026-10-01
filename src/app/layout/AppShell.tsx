import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
    AppBar,
    Box,
    ButtonBase,
    Collapse,
    Drawer,
    IconButton,
    Stack,
    Toolbar,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React, { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { usePermissionQuery, WgerPermissions } from "@/components/User";
import { makeLink, WgerLink } from "@/core/lib/url";
import { atlas, eyebrow, motion } from "@/theme";
import FitnessCenterOutlinedIcon from "@mui/icons-material/FitnessCenterOutlined";
import {
    buildNavigation,
    isChildActive,
    isItemActive,
    NavChild,
    NavItemDef,
    stripLanguage,
} from "@/app/layout/navigation";

export const SIDEBAR_WIDTH = 240;

const linkTransition = `background-color ${motion.press}ms ${motion.easing}, color ${motion.press}ms ${motion.easing}, transform ${motion.press}ms ${motion.easing}`;

const Brand = ({ to }: { to: string }) => (
    <ButtonBase
        component={Link}
        to={to}
        aria-label="wger"
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 1.25,
            py: 0.25,
            borderRadius: 2,
            justifyContent: 'flex-start',
            transition: linkTransition,
            '&:active': { transform: `scale(${motion.pressScale})` },
        }}
    >
        <Box
            sx={{
                width: 32,
                height: 32,
                borderRadius: '10px',
                bgcolor: atlas.ink,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <FitnessCenterOutlinedIcon sx={{ fontSize: 18 }} />
        </Box>
        <Typography component="span" sx={{ fontSize: 17, fontWeight: 650, letterSpacing: '-0.02em', color: atlas.ink }}>
            wger
        </Typography>
    </ButtonBase>
);

const NavLink = (props: { item: NavItemDef; active: boolean; onNavigate?: () => void }) => {
    const { item, active, onNavigate } = props;
    return (
        <ButtonBase
            component={Link}
            to={item.to}
            onClick={onNavigate}
            aria-current={active && !item.children ? 'page' : undefined}
            sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: 1.25,
                height: 38,
                px: 1.25,
                width: '100%',
                borderRadius: '10px',
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'left',
                color: active ? '#fff' : atlas.ink2,
                bgcolor: active ? atlas.ink : 'transparent',
                transition: linkTransition,
                '& svg': { fontSize: 18 },
                '&:hover': { bgcolor: active ? atlas.ink : atlas.surface3, color: active ? '#fff' : atlas.ink },
                '&:active': { transform: `scale(${motion.pressScale})` },
                '&.Mui-focusVisible': { outline: `2px solid ${atlas.brand}`, outlineOffset: 2 },
            }}
        >
            {item.icon}
            <span>{item.label}</span>
        </ButtonBase>
    );
};

const SubLink = (props: { child: NavChild; active: boolean; onNavigate?: () => void }) => {
    const { child, active, onNavigate } = props;
    return (
        <ButtonBase
            component={Link}
            to={child.to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            sx={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                py: 0.625,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? atlas.ink : atlas.ink3,
                transition: `color ${motion.press}ms ${motion.easing}`,
                '&:hover': { color: atlas.ink },
                '&.Mui-focusVisible': { outline: `2px solid ${atlas.brand}`, outlineOffset: 2, borderRadius: '4px' },
            }}
        >
            {child.label}
        </ButtonBase>
    );
};

export const SideNavContent = (props: { onNavigate?: () => void }) => {
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const canManage = usePermissionQuery(WgerPermissions.MANAGE_AI_COACH_ACCESS);
    const groups = buildNavigation(t as unknown as (k: string) => string, i18n.language, canManage.data === true);
    const lang = i18n.language;

    return (
        <Stack component="nav" aria-label={t('nav.main')} sx={{ height: '100%', gap: 0.25, p: '18px 12px', boxSizing: 'border-box', overflowY: 'auto' }}>
            <Box sx={{ pb: 2 }}>
                <Brand to={makeLink(WgerLink.DASHBOARD, lang)} />
            </Box>

            {groups.map(group => (
                <React.Fragment key={group.key}>
                    {group.title && (
                        <Typography
                            component="div"
                            sx={{ ...eyebrow, color: atlas.ink3, px: 1.25, pt: 1.75, pb: 0.75 }}
                        >
                            {group.title}
                        </Typography>
                    )}
                    {group.items.map(item => {
                        const active = isItemActive(item, pathname);
                        return (
                            <React.Fragment key={item.key}>
                                <NavLink item={item} active={active} onNavigate={props.onNavigate} />
                                {item.children && (
                                    <Collapse in={active} timeout={motion.lift} unmountOnExit>
                                        <Stack sx={{ pl: '38px', pt: 0.25, pb: 0.75 }}>
                                            {item.children.map(child => (
                                                <SubLink
                                                    key={child.key}
                                                    child={child}
                                                    active={isChildActive(child, item.children!, pathname)}
                                                    onNavigate={props.onNavigate}
                                                />
                                            ))}
                                        </Stack>
                                    </Collapse>
                                )}
                            </React.Fragment>
                        );
                    })}
                </React.Fragment>
            ))}

            <Box sx={{ flex: 1 }} />

            <ButtonBase
                component={Link}
                to={`/${lang.toLowerCase()}/user/preferences`}
                onClick={props.onNavigate}
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    gap: 1.25,
                    px: 1.25,
                    height: 44,
                    border: `1px solid ${atlas.line}`,
                    borderRadius: '14px',
                    color: atlas.ink2,
                    fontSize: 13,
                    fontWeight: 600,
                    transition: linkTransition,
                    '&:hover': { bgcolor: atlas.surface2, color: atlas.ink },
                    '&:active': { transform: `scale(${motion.pressScale})` },
                }}
            >
                <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
                {t('nav.preferences')}
            </ButtonBase>
        </Stack>
    );
};

/*
 * Desktop: sticky sidebar on the left. Mobile: a top bar with a drawer.
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
    const theme = useTheme();
    const { t, i18n } = useTranslation();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();

    // Title for the mobile bar: the active top level section
    const activeLabel = (() => {
        const canManage = false;
        const groups = buildNavigation(t as unknown as (k: string) => string, i18n.language, canManage);
        for (const g of groups) {
            for (const item of g.items) {
                if (isItemActive(item, pathname)) {
                    return item.label;
                }
            }
        }
        return stripLanguage(pathname) === '/' ? t('nav.home') : '';
    })();

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: atlas.bg }}>
            {isDesktop ? (
                <Box
                    sx={{
                        width: SIDEBAR_WIDTH,
                        flexShrink: 0,
                        bgcolor: atlas.surface,
                        borderRight: `1px solid ${atlas.line}`,
                        position: 'sticky',
                        top: 0,
                        height: '100vh',
                    }}
                >
                    <SideNavContent />
                </Box>
            ) : (
                <>
                    <AppBar position="fixed" color="default" sx={{ zIndex: theme.zIndex.appBar }}>
                        <Toolbar sx={{ minHeight: 56, gap: 1, px: { xs: 1, sm: 2 } }}>
                            <IconButton
                                edge="start"
                                aria-label={t('nav.openMenu')}
                                aria-expanded={open}
                                onClick={() => setOpen(true)}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Brand to={makeLink(WgerLink.DASHBOARD, i18n.language)} />
                            <Box sx={{ flex: 1 }} />
                            <Typography component="span" sx={{ fontSize: 13, fontWeight: 600, color: atlas.ink3 }} noWrap>
                                {activeLabel}
                            </Typography>
                        </Toolbar>
                    </AppBar>
                    <Drawer
                        open={open}
                        onClose={() => setOpen(false)}
                        slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH + 40, maxWidth: '86vw' } } }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pt: 1, mb: -6, position: 'relative', zIndex: 1 }}>
                            <IconButton aria-label={t('nav.closeMenu')} onClick={() => setOpen(false)}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                        <SideNavContent onNavigate={() => setOpen(false)} />
                    </Drawer>
                </>
            )}

            <Box
                component="main"
                sx={{
                    flex: 1,
                    minWidth: 0,
                    pt: isDesktop ? 3.5 : 9,
                    pb: 8,
                    px: { xs: 0, md: 1 },
                }}
            >
                {children}
            </Box>
        </Box>
    );
};
