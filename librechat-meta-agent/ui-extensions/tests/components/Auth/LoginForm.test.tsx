// vitest import removed - Jest globals used
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/Auth/LoginForm';
import * as AuthContext from '@/lib/auth/auth-context';

// Mock the auth context
const mockSignIn = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignInWithMagicLink = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signInWithOAuth: mockSignInWithOAuth,
    signInWithMagicLink: mockSignInWithMagicLink,
    user: null,
    session: null,
    loading: false,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render the login form correctly', () => {
      render(<LoginForm />);

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to continue to Meta Agent')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render OAuth buttons', () => {
      render(<LoginForm />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
    });

    it('should render remember me checkbox', () => {
      render(<LoginForm />);

      const rememberCheckbox = screen.getByRole('checkbox', { name: /remember me/i });
      expect(rememberCheckbox).toBeInTheDocument();
      expect(rememberCheckbox).not.toBeChecked();
    });

    it('should render forgot password link', () => {
      render(<LoginForm />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password');
    });

    it('should render sign up link', () => {
      render(<LoginForm />);

      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/signup');
    });

    it('should render magic link toggle button', () => {
      render(<LoginForm />);

      expect(screen.getByRole('button', { name: /use magic link instead/i })).toBeInTheDocument();
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email addresses', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      expect(emailInput.value).toBe('test@example.com');
      expect(emailInput).toBeValid();
    });

    it('should have email input with type="email"', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should require email field', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have placeholder text for email', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');
    });
  });

  describe('Password Field', () => {
    it('should mask password input', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should accept password input', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      await user.type(passwordInput, 'mySecurePassword123');

      expect(passwordInput.value).toBe('mySecurePassword123');
    });

    it('should require password field', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should have placeholder for password', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('placeholder', '••••••••');
    });

    it('should hide password field when magic link mode is active', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // Toggle to magic link mode
      const magicLinkToggle = screen.getByRole('button', { name: /use magic link instead/i });
      await user.click(magicLinkToggle);

      // Password field should not be visible
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when form is invalid (empty fields)', () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

      // Initially empty - browser validation would prevent submission
      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
    });

    it('should enable submit when both fields are filled', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button while loading', async () => {
      const user = userEvent.setup();
      mockSignIn.mockImplementation(() => new Promise(() => {}));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show spinner animation during loading', async () => {
      const user = userEvent.setup();
      mockSignIn.mockImplementation(() => new Promise(() => {}));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        const spinner = submitButton.querySelector('svg.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should disable OAuth buttons while loading', async () => {
      const user = userEvent.setup();
      mockSignInWithOAuth.mockImplementation(() => new Promise(() => {}));

      render(<LoginForm />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(googleButton).toBeDisabled();
        expect(screen.getByRole('button', { name: /continue with github/i })).toBeDisabled();
      });
    });
  });

  describe('Error Messages', () => {
    it('should display error message when login fails', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should display generic error on unexpected failure', async () => {
      const user = userEvent.setup();
      mockSignIn.mockRejectedValue(new Error('Network error'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });

    it('should clear error message on new submission', async () => {
      const user = userEvent.setup();
      mockSignIn
        .mockResolvedValueOnce({ error: { message: 'Invalid credentials' } })
        .mockResolvedValueOnce({ error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First attempt - error
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Second attempt - should clear error
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call signIn with correct data on submit', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockSignIn).toHaveBeenCalledTimes(1);
      });
    });

    it('should redirect to home on successful login', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should not redirect on failed login', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Magic Link Mode', () => {
    it('should toggle to magic link mode', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const magicLinkToggle = screen.getByRole('button', { name: /use magic link instead/i });
      await user.click(magicLinkToggle);

      expect(screen.getByRole('button', { name: /use password instead/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
    });

    it('should call signInWithMagicLink in magic link mode', async () => {
      const user = userEvent.setup();
      mockSignInWithMagicLink.mockResolvedValue({ error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const magicLinkToggle = screen.getByRole('button', { name: /use magic link instead/i });

      await user.click(magicLinkToggle);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithMagicLink).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should show success message after sending magic link', async () => {
      const user = userEvent.setup();
      mockSignInWithMagicLink.mockResolvedValue({ error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const magicLinkToggle = screen.getByRole('button', { name: /use magic link instead/i });

      await user.click(magicLinkToggle);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Check your email for the magic link!')).toBeInTheDocument();
      });
    });

    it('should show loading text "Sending..." in magic link mode', async () => {
      const user = userEvent.setup();
      mockSignInWithMagicLink.mockImplementation(() => new Promise(() => {}));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const magicLinkToggle = screen.getByRole('button', { name: /use magic link instead/i });

      await user.click(magicLinkToggle);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument();
      });
    });
  });

  describe('OAuth Authentication', () => {
    it('should call signInWithOAuth for Google', async () => {
      const user = userEvent.setup();
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      render(<LoginForm />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith('google');
      });
    });

    it('should call signInWithOAuth for GitHub', async () => {
      const user = userEvent.setup();
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      render(<LoginForm />);

      const githubButton = screen.getByRole('button', { name: /continue with github/i });
      await user.click(githubButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith('github');
      });
    });

    it('should show error message on OAuth failure', async () => {
      const user = userEvent.setup();
      mockSignInWithOAuth.mockResolvedValue({ error: { message: 'OAuth failed' } });

      render(<LoginForm />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('OAuth failed')).toBeInTheDocument();
      });
    });
  });

  describe('Remember Me Functionality', () => {
    it('should toggle remember me checkbox', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const rememberCheckbox = screen.getByRole('checkbox', { name: /remember me/i }) as HTMLInputElement;
      expect(rememberCheckbox).not.toBeChecked();

      await user.click(rememberCheckbox);
      expect(rememberCheckbox).toBeChecked();

      await user.click(rememberCheckbox);
      expect(rememberCheckbox).not.toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      render(<LoginForm />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should have accessible submit button', () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should have heading for the form', () => {
      render(<LoginForm />);

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });
  });
});
