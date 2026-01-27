import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConceptCard from '../ConceptCard';

// Mock the constants
vi.mock('../../lib/constants', () => ({
  colors: {
    surface: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    textSecondary: '#6B7280',
    brandStart: '#667eea',
    brandLight: '#E0E7FF',
  },
  gradients: {
    brand: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '50%',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
}));

const mockConcept = {
  id: 'concept-1',
  title: 'The Last Guardian',
  logline: 'A lone warrior must protect the last city from an ancient evil.',
  synopsis: 'In a post-apocalyptic world, a skilled warrior discovers they are the only one who can prevent the return of an ancient evil that destroyed civilisation.',
  hook: 'What if the guardian was the one who unleashed the evil in the first place?',
  protagonistHint: 'Reluctant warrior',
  conflictType: 'internal',
};

describe('ConceptCard', () => {
  it('should render concept title', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByText('The Last Guardian')).toBeInTheDocument();
  });

  it('should render concept logline', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(
      screen.getByText('A lone warrior must protect the last city from an ancient evil.')
    ).toBeInTheDocument();
  });

  it('should render concept synopsis', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(
      screen.getByText(/In a post-apocalyptic world/i)
    ).toBeInTheDocument();
  });

  it('should render concept hook', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(
      screen.getByText(/What if the guardian was the one who unleashed the evil/i)
    ).toBeInTheDocument();
  });

  it('should display Unique Hook label', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByText('Unique Hook')).toBeInTheDocument();
  });

  it('should render protagonist hint', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByText('Protagonist:')).toBeInTheDocument();
    expect(screen.getByText('Reluctant warrior')).toBeInTheDocument();
  });

  it('should render conflict type', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByText('Conflict:')).toBeInTheDocument();
    // The text-transform: capitalize CSS makes it appear as "Internal" but DOM contains "internal"
    expect(screen.getByText('internal')).toBeInTheDocument();
  });

  it('should display checkmark when selected', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={true}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should not display checkmark when not selected', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('should call onSelect when card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    const { container } = render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={onSelect}
        disabled={false}
      />
    );

    const card = container.firstChild as HTMLElement;
    await user.click(card);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should not call onSelect when disabled', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    const { container } = render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={onSelect}
        disabled={true}
      />
    );

    const card = container.firstChild as HTMLElement;
    await user.click(card);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should have pointer cursor when enabled', () => {
    const { container } = render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card.style.cursor).toBe('pointer');
  });

  it('should have not-allowed cursor when disabled', () => {
    const { container } = render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={true}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card.style.cursor).toBe('not-allowed');
  });

  it('should have reduced opacity when disabled', () => {
    const { container } = render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={true}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card.style.opacity).toBe('0.6');
  });

  it('should render save button when onSave is provided', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        onSave={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByText('Save for Later')).toBeInTheDocument();
  });

  it('should not render save button when onSave is not provided', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.queryByText('Save for Later')).not.toBeInTheDocument();
  });

  it('should call onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onSelect = vi.fn();

    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={onSelect}
        onSave={onSave}
        disabled={false}
      />
    );

    const saveButton = screen.getByText('Save for Later');
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled(); // Should not trigger card selection
  });

  it('should show Saved state when isSaved is true', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        onSave={vi.fn()}
        disabled={false}
        isSaved={true}
      />
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.queryByText('Save for Later')).not.toBeInTheDocument();
  });

  it('should not call onSave when already saved', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        onSave={onSave}
        disabled={false}
        isSaved={true}
      />
    );

    const savedButton = screen.getByText('Saved');
    await user.click(savedButton);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should have disabled save button when card is disabled', () => {
    const onSave = vi.fn();

    const { container } = render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        onSave={onSave}
        disabled={true}
      />
    );

    // Find the button element containing the text
    const saveButton = screen.getByText('Save for Later').closest('button');
    expect(saveButton).not.toBeNull();
    expect(saveButton).toHaveAttribute('disabled');
  });

  it('should capitalise conflict type', () => {
    const concept = { ...mockConcept, conflictType: 'external' };

    render(
      <ConceptCard
        concept={concept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    // CSS text-transform: capitalize displays it as "External" but DOM contains "external"
    expect(screen.getByText('external')).toBeInTheDocument();
  });

  it('should handle multi-line synopsis', () => {
    const concept = {
      ...mockConcept,
      synopsis: 'Line 1\nLine 2\nLine 3',
    };

    render(
      <ConceptCard
        concept={concept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByText(/Line 1.*Line 2.*Line 3/s)).toBeInTheDocument();
  });

  it('should stop propagation when save button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onSelect = vi.fn();

    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={onSelect}
        onSave={onSave}
        disabled={false}
      />
    );

    const saveButton = screen.getByText('Save for Later');
    await user.click(saveButton);

    // onSelect should NOT be called because click propagation is stopped
    expect(onSelect).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should render all metadata fields', () => {
    render(
      <ConceptCard
        concept={mockConcept}
        isSelected={false}
        onSelect={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByText('Protagonist:')).toBeInTheDocument();
    expect(screen.getByText('Conflict:')).toBeInTheDocument();
  });
});
