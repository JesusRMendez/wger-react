import { MusicBpmCard } from "@/components/Routines/gym/MusicBpmCard";
import { fireEvent, render, screen } from "@testing-library/react";
import i18n from "i18next";
import React from "react";
import translations from "../../../../public/locales/en/translation.json";

describe('MusicBpmCard', () => {
    beforeAll(() => {
        i18n.addResourceBundle('en', 'translations', translations, true, true);
    });

    afterAll(() => {
        i18n.removeResourceBundle('en', 'translations');
    });

    test('shows the BPM range of the phase and links to both services', () => {
        render(<MusicBpmCard phase="strength" />);

        expect(screen.getByTestId('music-bpm')).toHaveTextContent('120-140');
        expect(screen.getByRole('link', { name: 'Search on Spotify' }))
            .toHaveAttribute('href', 'https://open.spotify.com/search/120-140%20bpm%20workout');
        expect(screen.getByRole('link', { name: 'Search on YouTube Music' }))
            .toHaveAttribute('href', 'https://music.youtube.com/search?q=120-140%20bpm%20workout');
    });

    test('BPM explains itself', () => {
        render(<MusicBpmCard phase="hiit" />);

        fireEvent.click(screen.getByRole('button', { name: 'Explain Beats per minute' }));

        expect(screen.getByText('What it is')).toBeInTheDocument();
    });

    test('follows the phase it is given', () => {
        const { rerender } = render(<MusicBpmCard phase="warmup" />);
        expect(screen.getByTestId('music-bpm')).toHaveTextContent('100-120');

        rerender(<MusicBpmCard phase="rest" />);
        expect(screen.getByTestId('music-bpm')).toHaveTextContent('90-110');
    });

    test('the user can pick another phase, and following the training resumes when the phase picked is the real one', () => {
        const { rerender } = render(<MusicBpmCard phase="strength" />);

        fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));
        expect(screen.getByTestId('music-bpm')).toHaveTextContent('150-170');
        expect(screen.getByRole('link', { name: 'Search on Spotify' }))
            .toHaveAttribute('href', 'https://open.spotify.com/search/150-170%20bpm%20workout');

        // Picking the phase of the training goes back to following it
        fireEvent.click(screen.getByRole('button', { name: 'Strength' }));
        rerender(<MusicBpmCard phase="rest" />);
        expect(screen.getByTestId('music-bpm')).toHaveTextContent('90-110');
    });
});
