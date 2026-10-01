/* eslint-disable @eslint-react/no-array-index-key */
import SendIcon from "@mui/icons-material/Send";
import { Box, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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

    return <Stack spacing={2}>
        <Stack spacing={1} sx={{ minHeight: 200 }} data-testid="chat-messages">
            {messages.length === 0 && <Typography color="text.secondary">{t('coach.chat.empty')}</Typography>}
            {messages.map((m, i) => <Box key={i} sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <Paper sx={{ p: 1.5, whiteSpace: 'pre-wrap' }} variant="outlined">{m.content}</Paper>
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
            <IconButton color="primary" aria-label={t('coach.chat.send')} onClick={send} disabled={chat.isPending}>
                <SendIcon />
            </IconButton>
        </Stack>
    </Stack>;
};
