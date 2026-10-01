import { BPM_RANGES, formatBpmRange, MUSIC_PHASES, MusicPhase, musicLinks } from "@/components/Routines/gym/musicBpm";
import { Abbr } from "@/core/glossary";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { Button, Card, CardContent, CardHeader, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/*
 * Suggests the tempo of the music for the phase of the training and links to
 * the search of two music services for it. The phase follows the training
 * unless the user picks another one.
 */
export const MusicBpmCard = (props: { phase: MusicPhase }) => {
    const { t } = useTranslation();
    const [picked, setPicked] = useState<MusicPhase | null>(null);

    const phase = picked ?? props.phase;
    const range = BPM_RANGES[phase];
    const links = musicLinks(range);

    return <Card>
        <CardHeader avatar={<MusicNoteIcon />} title={t('music.title')} />
        <CardContent>
            <Stack spacing={2}>
                <Typography variant="h5" component="p" data-testid="music-bpm">
                    {formatBpmRange(range)} <Abbr term="bpm" />
                </Typography>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={phase}
                    onChange={(_event, value: MusicPhase | null) => value !== null && setPicked(value === props.phase ? null : value)}
                    aria-label={t('music.phase')}
                    sx={{ flexWrap: 'wrap' }}
                >
                    {MUSIC_PHASES.map(p => <ToggleButton key={p} value={p}>{t(`music.phases.${p}`)}</ToggleButton>)}
                </ToggleButtonGroup>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button variant="outlined" size="small" href={links.spotify} target="_blank" rel="noopener noreferrer">
                        {t('music.spotify')}
                    </Button>
                    <Button variant="outlined" size="small" href={links.youtubeMusic} target="_blank"
                            rel="noopener noreferrer">
                        {t('music.youtubeMusic')}
                    </Button>
                </Stack>
            </Stack>
        </CardContent>
    </Card>;
};
