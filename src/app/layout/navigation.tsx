import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import FitnessCenterOutlinedIcon from "@mui/icons-material/FitnessCenterOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import MonitorWeightOutlinedIcon from "@mui/icons-material/MonitorWeightOutlined";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import { ReactElement } from "react";
import { makeLink, WgerLink } from "@/core/lib/url";

export type NavChild = {
    key: string;
    label: string;
    to: string;
    /** Exact match instead of prefix match */
    exact?: boolean;
};

export type NavItemDef = {
    key: string;
    label: string;
    icon: ReactElement;
    to: string;
    exact?: boolean;
    /** Path prefixes (without language) that mark the section as active */
    prefixes: string[];
    /** Sub entries, only shown while the section is active */
    children?: NavChild[];
};

export type NavGroupDef = {
    key: string;
    title?: string;
    items: NavItemDef[];
};

type T = (key: string) => string;

/*
 * The side navigation: a flat list of sections, the Progress group and the
 * "AI coach" group. The sub entries of Train and Nutrition only show while that
 * section is open.
 */
export const buildNavigation = (t: T, lang: string, canManageAi: boolean): NavGroupDef[] => {
    const l = lang.toLowerCase() || 'en';
    const link = (wl: WgerLink) => makeLink(wl, l);

    const coach: NavItemDef[] = [
        {
            key: 'coach', label: t('nav.coachChat'), icon: <AutoAwesomeOutlinedIcon />,
            to: link(WgerLink.COACH), exact: true, prefixes: [],
        },
        {
            key: 'goals', label: t('nav.goals'), icon: <TrackChangesOutlinedIcon />,
            to: link(WgerLink.COACH_GOALS), prefixes: ['/coach/goals'],
        },
        {
            key: 'my-ai', label: t('nav.myAi'), icon: <LinkOutlinedIcon />,
            to: link(WgerLink.COACH_SETTINGS), prefixes: ['/coach/settings'],
        },
    ];
    if (canManageAi) {
        coach.push(
            {
                key: 'admin-access', label: t('nav.adminAccess'), icon: <ManageAccountsOutlinedIcon />,
                to: link(WgerLink.COACH_ADMIN_ACCESS), prefixes: ['/coach/admin/access'],
            },
            {
                key: 'admin-agent', label: t('nav.adminAgent'), icon: <AutoAwesomeOutlinedIcon />,
                to: link(WgerLink.COACH_ADMIN_CONFIG), prefixes: ['/coach/admin/config'],
            },
        );
    }

    return [
        {
            key: 'main',
            items: [
                {
                    key: 'home', label: t('nav.home'), icon: <HomeOutlinedIcon />,
                    to: link(WgerLink.DASHBOARD), prefixes: ['/dashboard'],
                },
                {
                    key: 'train', label: t('nav.train'), icon: <FitnessCenterOutlinedIcon />,
                    to: link(WgerLink.ROUTINE_OVERVIEW),
                    prefixes: ['/routine', '/exercise', '/user/locations'],
                    children: [
                        { key: 'routines', label: t('nav.routines'), to: link(WgerLink.ROUTINE_OVERVIEW) },
                        { key: 'private', label: t('nav.privateTemplates'), to: link(WgerLink.PRIVATE_TEMPLATE_OVERVIEW) },
                        { key: 'public', label: t('nav.publicTemplates'), to: link(WgerLink.PUBLIC_TEMPLATE_OVERVIEW) },
                        { key: 'exercises', label: t('nav.exercises'), to: link(WgerLink.EXERCISE_OVERVIEW) },
                        { key: 'calendar', label: t('nav.calendar'), to: link(WgerLink.CALENDAR) },
                        { key: 'locations', label: t('locations.title'), to: link(WgerLink.TRAINING_LOCATIONS) },
                    ],
                },
                {
                    key: 'nutrition', label: t('nav.nutrition'), icon: <RestaurantOutlinedIcon />,
                    to: link(WgerLink.NUTRITION_OVERVIEW),
                    prefixes: ['/nutrition'],
                    children: [
                        { key: 'plans', label: t('nav.plans'), to: link(WgerLink.NUTRITION_OVERVIEW) },
                        { key: 'ingredients', label: t('nav.ingredients'), to: `/${l}/nutrition/ingredient/overview` },
                        { key: 'bmi', label: t('nav.bmiCalculator'), to: `/${l}/nutrition/calculator/bmi` },
                        { key: 'calories', label: t('nav.caloriesCalculator'), to: `/${l}/nutrition/calculator/calories` },
                    ],
                },
            ],
        },
        {
            key: 'progress',
            title: t('nav.progress'),
            items: [
                {
                    key: 'weight', label: t('nav.weight'), icon: <MonitorWeightOutlinedIcon />,
                    to: link(WgerLink.WEIGHT_OVERVIEW), prefixes: ['/weight'],
                },
                {
                    key: 'measurements', label: t('nav.measurements'), icon: <StraightenOutlinedIcon />,
                    to: link(WgerLink.MEASUREMENT_OVERVIEW), prefixes: ['/measurement'],
                },
                {
                    key: 'trophies', label: t('nav.trophies'), icon: <EmojiEventsOutlinedIcon />,
                    to: link(WgerLink.TROPHIES), prefixes: ['/trophies'],
                },
            ],
        },
        {
            key: 'coach',
            title: t('nav.coachGroup'),
            items: coach,
        },
    ];
};

/**
 * Strips the language prefix (e.g. "/en") of a path
 */
export const stripLanguage = (pathname: string): string => {
    const match = pathname.match(/^\/[a-zA-Z]{2,3}(?:-[a-zA-Z]+)?(\/.*)?$/);
    return match ? (match[1] ?? '/') : pathname;
};

const matchesPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`);

export const isItemActive = (item: NavItemDef, pathname: string): boolean => {
    const path = stripLanguage(pathname);
    if (item.key === 'home' && (path === '/' || pathname === '/')) {
        return true;
    }
    if (item.exact) {
        return path === stripLanguage(item.to);
    }
    return item.prefixes.some(p => matchesPrefix(path, p));
};

export const isChildActive = (child: NavChild, siblings: NavChild[], pathname: string): boolean => {
    const path = stripLanguage(pathname);
    const own = stripLanguage(child.to);
    if (path === own) {
        return true;
    }
    // "/routine/1/view" belongs to the "Routines" entry, but not if a more specific sibling matches
    if (child.key === 'routines') {
        const specific = siblings.filter(s => s.key !== 'routines').some(s => matchesPrefix(path, stripLanguage(s.to)));
        return !specific && matchesPrefix(path, '/routine');
    }
    if (child.key === 'plans') {
        const specific = siblings.filter(s => s.key !== 'plans').some(s => matchesPrefix(path, stripLanguage(s.to)));
        return !specific && matchesPrefix(path, '/nutrition');
    }
    return matchesPrefix(path, own);
};
