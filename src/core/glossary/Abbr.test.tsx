import { Abbr } from "@/core/glossary/Abbr";
import { GlossaryButton } from "@/core/glossary/GlossaryButton";
import { filterTerms } from "@/core/glossary/GlossaryDialog";
import { GLOSSARY_TERMS } from "@/core/glossary/glossary";
import { fireEvent, render, screen, within } from "@testing-library/react";
import i18n from "i18next";
import React from "react";
import translations from "../../../public/locales/en/translation.json";

describe('glossary components', () => {
    beforeAll(() => {
        i18n.addResourceBundle('en', 'translations', translations, true, true);
    });

    afterAll(() => {
        i18n.removeResourceBundle('en', 'translations');
    });

    describe('Abbr', () => {
        test('renders the abbreviation as a button and opens the explanation', () => {
            render(<Abbr term="RIR" />);

            const chip = screen.getByRole('button', { name: 'Explain Repetitions in reserve' });
            expect(chip).toHaveTextContent('RIR');
            expect(screen.queryByText('How it helps your goal')).not.toBeInTheDocument();

            fireEvent.click(chip);

            expect(screen.getByText('What it is')).toBeInTheDocument();
            expect(screen.getByText('How it helps your goal')).toBeInTheDocument();
            expect(screen.getByText('Example')).toBeInTheDocument();
            expect(screen.getByText(/stop the set while you could have done 2 more/)).toBeInTheDocument();
        });

        test('shows its own children instead of the abbreviation', () => {
            render(<Abbr term="amrap">as many as possible</Abbr>);

            expect(screen.getByRole('button')).toHaveTextContent('as many as possible');
        });

        test('renders unknown terms as plain text', () => {
            render(<Abbr term="normal" />);

            expect(screen.queryByRole('button')).not.toBeInTheDocument();
            expect(screen.getByText('normal')).toBeInTheDocument();
        });
    });

    describe('glossary dialog', () => {
        test('the help button opens the whole glossary', () => {
            render(<GlossaryButton />);

            fireEvent.click(screen.getByRole('button', { name: 'Help and glossary' }));

            const dialog = within(screen.getByRole('dialog'));
            expect(dialog.getByText('Glossary')).toBeInTheDocument();
            expect(dialog.getByText(/Beats per minute/)).toBeInTheDocument();
            expect(dialog.getAllByText('What it is')).toHaveLength(GLOSSARY_TERMS.length);
        });

        test('searches the terms', () => {
            render(<GlossaryButton />);
            fireEvent.click(screen.getByRole('button', { name: 'Help and glossary' }));

            fireEvent.change(screen.getByLabelText('Search terms'), { target: { value: 'nutri-score' } });
            const dialog = within(screen.getByRole('dialog'));
            expect(dialog.getAllByText('What it is')).toHaveLength(1);
            expect(dialog.getByTestId('glossary-entry-nutriScore')).toBeInTheDocument();

            fireEvent.change(screen.getByLabelText('Search terms'), { target: { value: 'zzzzzz' } });
            expect(screen.getByText('No term matches your search.')).toBeInTheDocument();
        });

        test('filterTerms matches on any part and keeps the order', () => {
            const text = (term: string, part: string) => `${term}-${part}`;
            expect(filterTerms(GLOSSARY_TERMS, '', text)).toHaveLength(GLOSSARY_TERMS.length);
            expect(filterTerms(GLOSSARY_TERMS, 'RIR-WHAT', text)).toEqual(['rir']);
            expect(filterTerms(['rir', 'rpe'], 'r', text)).toEqual(['rir', 'rpe']);
        });
    });
});
