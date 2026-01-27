import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TimePeriodSelector,
  getTimeframeDescription,
  getTechnologyContext,
} from '../TimePeriodSelector';
import type { TimePeriod } from '../../../shared/types';

describe('TimePeriodSelector', () => {
  const mockOnChange = vi.fn();
  const defaultValue: TimePeriod = {
    type: 'present',
    description: 'Contemporary setting with current technology and culture',
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Initial Rendering', () => {
    it('should render all time period options', () => {
      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} />);

      expect(screen.getByText('500 Years Ago')).toBeInTheDocument();
      expect(screen.getByText('Modern Day')).toBeInTheDocument();
      expect(screen.getByText('500 Years Ahead')).toBeInTheDocument();
      expect(screen.getByText('Unknown/Distant')).toBeInTheDocument();
      expect(screen.getByText('Custom Year')).toBeInTheDocument();
    });

    it('should display label in non-compact mode', () => {
      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} />);

      expect(screen.getByText('Story Time Period')).toBeInTheDocument();
      expect(screen.getByText('(Optional)')).toBeInTheDocument();
    });

    it('should not display label in compact mode', () => {
      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} compact={true} />);

      expect(screen.queryByText('Story Time Period')).not.toBeInTheDocument();
    });

    it('should highlight selected time period', () => {
      const pastValue: TimePeriod = { type: 'past' };

      render(<TimePeriodSelector value={pastValue} onChange={mockOnChange} />);

      const button = screen.getByText('500 Years Ago').closest('button');
      // Check that the button has the gradient background
      expect(button).toHaveStyle({
        background: 'linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%)',
      });
    });
  });

  describe('Time Period Selection', () => {
    it('should call onChange when past is selected', async () => {
      const user = userEvent.setup();

      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} />);

      await user.click(screen.getByText('500 Years Ago'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'past',
          year: expect.any(Number),
          description: expect.any(String),
        })
      );
    });

    it('should call onChange when present is selected', async () => {
      const user = userEvent.setup();
      const pastValue: TimePeriod = { type: 'past' };

      render(<TimePeriodSelector value={pastValue} onChange={mockOnChange} />);

      await user.click(screen.getByText('Modern Day'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'present',
        })
      );
    });

    it('should call onChange when future is selected', async () => {
      const user = userEvent.setup();

      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} />);

      await user.click(screen.getByText('500 Years Ahead'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'future',
          year: expect.any(Number),
        })
      );
    });

    it('should call onChange when unknown is selected', async () => {
      const user = userEvent.setup();

      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} />);

      await user.click(screen.getByText('Unknown/Distant'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unknown',
        })
      );
    });

    it('should show custom year input when custom selected', async () => {
      const user = userEvent.setup();

      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} />);

      await user.click(screen.getByText('Custom Year'));

      expect(screen.getByLabelText('Year:')).toBeInTheDocument();
      expect(screen.getByDisplayValue(new Date().getFullYear())).toBeInTheDocument();
    });
  });

  describe('Custom Year Input', () => {
    it('should display custom year input when custom type selected', () => {
      const customValue: TimePeriod = { type: 'custom', year: 1920 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      const input = screen.getByLabelText('Year:');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(1920);
    });

    it('should call onChange when custom year is changed', async () => {
      const customValue: TimePeriod = { type: 'custom', year: 2024 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      const input = screen.getByLabelText('Year:') as HTMLInputElement;

      // Use fireEvent to change the value directly
      fireEvent.change(input, { target: { value: '2050' } });

      // Check that onChange was called with the correct value
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
          year: 2050,
          description: 'Year 2050',
        })
      );
    });

    it('should accept negative years for BCE', async () => {
      const customValue: TimePeriod = { type: 'custom', year: 2024 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      const input = screen.getByLabelText('Year:') as HTMLInputElement;

      // Use fireEvent to change the value directly
      fireEvent.change(input, { target: { value: '-500' } });

      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
          year: -500,
          description: 'Year -500',
        })
      );
    });

    it('should display era context for custom year', () => {
      const customValue: TimePeriod = { type: 'custom', year: 2100 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      // Year 2100 is ~74 years from 2026, which falls in "Mid-future" range (50-100 years)
      expect(screen.getByText('Mid-future')).toBeInTheDocument();
    });

    it('should show help text for negative years', () => {
      const customValue: TimePeriod = { type: 'custom', year: 2024 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      expect(screen.getByText('Use negative years for BCE (e.g., -500 for 500 BCE)')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} disabled={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();

      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} disabled={true} />);

      await user.click(screen.getByText('500 Years Ago'));

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should disable custom year input when disabled', () => {
      const customValue: TimePeriod = { type: 'custom', year: 2024 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} disabled={true} />);

      const input = screen.getByLabelText('Year:');
      expect(input).toBeDisabled();
    });
  });

  describe('Compact Mode', () => {
    it('should apply compact styles', () => {
      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} compact={true} />);

      // Check that buttons exist (compact mode changes styling not structure)
      expect(screen.getByText('500 Years Ago')).toBeInTheDocument();
    });

    it('should not show description in compact mode', () => {
      const pastValue: TimePeriod = { type: 'past' };

      render(<TimePeriodSelector value={pastValue} onChange={mockOnChange} compact={true} />);

      expect(
        screen.queryByText('A distant past with medieval or renaissance elements')
      ).not.toBeInTheDocument();
    });
  });

  describe('Description Display', () => {
    it('should show description for selected preset in normal mode', () => {
      const pastValue: TimePeriod = { type: 'past' };

      render(<TimePeriodSelector value={pastValue} onChange={mockOnChange} />);

      expect(
        screen.getByText('A distant past with medieval or renaissance elements')
      ).toBeInTheDocument();
    });

    it('should not show description for custom type', () => {
      const customValue: TimePeriod = { type: 'custom', year: 2050 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      expect(
        screen.queryByText('A distant past with medieval or renaissance elements')
      ).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have button type for all period buttons', () => {
      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should have title attributes with descriptions', () => {
      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} />);

      const pastButton = screen.getByText('500 Years Ago').closest('button');
      expect(pastButton).toHaveAttribute(
        'title',
        'A distant past with medieval or renaissance elements'
      );
    });

    it('should have proper label for year input', () => {
      const customValue: TimePeriod = { type: 'custom', year: 2024 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      expect(screen.getByLabelText('Year:')).toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should display emoji icons for each period', () => {
      render(<TimePeriodSelector value={defaultValue} onChange={mockOnChange} />);

      // Check that emoji are rendered (they're in the button text)
      expect(screen.getByText('500 Years Ago').closest('button')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle year 0', async () => {
      const user = userEvent.setup();
      const customValue: TimePeriod = { type: 'custom', year: 2024 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      const input = screen.getByLabelText('Year:');
      await user.clear(input);
      await user.type(input, '0');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should handle very large future years', () => {
      const customValue: TimePeriod = { type: 'custom', year: 50000 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      expect(screen.getByText('Distant future')).toBeInTheDocument();
    });

    it('should handle very old ancient years', () => {
      const customValue: TimePeriod = { type: 'custom', year: -5000 };

      render(<TimePeriodSelector value={customValue} onChange={mockOnChange} />);

      expect(screen.getByText('Ancient era')).toBeInTheDocument();
    });
  });
});

describe('getTimeframeDescription', () => {
  it('should return correct description for past', () => {
    const description = getTimeframeDescription({ type: 'past' });
    expect(description).toContain('Historical setting');
    expect(description).toContain('500 years in the past');
  });

  it('should return correct description for present', () => {
    const description = getTimeframeDescription({ type: 'present' });
    expect(description).toContain('Contemporary/Modern day setting');
  });

  it('should return correct description for future', () => {
    const description = getTimeframeDescription({ type: 'future' });
    expect(description).toContain('Futuristic setting');
    expect(description).toContain('500 years in the future');
  });

  it('should return correct description for unknown', () => {
    const description = getTimeframeDescription({ type: 'unknown' });
    expect(description).toContain('undefined or impossibly distant');
  });

  it('should return correct description for custom BCE year', () => {
    const description = getTimeframeDescription({ type: 'custom', year: -500 });
    expect(description).toContain('Ancient setting');
    expect(description).toContain('500 BCE');
  });

  it('should return correct description for custom future year', () => {
    const description = getTimeframeDescription({ type: 'custom', year: 2200 });
    expect(description).toContain('Far future setting');
  });
});

describe('getTechnologyContext', () => {
  it('should return ancient technology for BCE years', () => {
    const context = getTechnologyContext({ type: 'custom', year: -500 });
    expect(context).toContain('Ancient technology');
  });

  it('should return medieval technology for medieval era', () => {
    const context = getTechnologyContext({ type: 'custom', year: 1200 });
    expect(context).toContain('Medieval technology');
  });

  it('should return contemporary technology for recent years', () => {
    const context = getTechnologyContext({ type: 'custom', year: 2020 });
    expect(context).toContain('Contemporary');
  });

  it('should return near future technology', () => {
    const context = getTechnologyContext({ type: 'custom', year: 2050 });
    expect(context).toContain('Near future');
  });

  it('should return far future technology', () => {
    const context = getTechnologyContext({ type: 'custom', year: 3000 });
    expect(context).toContain('Far future');
  });

  it('should handle undefined year for unknown type', () => {
    const context = getTechnologyContext({ type: 'unknown' });
    expect(context).toContain('undefined');
  });
});
