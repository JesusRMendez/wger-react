import { Button, Menu, MenuItem } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { usePermissionQuery, WgerPermissions } from "@/components/User";
import { makeLink, WgerLink } from "@/core/lib/url";

export const CoachSubMenu = () => {
    const [t, i18n] = useTranslation();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const canManage = usePermissionQuery(WgerPermissions.MANAGE_AI_COACH_ACCESS);
    const close = () => setAnchorEl(null);

    return (
        <>
            <Button color="inherit" onClick={(event) => setAnchorEl(event.currentTarget)}>
                {t('coach.menu.title')}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
                <MenuItem component={Link} to={makeLink(WgerLink.COACH, i18n.language)} onClick={close}>
                    {t('coach.title')}
                </MenuItem>
                <MenuItem component={Link} to={makeLink(WgerLink.COACH_GOALS, i18n.language)} onClick={close}>
                    {t('coach.goalsPage.title')}
                </MenuItem>
                <MenuItem component={Link} to={makeLink(WgerLink.COACH_SETTINGS, i18n.language)} onClick={close}>
                    {t('coach.settings.title')}
                </MenuItem>
                {canManage.data && <MenuItem component={Link} to={makeLink(WgerLink.COACH_ADMIN_ACCESS, i18n.language)} onClick={close}>
                    {t('coach.admin.accessTitle')}
                </MenuItem>}
                {canManage.data && <MenuItem component={Link} to={makeLink(WgerLink.COACH_ADMIN_CONFIG, i18n.language)} onClick={close}>
                    {t('coach.admin.configTitle')}
                </MenuItem>}
            </Menu>
        </>
    );
};
