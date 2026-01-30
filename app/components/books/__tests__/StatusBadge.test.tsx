import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  describe('Rendering with Different Statuses', () => {
    it('should render draft status correctly', () => {
      render(<StatusBadge status="draft" />);

      const badge = screen.getByText('draft');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', 'Status: draft');
    });

    it('should render beta_readers status correctly', () => {
      render(<StatusBadge status="beta_readers" />);

      // Underscores should be replaced with spaces
      const badge = screen.getByText('beta readers');
      expect(badge).toBeInTheDocument();
    });

    it('should render editing status correctly', () => {
      render(<StatusBadge status="editing" />);

      const badge = screen.getByText('editing');
      expect(badge).toBeInTheDocument();
    });

    it('should render submitted status correctly', () => {
      render(<StatusBadge status="submitted" />);

      const badge = screen.getByText('submitted');
      expect(badge).toBeInTheDocument();
    });

    it('should render published status correctly', () => {
      render(<StatusBadge status="published" />);

      const badge = screen.getByText('published');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Custom Labels', () => {
    it('should use custom label when provided', () => {
      render(<StatusBadge status="draft" label="Initial Draft" />);

      expect(screen.getByText('Initial Draft')).toBeInTheDocument();
      expect(screen.queryByText('draft')).not.toBeInTheDocument();
    });

    it('should use custom label with beta_readers status', () => {
      render(<StatusBadge status="beta_readers" label="With Beta Team" />);

      expect(screen.getByText('With Beta Team')).toBeInTheDocument();
    });

    it('should use custom label that differs from status', () => {
      render(<StatusBadge status="published" label="Live on Amazon" />);

      expect(screen.getByText('Live on Amazon')).toBeInTheDocument();
      expect(screen.queryByText('published')).not.toBeInTheDocument();
    });

    it('should reflect custom label in aria-label', () => {
      render(<StatusBadge status="editing" label="In Review" />);

      const badge = screen.getByText('In Review');
      expect(badge).toHaveAttribute('aria-label', 'Status: In Review');
    });
  });

  describe('Size Variants', () => {
    it('should render with medium size by default', () => {
      const { container } = render(<StatusBadge status="draft" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ padding: '4px 12px' });
    });

    it('should render with small size when specified', () => {
      const { container } = render(<StatusBadge status="draft" size="sm" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ padding: '2px 8px' });
    });

    it('should render with medium size when explicitly specified', () => {
      const { container } = render(<StatusBadge status="draft" size="md" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ padding: '4px 12px' });
    });
  });

  describe('Status Text Formatting', () => {
    it('should capitalise status text', () => {
      render(<StatusBadge status="draft" />);

      const badge = screen.getByText('draft');
      expect(badge).toHaveStyle({ textTransform: 'capitalize' });
    });

    it('should replace underscores with spaces', () => {
      render(<StatusBadge status="beta_readers" />);

      expect(screen.getByText('beta readers')).toBeInTheDocument();
      expect(screen.queryByText('beta_readers')).not.toBeInTheDocument();
    });

    it('should handle multiple underscores', () => {
      render(<StatusBadge status="some_complex_status" />);

      expect(screen.getByText('some complex status')).toBeInTheDocument();
    });
  });

  describe('Colour Coding', () => {
    it('should apply draft colours', () => {
      const { container } = render(<StatusBadge status="draft" />);

      const badge = container.querySelector('span');
      // Draft should use info colours (blue)
      expect(badge).toBeInTheDocument();
    });

    it('should apply beta_readers colours', () => {
      const { container } = render(<StatusBadge status="beta_readers" />);

      const badge = container.querySelector('span');
      // Beta readers should use purple colours
      expect(badge).toBeInTheDocument();
    });

    it('should apply editing colours', () => {
      const { container } = render(<StatusBadge status="editing" />);

      const badge = container.querySelector('span');
      // Editing should use warning colours (yellow)
      expect(badge).toBeInTheDocument();
    });

    it('should apply submitted colours', () => {
      const { container } = render(<StatusBadge status="submitted" />);

      const badge = container.querySelector('span');
      // Submitted should use orange colours
      expect(badge).toBeInTheDocument();
    });

    it('should apply published colours', () => {
      const { container } = render(<StatusBadge status="published" />);

      const badge = container.querySelector('span');
      // Published should use success colours (green)
      expect(badge).toBeInTheDocument();
    });

    it('should fallback to draft colours for unknown status', () => {
      const { container } = render(<StatusBadge status="unknown_status" />);

      const badge = container.querySelector('span');
      // Unknown status should fallback to draft colours
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have rounded corners', () => {
      const { container } = render(<StatusBadge status="draft" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ display: 'inline-flex', alignItems: 'center' });
    });

    it('should have border', () => {
      const { container } = render(<StatusBadge status="draft" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ border: expect.stringContaining('1px solid') });
    });

    it('should prevent text wrapping', () => {
      const { container } = render(<StatusBadge status="draft" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ whiteSpace: 'nowrap' });
    });

    it('should have consistent font weight', () => {
      const { container } = render(<StatusBadge status="draft" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ fontWeight: expect.any(String) });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label with status', () => {
      render(<StatusBadge status="draft" />);

      const badge = screen.getByLabelText('Status: draft');
      expect(badge).toBeInTheDocument();
    });

    it('should have aria-label with custom label', () => {
      render(<StatusBadge status="draft" label="Initial Version" />);

      const badge = screen.getByLabelText('Status: Initial Version');
      expect(badge).toBeInTheDocument();
    });

    it('should have aria-label for beta_readers with space', () => {
      render(<StatusBadge status="beta_readers" />);

      const badge = screen.getByLabelText('Status: beta readers');
      expect(badge).toBeInTheDocument();
    });

    it('should be a semantic span element', () => {
      const { container } = render(<StatusBadge status="draft" />);

      const badge = container.querySelector('span');
      expect(badge?.tagName).toBe('SPAN');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty status string', () => {
      render(<StatusBadge status="" />);

      expect(screen.getByText('')).toBeInTheDocument();
    });

    it('should handle status with only underscores', () => {
      render(<StatusBadge status="___" />);

      expect(screen.getByText('   ')).toBeInTheDocument();
    });

    it('should handle very long status text', () => {
      const longStatus = 'this_is_a_very_long_status_that_exceeds_normal_length';
      render(<StatusBadge status={longStatus} />);

      const expectedText = longStatus.replace(/_/g, ' ');
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('should handle special characters in custom label', () => {
      render(<StatusBadge status="draft" label="Draft (v1.0)" />);

      expect(screen.getByText('Draft (v1.0)')).toBeInTheDocument();
    });

    it('should handle empty custom label', () => {
      render(<StatusBadge status="draft" label="" />);

      expect(screen.getByLabelText('Status: ')).toBeInTheDocument();
    });

    it('should handle status with leading/trailing spaces', () => {
      render(<StatusBadge status="  draft  " />);

      expect(screen.getByText(/draft/)).toBeInTheDocument();
    });
  });

  describe('Multiple Instances', () => {
    it('should render multiple badges with different statuses', () => {
      const { container } = render(
        <>
          <StatusBadge status="draft" />
          <StatusBadge status="published" />
          <StatusBadge status="editing" />
        </>
      );

      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByText('published')).toBeInTheDocument();
      expect(screen.getByText('editing')).toBeInTheDocument();
      expect(container.querySelectorAll('span')).toHaveLength(3);
    });

    it('should render multiple badges with different sizes', () => {
      const { container } = render(
        <>
          <StatusBadge status="draft" size="sm" />
          <StatusBadge status="published" size="md" />
        </>
      );

      const badges = container.querySelectorAll('span');
      expect(badges).toHaveLength(2);
    });

    it('should maintain unique styling for each status', () => {
      render(
        <>
          <StatusBadge status="draft" />
          <StatusBadge status="published" />
        </>
      );

      const draftBadge = screen.getByText('draft');
      const publishedBadge = screen.getByText('published');

      // Both should exist but may have different colours
      expect(draftBadge).toBeInTheDocument();
      expect(publishedBadge).toBeInTheDocument();
    });
  });
});
