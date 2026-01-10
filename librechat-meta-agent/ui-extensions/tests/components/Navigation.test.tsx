// vitest import removed - Jest globals used
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnifiedNav, MainContent } from '../../components/Navigation/UnifiedNav';

// Mock usePathname
const mockPathname = vi.fn(() => '/');
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation');
  return {
    ...actual,
    usePathname: () => mockPathname(),
  };
});

describe('UnifiedNav Component', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/');
    vi.clearAllMocks();
  });

  describe('Desktop Navigation', () => {
    it('should render logo and title', () => {
      render(<UnifiedNav />);

      expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      expect(screen.getByText('AI-Powered Assistant')).toBeInTheDocument();
    });

    it('should render all main navigation items', () => {
      render(<UnifiedNav />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Thinking')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
    });

    it('should render create section items', () => {
      render(<UnifiedNav />);

      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Videos')).toBeInTheDocument();
      expect(screen.getByText('Voice')).toBeInTheDocument();
    });

    it('should render tools section items', () => {
      render(<UnifiedNav />);

      expect(screen.getByText('Computer')).toBeInTheDocument();
      expect(screen.getByText('Personas')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Workspace')).toBeInTheDocument();
      expect(screen.getByText('Memory')).toBeInTheDocument();
      expect(screen.getByText('Tools')).toBeInTheDocument();
    });

    it('should display section headers', () => {
      render(<UnifiedNav />);

      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Tools')).toBeInTheDocument();
    });

    it('should show NEW badges on appropriate items', () => {
      render(<UnifiedNav />);

      const badges = screen.getAllByText('NEW');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Active Navigation State', () => {
    it('should highlight active route', () => {
      mockPathname.mockReturnValue('/chat');
      render(<UnifiedNav />);

      const chatLink = screen.getAllByRole('link', { name: /chat/i })[0];
      expect(chatLink).toHaveClass('bg-white/10');
    });

    it('should highlight dashboard when on home route', () => {
      mockPathname.mockReturnValue('/');
      render(<UnifiedNav />);

      const dashboardLink = screen.getAllByRole('link', { name: /dashboard/i })[0];
      expect(dashboardLink).toHaveClass('bg-white/10');
    });

    it('should update active state when route changes', () => {
      const { rerender } = render(<UnifiedNav />);

      mockPathname.mockReturnValue('/thinking');
      rerender(<UnifiedNav />);

      const thinkingLink = screen.getAllByRole('link', { name: /thinking/i })[0];
      expect(thinkingLink).toHaveClass('bg-white/10');
    });

    it('should apply hover styles to non-active items', () => {
      mockPathname.mockReturnValue('/');
      render(<UnifiedNav />);

      const chatLink = screen.getAllByRole('link', { name: /chat/i })[0];
      expect(chatLink).not.toHaveClass('bg-white/10');
      expect(chatLink).toHaveClass('hover:bg-white/5');
    });
  });

  describe('Navigation Links', () => {
    it('should have correct href attributes for main items', () => {
      render(<UnifiedNav />);

      const dashboardLink = screen.getAllByRole('link', { name: /dashboard/i })[0];
      expect(dashboardLink).toHaveAttribute('href', '/');

      const chatLink = screen.getAllByRole('link', { name: /chat/i })[0];
      expect(chatLink).toHaveAttribute('href', '/chat');

      const thinkingLink = screen.getAllByRole('link', { name: /thinking/i })[0];
      expect(thinkingLink).toHaveAttribute('href', '/thinking');

      const researchLink = screen.getAllByRole('link', { name: /research/i })[0];
      expect(researchLink).toHaveAttribute('href', '/research');
    });

    it('should have correct href attributes for create items', () => {
      render(<UnifiedNav />);

      const imagesLink = screen.getAllByRole('link', { name: /images/i })[0];
      expect(imagesLink).toHaveAttribute('href', '/images');

      const videosLink = screen.getAllByRole('link', { name: /videos/i })[0];
      expect(videosLink).toHaveAttribute('href', '/videos');

      const voiceLink = screen.getAllByRole('link', { name: /voice/i })[0];
      expect(voiceLink).toHaveAttribute('href', '/voice');
    });

    it('should have correct href attributes for tools items', () => {
      render(<UnifiedNav />);

      const computerLink = screen.getAllByRole('link', { name: /computer/i })[0];
      expect(computerLink).toHaveAttribute('href', '/computer');

      const personasLink = screen.getAllByRole('link', { name: /personas/i })[0];
      expect(personasLink).toHaveAttribute('href', '/personas');

      const memoryLink = screen.getAllByRole('link', { name: /memory/i })[0];
      expect(memoryLink).toHaveAttribute('href', '/memory');
    });
  });

  describe('Mobile Navigation', () => {
    it('should render mobile header', () => {
      render(<UnifiedNav />);

      // Mobile header should be present (hidden on desktop)
      const headers = screen.getAllByText('Meta Agent');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should show menu button on mobile', () => {
      render(<UnifiedNav />);

      // Menu button should exist in the mobile header
      const nav = screen.getByRole('banner');
      const menuButton = within(nav).getByRole('button');
      expect(menuButton).toBeInTheDocument();
    });

    it('should toggle mobile menu when button is clicked', () => {
      render(<UnifiedNav />);

      const nav = screen.getByRole('banner');
      const menuButton = within(nav).getByRole('button');

      // Initially closed
      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('-translate-x-full');

      // Open menu
      fireEvent.click(menuButton);
      expect(sidebar).toHaveClass('translate-x-0');

      // Close menu
      fireEvent.click(menuButton);
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('should close menu when clicking a nav item', () => {
      render(<UnifiedNav />);

      const nav = screen.getByRole('banner');
      const menuButton = within(nav).getByRole('button');

      // Open menu
      fireEvent.click(menuButton);

      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('translate-x-0');

      // Click a navigation item
      const chatLink = screen.getAllByRole('link', { name: /chat/i })[0];
      fireEvent.click(chatLink);

      // Menu should be closed
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('should render bottom navigation bar', () => {
      render(<UnifiedNav />);

      // Bottom nav should contain quick access items
      const bottomNav = document.querySelector('nav.fixed.bottom-0');
      expect(bottomNav).toBeInTheDocument();
    });

    it('should show 5 items in bottom navigation', () => {
      render(<UnifiedNav />);

      const bottomNav = document.querySelector('nav.fixed.bottom-0');
      const links = bottomNav?.querySelectorAll('a');
      expect(links?.length).toBe(5);
    });
  });

  describe('Usage Statistics', () => {
    it('should display usage statistics card', () => {
      render(<UnifiedNav />);

      expect(screen.getByText("Today's Usage")).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('should show correct usage numbers', () => {
      render(<UnifiedNav />);

      expect(screen.getByText('247')).toBeInTheDocument(); // Messages
      expect(screen.getByText('12')).toBeInTheDocument(); // Research
      expect(screen.getByText('34')).toBeInTheDocument(); // Images
      expect(screen.getByText('8')).toBeInTheDocument(); // Tasks
    });

    it('should use proper color coding for stats', () => {
      render(<UnifiedNav />);

      const messagesValue = screen.getByText('247');
      expect(messagesValue).toHaveClass('text-purple-400');

      const researchValue = screen.getByText('12');
      expect(researchValue).toHaveClass('text-cyan-400');

      const imagesValue = screen.getByText('34');
      expect(imagesValue).toHaveClass('text-pink-400');

      const tasksValue = screen.getByText('8');
      expect(tasksValue).toHaveClass('text-orange-400');
    });
  });

  describe('Icons', () => {
    it('should render icons for all navigation items', () => {
      render(<UnifiedNav />);

      // Each nav item should have an SVG icon
      const navItems = screen.getAllByRole('link');
      navItems.forEach((item) => {
        const svg = item.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should apply color classes to icons', () => {
      render(<UnifiedNav />);

      const dashboardLink = screen.getAllByRole('link', { name: /dashboard/i })[0];
      const icon = dashboardLink.querySelector('div');
      expect(icon).toHaveClass('text-blue-400');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic navigation elements', () => {
      render(<UnifiedNav />);

      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
    });

    it('should have accessible link names', () => {
      render(<UnifiedNav />);

      const chatLink = screen.getAllByRole('link', { name: /chat/i })[0];
      expect(chatLink).toHaveAccessibleName();
    });

    it('should maintain focus visibility', () => {
      render(<UnifiedNav />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveClass('transition-all');
      });
    });
  });

  describe('MainContent Component', () => {
    it('should render children', () => {
      render(
        <MainContent>
          <div>Test Content</div>
        </MainContent>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should apply correct layout classes', () => {
      const { container } = render(
        <MainContent>
          <div>Test</div>
        </MainContent>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('lg:ml-72');
      expect(main).toHaveClass('min-h-screen');
    });

    it('should handle complex children', () => {
      render(
        <MainContent>
          <div>
            <h1>Title</h1>
            <p>Paragraph</p>
            <button>Action</button>
          </div>
        </MainContent>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should hide sidebar on mobile by default', () => {
      render(<UnifiedNav />);

      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('-translate-x-full');
      expect(sidebar).toHaveClass('lg:translate-x-0');
    });

    it('should show desktop logo only on large screens', () => {
      render(<UnifiedNav />);

      const logoContainer = screen.getByText('AI-Powered Assistant').parentElement;
      expect(logoContainer).toHaveClass('hidden');
      expect(logoContainer).toHaveClass('lg:flex');
    });

    it('should show mobile bottom nav only on small screens', () => {
      render(<UnifiedNav />);

      const bottomNav = document.querySelector('nav.lg\\:hidden.fixed.bottom-0');
      expect(bottomNav).toBeInTheDocument();
      expect(bottomNav).toHaveClass('lg:hidden');
    });
  });
});
