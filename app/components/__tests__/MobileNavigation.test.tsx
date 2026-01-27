import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import MobileNavigation from '../MobileNavigation';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

describe('MobileNavigation', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/');

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('Mobile Header', () => {
    it('should render mobile header with logo and hamburger button', () => {
      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
      expect(screen.getByText('NovelForge')).toBeInTheDocument();
      expect(screen.getByText('N')).toBeInTheDocument();
    });

    it('should render logo as link to home page', () => {
      const { container } = render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const logoLink = container.querySelector('a[href="/"]');
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveTextContent('NovelForge');
    });

    it('should display online status indicator', () => {
      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const onlineIndicator = screen.getByTitle('Online');
      expect(onlineIndicator).toBeInTheDocument();
    });

    it('should display offline status indicator when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const offlineIndicator = screen.getByTitle('Offline');
      expect(offlineIndicator).toBeInTheDocument();
    });
  });

  describe('Hamburger Menu Toggle', () => {
    it('should open drawer when hamburger button clicked', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const hamburgerButton = screen.getByLabelText('Open menu');
      await user.click(hamburgerButton);

      // Verify the button state changed
      expect(hamburgerButton).toHaveAttribute('aria-expanded', 'true');
      expect(hamburgerButton).toHaveAttribute('aria-label', 'Close menu');
    });

    it('should close drawer when close button clicked', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const openButton = screen.getByLabelText('Open menu');
      await user.click(openButton);

      // Find all close buttons and click the one in the drawer
      const closeButtons = container.querySelectorAll('button[aria-label="Close menu"]');
      const drawerCloseButton = Array.from(closeButtons).find((btn) =>
        btn.parentElement?.textContent?.includes('Menu')
      );
      expect(drawerCloseButton).toBeInTheDocument();

      if (drawerCloseButton) {
        await user.click(drawerCloseButton as HTMLElement);
      }

      // Wait for state update
      await waitFor(() => {
        expect(screen.getByLabelText('Open menu')).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should toggle hamburger icon when drawer opens', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const hamburgerButton = screen.getByLabelText('Open menu');

      // Check initial hamburger icon (three lines)
      expect(hamburgerButton.querySelector('svg')).toBeInTheDocument();

      await user.click(hamburgerButton);

      // After opening, hamburger button changes to show X icon and updates aria-label
      expect(hamburgerButton).toHaveAttribute('aria-label', 'Close menu');
      expect(hamburgerButton.querySelector('svg')).toBeInTheDocument();
    });

    it('should update aria-expanded attribute on hamburger button', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const hamburgerButton = screen.getByLabelText('Open menu');
      expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(hamburgerButton);

      expect(hamburgerButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Navigation Drawer', () => {
    it('should render all navigation items in drawer', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      await user.click(screen.getByLabelText('Open menu'));

      expect(screen.getByRole('link', { name: /Projects/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /New Project/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
    });

    it('should highlight active navigation item', async () => {
      const user = userEvent.setup();
      vi.mocked(usePathname).mockReturnValue('/settings');

      const { container } = render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      await user.click(screen.getByLabelText('Open menu'));

      const settingsLink = container.querySelector('a[href="/settings"]');
      expect(settingsLink).toBeInTheDocument();
      // The active item has different colour and background
      expect(settingsLink?.getAttribute('style')).toContain('color');
      expect(settingsLink?.getAttribute('style')).toContain('background');
    });

    it('should render navigation with correct ARIA labels', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      await user.click(screen.getByLabelText('Open menu'));

      // The drawer nav element has aria-label
      const nav = container.querySelector('nav.mobile-drawer');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Mobile navigation');
    });

    it('should display drawer footer with version', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      await user.click(screen.getByLabelText('Open menu'));

      expect(screen.getByText('NovelForge v1.0')).toBeInTheDocument();
    });

    it('should set aria-hidden to false when drawer is open', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const nav = screen.getByLabelText('Mobile navigation');
      expect(nav).toHaveAttribute('aria-hidden', 'true');

      await user.click(screen.getByLabelText('Open menu'));

      expect(nav).toHaveAttribute('aria-hidden', 'false');
    });
  });

  describe('Overlay Behaviour', () => {
    it('should render overlay when drawer is open', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      await user.click(screen.getByLabelText('Open menu'));

      const overlay = container.querySelector('[aria-hidden="true"][style*="position: fixed"]');
      expect(overlay).toBeInTheDocument();
    });

    it('should close drawer when overlay is clicked', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      await user.click(screen.getByLabelText('Open menu'));

      const overlay = container.querySelector('[aria-hidden="true"][style*="position: fixed"]');
      if (overlay) {
        await user.click(overlay);
      }

      await waitFor(() => {
        expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should close drawer on Escape key press', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const hamburgerButton = screen.getByLabelText('Open menu');
      await user.click(hamburgerButton);
      expect(hamburgerButton).toHaveAttribute('aria-expanded', 'true');

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should not respond to Escape key when drawer is closed', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const initialButton = screen.getByLabelText('Open menu');
      await user.keyboard('{Escape}');

      // Should remain unchanged
      expect(initialButton).toBeInTheDocument();
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when drawer opens', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      expect(document.body.style.overflow).toBe('');

      await user.click(screen.getByLabelText('Open menu'));

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should unlock body scroll when drawer closes', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const hamburgerButton = screen.getByLabelText('Open menu');
      await user.click(hamburgerButton);
      expect(document.body.style.overflow).toBe('hidden');

      // Click hamburger again to close (it toggles)
      await user.click(hamburgerButton);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      });
    });

    it('should restore body scroll on unmount', () => {
      const { unmount } = render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      document.body.style.overflow = 'hidden';
      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Route Change Behaviour', () => {
    it('should close drawer when pathname changes', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const hamburgerButton = screen.getByLabelText('Open menu');
      await user.click(hamburgerButton);
      expect(hamburgerButton).toHaveAttribute('aria-expanded', 'true');

      // Simulate route change
      vi.mocked(usePathname).mockReturnValue('/settings');
      rerender(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      await waitFor(() => {
        expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('Online/Offline Status', () => {
    it('should show offline banner when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const offlineBanner = screen.getByRole('alert');
      expect(offlineBanner).toHaveTextContent("You're offline. Some features may be unavailable.");
    });

    it('should not show offline banner when online', () => {
      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should update status when going offline', async () => {
      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should update status when going online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Content Rendering', () => {
    it('should render children content', () => {
      render(
        <MobileNavigation>
          <div data-testid="child-content">Test Content</div>
        </MobileNavigation>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Touch Target Accessibility', () => {
    it('should have minimum touch target size for hamburger button', () => {
      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      const hamburgerButton = screen.getByLabelText('Open menu');
      expect(hamburgerButton).toHaveStyle({
        width: '44px',
        height: '44px',
      });
    });

    it('should have minimum touch target size for navigation links', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigation>
          <div>Test Content</div>
        </MobileNavigation>
      );

      await user.click(screen.getByLabelText('Open menu'));

      const projectsLink = screen.getByRole('link', { name: /Projects/i });
      expect(projectsLink).toHaveStyle({
        minHeight: '44px',
      });
    });
  });
});
