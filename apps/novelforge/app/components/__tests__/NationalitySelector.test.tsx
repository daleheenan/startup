import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NationalitySelector, {
  type NationalityConfig,
  type NationalityMode,
} from '../NationalitySelector';

describe('NationalitySelector', () => {
  const mockOnChange = vi.fn();
  const defaultValue: NationalityConfig = { mode: 'none' };
  const characterCount = 5;

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Initial Rendering', () => {
    it('should render component with title', () => {
      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      expect(screen.getByText('Character Nationality Settings')).toBeInTheDocument();
    });

    it('should render all mode options', () => {
      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      expect(screen.getByText('Not Specified')).toBeInTheDocument();
      expect(screen.getByText('Single Nationality')).toBeInTheDocument();
      expect(screen.getByText('Mixed Distribution')).toBeInTheDocument();
      expect(screen.getByText('Custom Per Character')).toBeInTheDocument();
    });

    it('should highlight selected mode', () => {
      const singleValue: NationalityConfig = {
        mode: 'single',
        singleNationality: 'british',
      };

      render(
        <NationalitySelector
          value={singleValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      const singleButton = screen.getByText('Single Nationality').closest('button');
      expect(singleButton).toHaveAttribute('style', expect.stringContaining('rgb(238, 242, 255)'));
      expect(singleButton).toHaveAttribute('style', expect.stringContaining('2px solid rgb(102, 126, 234)'));
    });
  });

  describe('Mode Selection', () => {
    it('should call onChange when none mode selected', async () => {
      const user = userEvent.setup();
      const singleValue: NationalityConfig = { mode: 'single' };

      render(
        <NationalitySelector
          value={singleValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      await user.click(screen.getByText('Not Specified'));

      expect(mockOnChange).toHaveBeenCalledWith({ mode: 'none' });
    });

    it('should call onChange with default nationality when single mode selected', async () => {
      const user = userEvent.setup();

      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      await user.click(screen.getByText('Single Nationality'));

      expect(mockOnChange).toHaveBeenCalledWith({
        mode: 'single',
        singleNationality: 'british',
      });
    });

    it('should preserve existing singleNationality when switching to single mode', async () => {
      const user = userEvent.setup();
      const existingValue: NationalityConfig = {
        mode: 'none',
      };

      const { rerender } = render(
        <NationalitySelector
          value={existingValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      await user.click(screen.getByText('Single Nationality'));

      // Simulate parent updating value
      const updatedValue: NationalityConfig = {
        mode: 'single',
        singleNationality: 'american',
      };

      rerender(
        <NationalitySelector
          value={updatedValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      await user.click(screen.getByText('Not Specified'));
      await user.click(screen.getByText('Single Nationality'));

      expect(mockOnChange).toHaveBeenCalledWith({
        mode: 'single',
        singleNationality: 'american',
      });
    });

    it('should initialise mixed mode with default distribution', async () => {
      const user = userEvent.setup();

      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      await user.click(screen.getByText('Mixed Distribution'));

      expect(mockOnChange).toHaveBeenCalledWith({
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'american', count: 2 },
        ],
      });
    });

    it('should switch to custom mode', async () => {
      const user = userEvent.setup();

      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      await user.click(screen.getByText('Custom Per Character'));

      expect(mockOnChange).toHaveBeenCalledWith({ mode: 'custom' });
    });
  });

  describe('Single Nationality Mode', () => {
    it('should display nationality selector when in single mode', () => {
      const singleValue: NationalityConfig = {
        mode: 'single',
        singleNationality: 'british',
      };

      render(
        <NationalitySelector
          value={singleValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      expect(screen.getByText('Select Nationality')).toBeInTheDocument();
      expect(screen.getByDisplayValue(/British/)).toBeInTheDocument();
    });

    it('should call onChange when nationality is changed', async () => {
      const user = userEvent.setup();
      const singleValue: NationalityConfig = {
        mode: 'single',
        singleNationality: 'british',
      };

      render(
        <NationalitySelector
          value={singleValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      const select = screen.getByDisplayValue(/British/);
      await user.selectOptions(select, 'american');

      expect(mockOnChange).toHaveBeenCalledWith({
        mode: 'single',
        singleNationality: 'american',
      });
    });

    it('should display preview for single nationality', () => {
      const singleValue: NationalityConfig = {
        mode: 'single',
        singleNationality: 'french',
      };

      render(
        <NationalitySelector
          value={singleValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      expect(screen.getByText('Preview')).toBeInTheDocument();
      const preview = screen.getByText(/All characters will have/);
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveTextContent('French');
    });
  });

  describe('Mixed Distribution Mode', () => {
    it('should display distribution builder when in mixed mode', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'american', count: 2 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      expect(screen.getByText('Nationality Distribution')).toBeInTheDocument();
      expect(screen.getByText('5 / 5 assigned')).toBeInTheDocument();
    });

    it('should render distribution entries', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'german', count: 2 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      const selects = screen.getAllByRole('combobox');
      expect(selects[0]).toHaveValue('british');
      expect(selects[1]).toHaveValue('german');
    });

    it('should call onChange when nationality in distribution is changed', async () => {
      const user = userEvent.setup();
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'american', count: 2 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[0], 'french');

      expect(mockOnChange).toHaveBeenCalledWith({
        mode: 'mixed',
        distribution: [
          { nationality: 'french', count: 3 },
          { nationality: 'american', count: 2 },
        ],
      });
    });

    it('should call onChange when count is changed', async () => {
      const user = userEvent.setup();
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'american', count: 2 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      const countInputs = screen.getAllByRole('spinbutton');
      await user.tripleClick(countInputs[0]);
      await user.keyboard('4');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.distribution[0].count).toBe(4);
    });

    it('should add new distribution entry', async () => {
      const user = userEvent.setup();
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [{ nationality: 'british', count: 5 }],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      await user.click(screen.getByText('+ Add Nationality'));

      expect(mockOnChange).toHaveBeenCalledWith({
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 5 },
          { nationality: 'british', count: 1 },
        ],
      });
    });

    it('should remove distribution entry', async () => {
      const user = userEvent.setup();
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'american', count: 2 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      const removeButtons = screen.getAllByText('✕');
      await user.click(removeButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith({
        mode: 'mixed',
        distribution: [{ nationality: 'american', count: 2 }],
      });
    });

    it('should disable remove button when only one entry remains', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [{ nationality: 'british', count: 5 }],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      const removeButton = screen.getByText('✕').closest('button');
      expect(removeButton).toBeDisabled();
    });

    it('should show warning when total does not match character count', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [{ nationality: 'british', count: 3 }],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      expect(screen.getByText(/Total must equal 5 characters/)).toBeInTheDocument();
    });

    it('should show correct status when totals match', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'american', count: 2 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      expect(screen.getByText('5 / 5 assigned')).toBeInTheDocument();
    });

    it('should display preview for mixed distribution', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'japanese', count: 2 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      expect(screen.getByText('Preview')).toBeInTheDocument();
      const preview = screen.getByText(/3 British characters/);
      expect(preview).toBeInTheDocument();
      expect(screen.getByText(/2 Japanese characters/)).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable all mode buttons when disabled', () => {
      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={characterCount}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should disable nationality selector in single mode when disabled', () => {
      const singleValue: NationalityConfig = {
        mode: 'single',
        singleNationality: 'british',
      };

      render(
        <NationalitySelector
          value={singleValue}
          onChange={mockOnChange}
          characterCount={characterCount}
          disabled={true}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should disable distribution controls in mixed mode when disabled', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'american', count: 2 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
          disabled={true}
        />
      );

      const selects = screen.getAllByRole('combobox');
      selects.forEach((select) => {
        expect(select).toBeDisabled();
      });

      const spinbuttons = screen.getAllByRole('spinbutton');
      spinbuttons.forEach((input) => {
        expect(input).toBeDisabled();
      });

      expect(screen.getByText('+ Add Nationality').closest('button')).toBeDisabled();
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();

      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={characterCount}
          disabled={true}
        />
      );

      await user.click(screen.getByText('Single Nationality'));

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Character Count Handling', () => {
    it('should use provided character count for initial distribution', async () => {
      const user = userEvent.setup();

      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={10}
        />
      );

      await user.click(screen.getByText('Mixed Distribution'));

      expect(mockOnChange).toHaveBeenCalledWith({
        mode: 'mixed',
        distribution: expect.arrayContaining([
          expect.objectContaining({ count: expect.any(Number) }),
        ]),
      });

      const call = mockOnChange.mock.calls[0][0];
      const totalCount = call.distribution.reduce((sum: number, d: any) => sum + d.count, 0);
      expect(totalCount).toBe(10);
    });

    it('should use default character count when not provided', async () => {
      const user = userEvent.setup();

      render(<NationalitySelector value={defaultValue} onChange={mockOnChange} />);

      await user.click(screen.getByText('Mixed Distribution'));

      const call = mockOnChange.mock.calls[0][0];
      const totalCount = call.distribution.reduce((sum: number, d: any) => sum + d.count, 0);
      expect(totalCount).toBe(5); // Default is 5
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive button labels', () => {
      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      expect(screen.getByText('Not Specified')).toBeInTheDocument();
      expect(screen.getByText(/AI chooses culturally diverse names/)).toBeInTheDocument();
    });

    it('should have proper labels for form controls', () => {
      const singleValue: NationalityConfig = {
        mode: 'single',
        singleNationality: 'british',
      };

      render(
        <NationalitySelector
          value={singleValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      expect(screen.getByText('Select Nationality')).toBeInTheDocument();
    });

    it('should have button type for all buttons', () => {
      render(
        <NationalitySelector
          value={defaultValue}
          onChange={mockOnChange}
          characterCount={characterCount}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Validation Visual Feedback', () => {
    it('should show green status when distribution matches character count', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 3 },
          { nationality: 'american', count: 2 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      const statusText = screen.getByText('5 / 5 assigned');
      expect(statusText).toHaveStyle({ color: '#10B981' }); // Green
    });

    it('should show red status when distribution does not match', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [{ nationality: 'british', count: 3 }],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      const statusText = screen.getByText('3 / 5 assigned');
      expect(statusText).toHaveStyle({ color: '#DC2626' }); // Red
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty distribution array', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      expect(screen.getByText('Nationality Distribution')).toBeInTheDocument();
      expect(screen.getByText('0 / 5 assigned')).toBeInTheDocument();
    });

    it('should handle invalid count values gracefully', async () => {
      const user = userEvent.setup();
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [{ nationality: 'british', count: 5 }],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      const countInput = screen.getByRole('spinbutton');
      await user.tripleClick(countInput);
      await user.keyboard('0');

      // Should default to 1
      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.distribution[0].count).toBe(1);
    });

    it('should show singular form for count of 1', () => {
      const mixedValue: NationalityConfig = {
        mode: 'mixed',
        distribution: [
          { nationality: 'british', count: 1 },
          { nationality: 'american', count: 4 },
        ],
      };

      render(
        <NationalitySelector
          value={mixedValue}
          onChange={mockOnChange}
          characterCount={5}
        />
      );

      expect(screen.getByText(/1 British character$/)).toBeInTheDocument();
      expect(screen.getByText(/4 American characters$/)).toBeInTheDocument();
    });
  });
});
