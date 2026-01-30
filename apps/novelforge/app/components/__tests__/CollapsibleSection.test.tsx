import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollapsibleSection from '../CollapsibleSection';

describe('CollapsibleSection', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render with title', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-1">
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <CollapsibleSection
        title="Test Section"
        description="Test description"
        sectionId="test-2"
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should render as collapsed by default', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-3">
        <div>Hidden content</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    expect(screen.getByText('Expand')).toBeInTheDocument();
  });

  it('should render as expanded when defaultOpen is true', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-4" defaultOpen={true}>
        <div>Visible content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Visible content')).toBeInTheDocument();
    expect(screen.getByText('Collapse')).toBeInTheDocument();
  });

  it('should toggle content when clicked', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleSection title="Test Section" sectionId="test-5">
        <div>Toggleable content</div>
      </CollapsibleSection>
    );

    // Initially collapsed
    expect(screen.queryByText('Toggleable content')).not.toBeInTheDocument();

    // Click to expand
    const header = screen.getByRole('button');
    await user.click(header);

    expect(screen.getByText('Toggleable content')).toBeInTheDocument();
    expect(screen.getByText('Collapse')).toBeInTheDocument();

    // Click to collapse
    await user.click(header);

    expect(screen.queryByText('Toggleable content')).not.toBeInTheDocument();
    expect(screen.getByText('Expand')).toBeInTheDocument();
  });

  it('should toggle on Enter key press', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleSection title="Test Section" sectionId="test-6">
        <div>Keyboard content</div>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button');
    header.focus();

    await user.keyboard('{Enter}');

    expect(screen.getByText('Keyboard content')).toBeInTheDocument();
  });

  it('should toggle on Space key press', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleSection title="Test Section" sectionId="test-7">
        <div>Space content</div>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button');
    header.focus();

    await user.keyboard(' ');

    expect(screen.getByText('Space content')).toBeInTheDocument();
  });

  it('should display optional badge when optional is true', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-8" optional={true}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('should not display optional badge when optional is false', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-9" optional={false}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('should display count badge when count is provided and greater than 0', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-10" count={5}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should not display count badge when count is 0', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-11" count={0}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should not display count badge when count is undefined', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-12">
        <div>Content</div>
      </CollapsibleSection>
    );

    // No count badge should be present
    const badges = screen.queryAllByText(/^\d+$/);
    expect(badges.length).toBe(0);
  });

  it('should save state to localStorage when toggled', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleSection title="Test Section" sectionId="test-13">
        <div>Content</div>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button');
    await user.click(header);

    expect(localStorage.getItem('collapsible-test-13')).toBe('true');

    await user.click(header);

    expect(localStorage.getItem('collapsible-test-13')).toBe('false');
  });

  it('should load saved state from localStorage on mount', () => {
    localStorage.setItem('collapsible-test-14', 'true');

    render(
      <CollapsibleSection title="Test Section" sectionId="test-14">
        <div>Persisted content</div>
      </CollapsibleSection>
    );

    // Should be expanded based on localStorage
    expect(screen.getByText('Persisted content')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-15">
        <div>Content</div>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button');
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(header).toHaveAttribute('aria-controls', 'section-test-15');
    expect(header).toHaveAttribute('tabIndex', '0');
  });

  it('should update aria-expanded when toggled', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleSection title="Test Section" sectionId="test-16">
        <div>Content</div>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button');
    expect(header).toHaveAttribute('aria-expanded', 'false');

    await user.click(header);

    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('should apply custom background color', () => {
    const { container } = render(
      <CollapsibleSection
        title="Test Section"
        sectionId="test-17"
        background="#FF0000"
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const section = container.firstChild as HTMLElement;
    // Background color may be normalized by browser to rgb format
    expect(section.style.background).toMatch(/#FF0000|rgb\(255,\s*0,\s*0\)/i);
  });

  it('should apply custom border color', () => {
    const { container } = render(
      <CollapsibleSection
        title="Test Section"
        sectionId="test-18"
        borderColor="#00FF00"
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const section = container.firstChild as HTMLElement;
    // Border color may be normalized by browser to rgb format
    expect(section.style.borderColor).toMatch(/#00FF00|rgb\(0,\s*255,\s*0\)/i);
  });

  it('should have chevron icon that rotates when expanded', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <CollapsibleSection title="Test Section" sectionId="test-19">
        <div>Content</div>
      </CollapsibleSection>
    );

    const chevron = container.querySelector('svg');
    expect(chevron).toBeInTheDocument();
    expect(chevron?.style.transform).toBe('rotate(0deg)');

    const header = screen.getByRole('button');
    await user.click(header);

    expect(chevron?.style.transform).toBe('rotate(90deg)');
  });

  it('should render children content correctly', () => {
    render(
      <CollapsibleSection title="Test Section" sectionId="test-20" defaultOpen={true}>
        <div>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <button>Action Button</button>
        </div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('should handle multiple instances independently', async () => {
    const user = userEvent.setup();

    render(
      <>
        <CollapsibleSection title="Section 1" sectionId="multi-1">
          <div>Content 1</div>
        </CollapsibleSection>
        <CollapsibleSection title="Section 2" sectionId="multi-2">
          <div>Content 2</div>
        </CollapsibleSection>
      </>
    );

    const headers = screen.getAllByRole('button');

    // Expand first section
    await user.click(headers[0]);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

    // Expand second section
    await user.click(headers[1]);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });
});
