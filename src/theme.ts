import { alpha, createTheme, Theme, ThemeOptions } from '@mui/material/styles';
import type { CSSProperties } from 'react';

/*
 * "wger Atlas" design tokens
 *
 * Light web theme. Geist for the UI, Geist Mono with tabular figures for every
 * number. Thin 1px borders instead of shadows, pill shaped chips and buttons and
 * short (140-240 ms) transitions on a single standard curve.
 *
 * All text/background pairs below were checked against WCAG AA (4.5:1). Where the
 * pure design colour is too light to be used as text (warning, accent, ok on their
 * soft backgrounds) a darker `*Text` variant is provided and used for text.
 */
export const atlas = {
    bg: '#F3F4F6',
    surface: '#FFFFFF',
    surface2: '#F7F8FA',
    surface3: '#EEF0F3',
    line: '#E5E7EB',
    line2: '#D6D9E0',
    ink: '#0D1321',
    ink2: '#3F4859',
    ink3: '#5E6679',
    inkHover: '#26304A',
    brand: '#2A4C7D',
    brandDark: '#1B3358',
    brandSoft: '#E8EEF8',
    brandMid: '#B9CBE8',
    accent: '#D93D42',
    accentText: '#C2272D',
    accentSoft: '#FCEBEC',
    ok: '#1C7F46',
    okText: '#17703D',
    okSoft: '#E3F3E9',
    warn: '#B7791F',
    warnText: '#8A5A0B',
    warnSoft: '#FBF1DE',
    protein: '#3D6FD9',
    carbs: '#D4932A',
    fat: '#8E5BD9',
    // Text on the dark "ink" surfaces
    onInk: '#F2F4F8',
    onInkMuted: '#AEB6C7',
} as const;

export type AtlasTokens = typeof atlas;

/*
 * Motion tokens. A single standard curve, 140-240 ms for interactions
 */
export const motion = {
    easing: 'cubic-bezier(.2,0,0,1)',
    press: 140,
    color: 200,
    lift: 240,
    pressScale: 0.97,
} as const;

export const fontSans = '"Geist Variable", "Geist", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const fontMono = '"Geist Mono Variable", "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/**
 * Style for every figure (weights, reps, kcal, timers...): Geist Mono, tabular
 * figures and slightly tight tracking.
 *
 * Use as `sx={{ ...numeric }}`, as `<Typography variant="numeric">` or through
 * the `<Numeric>` component.
 */
export const numeric: CSSProperties = {
    fontFamily: fontMono,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.03em',
};

/**
 * Small uppercase label above a value ("eyebrow")
 */
export const eyebrow: CSSProperties = {
    fontSize: '0.71875rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
};

declare module '@mui/material/styles' {
    interface Palette {
        atlas: AtlasTokens;
    }

    interface PaletteOptions {
        atlas?: AtlasTokens;
    }

    interface TypographyVariants {
        numeric: CSSProperties;
        eyebrow: CSSProperties;
    }

    interface TypographyVariantsOptions {
        numeric?: CSSProperties;
        eyebrow?: CSSProperties;
    }
}

declare module '@mui/material/Typography' {
    interface TypographyPropsVariantOverrides {
        numeric: true;
        eyebrow: true;
    }
}

const prefersReducedMotion = (): boolean => {
    try {
        return typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
};

const reducedMotion = prefersReducedMotion();

const shadowPopover = '0 1px 2px rgba(13,19,33,.04), 0 12px 32px -12px rgba(13,19,33,.22)';
const pressTransition = [
    `transform ${motion.press}ms ${motion.easing}`,
    `background-color ${motion.color}ms ${motion.easing}`,
    `border-color ${motion.color}ms ${motion.easing}`,
    `box-shadow ${motion.lift}ms ${motion.easing}`,
    `color ${motion.color}ms ${motion.easing}`,
].join(',');

const baseTheme = createTheme();

const themeOptions: ThemeOptions = {
    spacing: 8,
    shape: {
        borderRadius: 14,
    },
    breakpoints: {
        values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },
    transitions: {
        easing: {
            easeInOut: motion.easing,
            easeOut: motion.easing,
            easeIn: motion.easing,
            sharp: motion.easing,
        },
        duration: {
            shortest: 140,
            shorter: 180,
            short: 220,
            standard: 240,
            complex: 300,
            enteringScreen: 200,
            leavingScreen: 160,
        },
        create: (props: string | string[], options?: Record<string, unknown>) => {
            // Respect prefers-reduced-motion: keep the end states, drop the movement
            const opts = reducedMotion ? { ...options, duration: 1, delay: 0 } : options;
            return baseTheme.transitions.create(props, opts);
        },
    },
    typography: {
        fontFamily: fontSans,
        fontWeightLight: 400,
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightBold: 650,
        htmlFontSize: 16,
        fontSize: 14,
        // Page title
        h1: { fontSize: '1.75rem', fontWeight: 650, letterSpacing: '-0.035em', lineHeight: 1.1 },
        h2: { fontSize: '1.75rem', fontWeight: 650, letterSpacing: '-0.035em', lineHeight: 1.1 },
        h3: { fontSize: '1.75rem', fontWeight: 650, letterSpacing: '-0.035em', lineHeight: 1.1 },
        // Section / card title
        h4: { fontSize: '1.375rem', fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1.2 },
        h5: { fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.3 },
        h6: { fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.35 },
        subtitle1: { fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4 },
        subtitle2: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.4 },
        body1: { fontSize: '0.875rem', lineHeight: 1.5 },
        body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
        caption: { fontSize: '0.75rem', lineHeight: 1.4 },
        overline: { ...eyebrow, lineHeight: 1.4 },
        button: { fontSize: '0.84375rem', fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
        numeric: { ...numeric, fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3 },
        eyebrow: { ...eyebrow, lineHeight: 1.4 },
    },
    palette: {
        mode: 'light',
        primary: {
            main: atlas.brand,
            dark: atlas.brandDark,
            light: atlas.brandMid,
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: atlas.accentText,
            light: atlas.accent,
            dark: '#A81F25',
            contrastText: '#FFFFFF',
        },
        error: {
            main: atlas.accentText,
            light: atlas.accent,
            dark: '#A81F25',
            contrastText: '#FFFFFF',
        },
        warning: {
            main: atlas.warn,
            dark: atlas.warnText,
            light: '#D9A34A',
            contrastText: '#FFFFFF',
        },
        info: {
            main: atlas.brand,
            dark: atlas.brandDark,
            light: atlas.brandMid,
            contrastText: '#FFFFFF',
        },
        success: {
            main: atlas.ok,
            dark: atlas.okText,
            light: '#4FA877',
            contrastText: '#FFFFFF',
        },
        background: {
            default: atlas.bg,
            paper: atlas.surface,
        },
        text: {
            primary: atlas.ink,
            secondary: atlas.ink3,
            disabled: '#8B93A5',
        },
        divider: atlas.line,
        action: {
            hover: alpha(atlas.ink, 0.04),
            selected: alpha(atlas.brand, 0.08),
            focus: alpha(atlas.brand, 0.12),
        },
        grey: {
            50: atlas.surface2,
            100: atlas.surface3,
            200: atlas.line,
            300: atlas.line2,
            400: '#A8AEBB',
            500: atlas.ink3,
            600: atlas.ink2,
            700: '#2B3446',
            800: '#1A2234',
            900: atlas.ink,
        },
        atlas,
    },
};

const components = (theme: Theme): ThemeOptions['components'] => ({
    MuiButtonBase: {
        defaultProps: {
            // The ripple is a movement as well
            disableRipple: reducedMotion,
        },
    },
    MuiButton: {
        defaultProps: {
            disableElevation: true,
        },
        styleOverrides: {
            root: {
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.84375rem',
                lineHeight: 1.2,
                minHeight: 40,
                padding: '0 16px',
                gap: 8,
                transition: pressTransition,
                '&:active:not(.Mui-disabled)': { transform: `scale(${motion.pressScale})` },
                '&.Mui-focusVisible': { outline: `2px solid ${atlas.brand}`, outlineOffset: 3 },
                '& .MuiButton-startIcon, & .MuiButton-endIcon': { margin: 0 },
            },
            sizeSmall: { minHeight: 32, padding: '0 12px', fontSize: '0.78125rem' },
            sizeLarge: { minHeight: 48, padding: '0 22px', fontSize: '0.9375rem' },
            text: {
                color: atlas.brand,
                '&:hover': { backgroundColor: atlas.brandSoft },
            },
            outlined: {
                backgroundColor: atlas.surface,
                borderColor: atlas.line2,
                color: atlas.ink,
                '&:hover': { borderColor: atlas.ink3, backgroundColor: atlas.surface },
                '&.Mui-disabled': { borderColor: atlas.line, color: '#7C8496' },
            },
        },
        variants: [
            // Primary action = ink pill, like the boards
            {
                props: { variant: 'contained', color: 'primary' },
                style: {
                    backgroundColor: atlas.ink,
                    color: '#FFFFFF',
                    '&:hover': { backgroundColor: atlas.inkHover },
                    '&.Mui-disabled': { backgroundColor: atlas.surface3, color: '#7C8496' },
                },
            },
            {
                props: { variant: 'contained', color: 'secondary' },
                style: { backgroundColor: atlas.accentText, '&:hover': { backgroundColor: '#A81F25' } },
            },
            {
                props: { variant: 'contained', color: 'error' },
                style: { backgroundColor: atlas.accentText, '&:hover': { backgroundColor: '#A81F25' } },
            },
            {
                props: { variant: 'outlined', color: 'primary' },
                style: {
                    borderColor: atlas.line2,
                    color: atlas.ink,
                    '&:hover': { borderColor: atlas.ink3, backgroundColor: atlas.surface },
                },
            },
        ],
    },
    MuiIconButton: {
        styleOverrides: {
            root: {
                transition: pressTransition,
                '&:hover': { backgroundColor: atlas.surface3 },
                '&:active:not(.Mui-disabled)': { transform: `scale(${motion.pressScale})` },
                '&.Mui-focusVisible': { outline: `2px solid ${atlas.brand}`, outlineOffset: 2 },
            },
        },
    },
    MuiFab: {
        styleOverrides: {
            root: {
                boxShadow: '0 8px 20px -8px rgba(13,19,33,.45)',
                transition: pressTransition,
                '&:active': { transform: `scale(${motion.pressScale})` },
            },
        },
        variants: [
            // Floating actions are primary actions: ink, like the primary buttons
            {
                props: { color: 'primary' },
                style: { backgroundColor: atlas.ink, color: '#FFFFFF', '&:hover': { backgroundColor: atlas.inkHover } },
            },
            {
                props: { color: 'secondary' },
                style: { backgroundColor: atlas.ink, color: '#FFFFFF', '&:hover': { backgroundColor: atlas.inkHover } },
            },
        ],
    },
    MuiLink: {
        defaultProps: { underline: 'hover' },
        styleOverrides: {
            root: {
                color: atlas.brand,
                fontWeight: 500,
                transition: `color ${motion.color}ms ${motion.easing}`,
                '&:hover': { color: atlas.brandDark },
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundImage: 'none',
            },
            rounded: {
                borderRadius: 14,
            },
            elevation: {
                boxShadow: 'none',
                border: `1px solid ${atlas.line}`,
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 20,
                border: `1px solid ${atlas.line}`,
                boxShadow: 'none',
                backgroundColor: atlas.surface,
            },
        },
    },
    MuiCardHeader: {
        styleOverrides: {
            root: { padding: '20px 20px 4px' },
            title: { fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-0.015em' },
            subheader: { fontSize: '0.8125rem', color: atlas.ink3 },
        },
    },
    MuiCardContent: {
        styleOverrides: {
            root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
        },
    },
    MuiCardActions: {
        styleOverrides: {
            root: { padding: '4px 12px 14px' },
        },
    },
    MuiCardActionArea: {
        styleOverrides: {
            root: {
                transition: pressTransition,
                '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0.04 },
            },
        },
    },
    MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
            root: { border: 'none', borderRadius: 0 },
            colorPrimary: { backgroundColor: atlas.surface, color: atlas.ink, borderBottom: `1px solid ${atlas.line}` },
            colorDefault: { backgroundColor: atlas.surface, color: atlas.ink, borderBottom: `1px solid ${atlas.line}` },
        },
    },
    MuiDrawer: {
        styleOverrides: {
            paper: { borderRadius: 0, border: 'none', borderRight: `1px solid ${atlas.line}` },
        },
    },
    MuiDialog: {
        styleOverrides: {
            paper: { borderRadius: 20, boxShadow: shadowPopover },
        },
    },
    MuiDialogTitle: {
        styleOverrides: {
            root: { fontSize: '1.0625rem', fontWeight: 650, letterSpacing: '-0.015em', padding: '20px 24px 8px' },
        },
    },
    MuiDialogContent: {
        styleOverrides: { root: { padding: '8px 24px 16px' } },
    },
    MuiDialogActions: {
        styleOverrides: { root: { padding: '8px 24px 20px', gap: 4 } },
    },
    MuiPopover: {
        styleOverrides: {
            paper: { boxShadow: shadowPopover },
        },
    },
    MuiMenu: {
        styleOverrides: {
            paper: { boxShadow: shadowPopover, borderRadius: 14, marginTop: 4 },
            list: { padding: 6 },
        },
    },
    MuiMenuItem: {
        styleOverrides: {
            root: {
                borderRadius: 8,
                fontSize: '0.8125rem',
                fontWeight: 500,
                minHeight: 36,
                transition: `background-color ${motion.press}ms ${motion.easing}`,
                '&:hover': { backgroundColor: atlas.surface3 },
                '&.Mui-selected': { backgroundColor: atlas.brandSoft },
                '&.Mui-selected:hover': { backgroundColor: atlas.brandSoft },
            },
        },
    },
    MuiAutocomplete: {
        styleOverrides: {
            paper: { boxShadow: shadowPopover, borderRadius: 14 },
            listbox: { padding: 6 },
            option: { borderRadius: 8 },
        },
    },
    MuiListItemButton: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                transition: `background-color ${motion.press}ms ${motion.easing}, color ${motion.press}ms ${motion.easing}`,
                '&:hover': { backgroundColor: atlas.surface3 },
                '&.Mui-selected': { backgroundColor: atlas.brandSoft, color: atlas.brandDark },
                '&.Mui-selected:hover': { backgroundColor: atlas.brandSoft },
            },
        },
    },
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: 999,
                height: 26,
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: atlas.surface3,
                color: atlas.ink2,
                transition: pressTransition,
                '&.MuiChip-clickable:hover': { backgroundColor: atlas.line },
                '&.MuiChip-clickable:active': { transform: `scale(${motion.pressScale})` },
            },
            label: { paddingLeft: 10, paddingRight: 10 },
            sizeSmall: { height: 22, fontSize: '0.6875rem' },
            icon: { marginLeft: 8, marginRight: -4, fontSize: 16 },
            outlined: { backgroundColor: 'transparent', borderColor: atlas.line2 },
        },
        variants: [
            { props: { variant: 'filled', color: 'primary' }, style: { backgroundColor: atlas.brandSoft, color: atlas.brand, '&.MuiChip-clickable:hover': { backgroundColor: atlas.brandMid } } },
            { props: { variant: 'filled', color: 'secondary' }, style: { backgroundColor: atlas.accentSoft, color: atlas.accentText } },
            { props: { variant: 'filled', color: 'error' }, style: { backgroundColor: atlas.accentSoft, color: atlas.accentText } },
            { props: { variant: 'filled', color: 'success' }, style: { backgroundColor: atlas.okSoft, color: atlas.okText } },
            { props: { variant: 'filled', color: 'warning' }, style: { backgroundColor: atlas.warnSoft, color: atlas.warnText } },
            { props: { variant: 'filled', color: 'info' }, style: { backgroundColor: atlas.brandSoft, color: atlas.brandDark } },
            { props: { variant: 'outlined', color: 'primary' }, style: { color: atlas.brand, borderColor: atlas.brandMid } },
            { props: { variant: 'outlined', color: 'success' }, style: { color: atlas.okText, borderColor: atlas.ok } },
            { props: { variant: 'outlined', color: 'warning' }, style: { color: atlas.warnText, borderColor: atlas.warn } },
            { props: { variant: 'outlined', color: 'error' }, style: { color: atlas.accentText, borderColor: atlas.accent } },
        ],
    },
    // Tabs and toggle button groups are the "segmented control" of the boards:
    // a grey pill track with a white pill for the selected option
    MuiTabs: {
        styleOverrides: {
            root: {
                minHeight: 38,
                padding: 3,
                borderRadius: 999,
                backgroundColor: atlas.surface3,
                width: 'fit-content',
                maxWidth: '100%',
                '& .MuiTabs-flexContainer': { gap: 2 },
            },
            indicator: { display: 'none' },
            scrollButtons: { borderRadius: 999, width: 28 },
        },
    },
    MuiTab: {
        styleOverrides: {
            root: {
                minHeight: 32,
                padding: '0 14px',
                borderRadius: 999,
                textTransform: 'none',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: atlas.ink3,
                transition: `background-color ${motion.color}ms ${motion.easing}, color ${motion.color}ms ${motion.easing}, box-shadow ${motion.color}ms ${motion.easing}`,
                '&:hover': { color: atlas.ink },
                '&.Mui-selected': {
                    color: atlas.ink,
                    backgroundColor: atlas.surface,
                    boxShadow: '0 1px 2px rgba(13,19,33,.1)',
                },
                '&.Mui-focusVisible': { outline: `2px solid ${atlas.brand}`, outlineOffset: 2 },
            },
        },
    },
    MuiToggleButtonGroup: {
        styleOverrides: {
            root: {
                padding: 3,
                gap: 2,
                borderRadius: 999,
                backgroundColor: atlas.surface3,
            },
            grouped: {
                border: 0,
                borderRadius: 999,
                '&:not(:first-of-type), &:not(:last-of-type)': { borderRadius: 999 },
                '&.Mui-disabled': { border: 0 },
            },
        },
    },
    MuiToggleButton: {
        styleOverrides: {
            root: {
                textTransform: 'none',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: atlas.ink3,
                border: 0,
                borderRadius: 999,
                minHeight: 30,
                padding: '0 14px',
                transition: `background-color ${motion.color}ms ${motion.easing}, color ${motion.color}ms ${motion.easing}, box-shadow ${motion.color}ms ${motion.easing}`,
                '&:hover': { backgroundColor: 'transparent', color: atlas.ink },
                '&:active': { transform: `scale(${motion.pressScale})` },
                '&.Mui-selected': {
                    color: atlas.ink,
                    backgroundColor: atlas.surface,
                    boxShadow: '0 1px 2px rgba(13,19,33,.1)',
                },
                '&.Mui-selected:hover': { backgroundColor: atlas.surface },
            },
        },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                backgroundColor: atlas.surface,
                transition: `border-color ${motion.color}ms ${motion.easing}, box-shadow ${motion.color}ms ${motion.easing}`,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: atlas.line2 },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: atlas.ink3 },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: atlas.brand, borderWidth: 1.5 },
                '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(atlas.brand, 0.14)}` },
                '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: atlas.accentText },
                '&.Mui-disabled': { backgroundColor: atlas.surface2 },
            },
            input: { fontSize: '0.875rem' },
        },
    },
    MuiInputLabel: {
        styleOverrides: {
            root: {
                fontSize: '0.875rem',
                color: atlas.ink3,
                '&.Mui-focused': { color: atlas.brand },
                '&.Mui-error': { color: atlas.accentText },
            },
        },
    },
    MuiFormHelperText: {
        styleOverrides: { root: { fontSize: '0.75rem', marginLeft: 4 } },
    },
    MuiSelect: {
        styleOverrides: {
            icon: { color: atlas.ink3 },
        },
    },
    MuiCheckbox: {
        styleOverrides: {
            root: { color: atlas.ink3, '&.Mui-checked': { color: atlas.brand } },
        },
    },
    MuiRadio: {
        styleOverrides: {
            root: { color: atlas.ink3, '&.Mui-checked': { color: atlas.brand } },
        },
    },
    MuiSwitch: {
        styleOverrides: {
            switchBase: {
                '&.Mui-checked + .MuiSwitch-track': { opacity: 0.9 },
            },
            track: { backgroundColor: atlas.line2, opacity: 1, borderRadius: 999 },
        },
    },
    MuiTableContainer: {
        styleOverrides: {
            root: { borderRadius: 14 },
        },
    },
    MuiTableHead: {
        styleOverrides: {
            root: { backgroundColor: atlas.surface2 },
        },
    },
    MuiTableCell: {
        styleOverrides: {
            root: {
                fontSize: '0.84375rem',
                borderBottom: `1px solid ${atlas.line}`,
                padding: '10px 14px',
                fontVariantNumeric: 'tabular-nums',
            },
            head: {
                ...eyebrow,
                color: atlas.ink3,
                backgroundColor: atlas.surface2,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
            },
            sizeSmall: { padding: '6px 12px' },
        },
    },
    MuiTableRow: {
        styleOverrides: {
            root: {
                transition: `background-color ${motion.press}ms ${motion.easing}`,
                '&.MuiTableRow-hover:hover': { backgroundColor: atlas.surface2 },
                '&:last-child td, &:last-child th': { borderBottom: 0 },
            },
        },
    },
    MuiLinearProgress: {
        styleOverrides: {
            root: { height: 6, borderRadius: 999, backgroundColor: atlas.surface3 },
            bar: { borderRadius: 999 },
        },
    },
    MuiCircularProgress: {
        styleOverrides: { root: { color: atlas.brand } },
    },
    MuiAlert: {
        styleOverrides: {
            root: { borderRadius: 12, fontSize: '0.8125rem', alignItems: 'center', border: 0 },
        },
        variants: [
            { props: { variant: 'standard', severity: 'info' }, style: { backgroundColor: atlas.brandSoft, color: atlas.brandDark, '& .MuiAlert-icon': { color: atlas.brand } } },
            { props: { variant: 'standard', severity: 'success' }, style: { backgroundColor: atlas.okSoft, color: atlas.okText, '& .MuiAlert-icon': { color: atlas.ok } } },
            { props: { variant: 'standard', severity: 'warning' }, style: { backgroundColor: atlas.warnSoft, color: atlas.warnText, '& .MuiAlert-icon': { color: atlas.warn } } },
            { props: { variant: 'standard', severity: 'error' }, style: { backgroundColor: atlas.accentSoft, color: atlas.accentText, '& .MuiAlert-icon': { color: atlas.accent } } },
        ],
    },
    MuiTooltip: {
        styleOverrides: {
            tooltip: {
                backgroundColor: atlas.ink,
                color: '#FFFFFF',
                borderRadius: 8,
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '6px 10px',
            },
            arrow: { color: atlas.ink },
        },
    },
    MuiSnackbarContent: {
        styleOverrides: {
            root: { borderRadius: 14, backgroundColor: atlas.ink, color: '#FFFFFF', fontWeight: 500 },
        },
    },
    MuiDivider: {
        styleOverrides: { root: { borderColor: atlas.line } },
    },
    MuiAccordion: {
        defaultProps: { disableGutters: true },
        styleOverrides: {
            root: {
                borderRadius: 14,
                border: `1px solid ${atlas.line}`,
                boxShadow: 'none',
                '&:before': { display: 'none' },
                '&:not(:last-child)': { marginBottom: 8 },
                '&.Mui-expanded': { margin: 0, marginBottom: 8 },
                overflow: 'hidden',
            },
        },
    },
    MuiAccordionSummary: {
        styleOverrides: {
            root: { padding: '0 16px', minHeight: 52, '&:hover': { backgroundColor: atlas.surface2 } },
            content: { fontWeight: 600 },
        },
    },
    MuiSkeleton: {
        styleOverrides: { root: { backgroundColor: atlas.surface3 } },
    },
    MuiAvatar: {
        styleOverrides: { root: { fontWeight: 600, fontSize: '0.8125rem' } },
    },
    MuiBadge: {
        styleOverrides: { badge: { fontWeight: 700 } },
    },
    MuiTypography: {
        defaultProps: {
            variantMapping: { numeric: 'span', eyebrow: 'span' },
        },
    },
    MuiContainer: {
        styleOverrides: {
            root: { [theme.breakpoints.down('sm')]: { paddingLeft: 16, paddingRight: 16 } },
        },
    },
});

const baseComponents = components(createTheme(themeOptions));

export const theme = createTheme(themeOptions, { components: baseComponents });

export const makeTheme = (element: HTMLDivElement) => createTheme(
    themeOptions,
    { components: baseComponents },
    {
        components: {
            MuiPopover: {
                defaultProps: {
                    container: element,
                },
            },
            MuiPopper: {
                defaultProps: {
                    container: element,
                },
            },
            MuiModal: {
                defaultProps: {
                    container: element,
                },
            },
        },
    }
);
