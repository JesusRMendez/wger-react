/* eslint-disable @eslint-react/no-array-index-key */
import SendIcon from "@mui/icons-material/Send";
import { Box, Card, CardContent, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { atlas } from "@/theme";
import { CoachErrorAlert } from "@/components/Coach/widgets/CoachErrorAlert";
import { ChatMessage } from "@/components/Coach/models";
import { useChatMutation } from "@/components/Coach/queries";

export const ChatPanel = () => {
    const [t] = useTranslation();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const chat = useChatMutation();

    const send = () => {
        const message = text.trim();
        if (!message || chat.isPending) {
            return;
        }
        const history = messages;
        setMessages([...history, { role: 'user', content: message }]);
        setText('');
        chat.mutate({ message, history }, {
            onSuccess: (response) => setMessages(m => [...m, { role: 'assistant', content: response.reply }]),
        });
    };

    return <Card><CardContent><Stack spacing={2}>
        <Stack spacing={1} sx={{ minHeight: 240 }} data-testid="chat-messages">
            {messages.length === 0 && <Typography color="text.secondary">{t('coach.chat.empty')}</Typography>}
            {messages.map((m, i) => <Box key={i} sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 1.5,
                        whiteSpace: 'pre-wrap',
                        border: 0,
                        borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        bgcolor: m.role === 'user' ? atlas.ink : atlas.surface3,
                        color: m.role === 'user' ? '#fff' : atlas.ink,
                    }}
                >{m.content}</Paper>
            </Box>)}
            {chat.isPending && <Typography color="text.secondary">{t('coach.chat.thinking')}</Typography>}
        </Stack>
        <CoachErrorAlert error={chat.error} />
        <Stack direction="row" spacing={1}>
            <TextField
                fullWidth
                multiline
                maxRows={4}
                size="small"
                label={t('coach.chat.placeholder')}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                    }
                }}
            />
            <IconButton aria-label={t('coach.chat.send')} onClick={send} disabled={chat.isPending}
                        sx={{ alignSelf: 'flex-end', bgcolor: atlas.ink, color: '#fff', width: 40, height: 40, '&:hover': { bgcolor: atlas.inkHover } }}>
                <SendIcon fontSize="small" />
            </IconButton>
        </Stack>
    </Stack></CardContent></Card>;
};
