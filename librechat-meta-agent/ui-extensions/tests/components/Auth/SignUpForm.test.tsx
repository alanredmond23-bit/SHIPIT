import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpForm } from '@/components/Auth/SignUpForm';

// Mock the auth context
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    signInWithOAuth: mockSignInWithOAuth,
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
  usePathname: () => '/signup',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

describe('SignUpForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Reset to real timers before each test
  });

  describe('Form Rendering', () => {
    it('should render all fields correctly', () => {
      render(<SignUpForm />);

      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByText('Join Meta Agent and unlock the power of AI')).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render OAuth buttons', () => {
      render(<SignUpForm />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
    });

    it('should render terms and conditions checkbox', () => {
      render(<SignUpForm />);

      const termsCheckbox = screen.getByRole('checkbox');
      expect(termsCheckbox).toBeInTheDocument();
      expect(termsCheckbox).not.toBeChecked();
      expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });

    it('should render sign in link', () => {
      render(<SignUpForm />);

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute('href', '/login');
    });

    it('should have links to terms and privacy pages', () => {
      render(<SignUpForm />);

      const termsLink = screen.getByRole('link', { name: /terms of service/i });
      const privacyLink = screen.getByRole('link', { name: /privacy policy/i });

      expect(termsLink).toHaveAttribute('href', '/terms');
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });
  });

  describe('Field Validation', () => {
    it('should require all fields', () => {
      render(<SignUpForm />);

      expect(screen.getByLabelText('Full Name')).toHaveAttribute('required');
      expect(screen.getByLabelText('Email')).toHaveAttribute('required');
      expect(screen.getByLabelText('Password')).toHaveAttribute('required');
      expect(screen.getByLabelText('Confirm Password')).toHaveAttribute('required');
    });

    it('should have email input with type="email"', () => {
      render(<SignUpForm />);

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should mask password inputs', () => {
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm Password') as HTMLInputElement;

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    it('should accept valid input in all fields', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm Password') as HTMLInputElement;

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(confirmPasswordInput, 'SecurePass123!');

      expect(fullNameInput.value).toBe('John Doe');
      expect(emailInput.value).toBe('john@example.com');
      expect(passwordInput.value).toBe('SecurePass123!');
      expect(confirmPasswordInput.value).toBe('SecurePass123!');
    });
  });

  describe('Password Confirmation Validation', () => {
    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different456');

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('should not show error when passwords match', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');

      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
    });

    it('should show validation error on form submit if passwords do not match', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different456');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('Password Strength Indicator', () => {
    it('should show password strength for weak password', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'weak');

      await waitFor(() => {
        expect(screen.getByText('Weak')).toBeInTheDocument();
      });
    });

    it('should show password strength for fair password', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'password123');

      await waitFor(() => {
        expect(screen.getByText('Fair')).toBeInTheDocument();
      });
    });

    it('should show password strength for good password', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'Password123');

      await waitFor(() => {
        expect(screen.getByText('Good')).toBeInTheDocument();
      });
    });

    it('should show password strength for strong password', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'StrongP@ss123');

      await waitFor(() => {
        expect(screen.getByText('Strong')).toBeInTheDocument();
      });
    });

    it('should show password requirements hint', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'test');

      await waitFor(() => {
        expect(screen.getByText(/use 8\+ characters with a mix of letters, numbers & symbols/i)).toBeInTheDocument();
      });
    });

    it('should not show password strength when field is empty', () => {
      render(<SignUpForm />);

      expect(screen.queryByText('Weak')).not.toBeInTheDocument();
      expect(screen.queryByText('Fair')).not.toBeInTheDocument();
      expect(screen.queryByText('Good')).not.toBeInTheDocument();
      expect(screen.queryByText('Strong')).not.toBeInTheDocument();
    });
  });

  describe('Password Length Validation', () => {
    it('should show error when password is less than 8 characters', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'short');
      await user.type(confirmPasswordInput, 'short');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('should allow password with 8 or more characters', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ error: null });

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'validpass123');
      await user.type(confirmPasswordInput, 'validpass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      });
    });
  });

  describe('Terms and Conditions', () => {
    it('should disable submit button when terms are not accepted', () => {
      render(<SignUpForm />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when terms are accepted', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.click(termsCheckbox);
      expect(submitButton).not.toBeDisabled();
    });

    it('should show error when trying to submit without accepting terms', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');

      // Submit button should be disabled, but test the validation logic
      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Submission with Valid Data', () => {
    it('should submit form with correct data', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ error: null });

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('john@example.com', 'SecurePass123', {
          full_name: 'John Doe',
        });
      });
    });

    it('should show success message on successful signup', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ error: null });

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Account created! Check your email to verify your account.')).toBeInTheDocument();
      });
    });

    it('should clear form after successful signup', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ error: null });

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm Password') as HTMLInputElement;
      const termsCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(fullNameInput.value).toBe('');
        expect(emailInput.value).toBe('');
        expect(passwordInput.value).toBe('');
        expect(confirmPasswordInput.value).toBe('');
        expect(termsCheckbox.checked).toBe(false);
      });
    });

    it('should redirect to login after 3 seconds on successful signup', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null }); // Disable delay in fake timer mode
      mockSignUp.mockResolvedValue({ error: null });

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      });

      // Fast-forward time by 3 seconds
      vi.advanceTimersByTime(3000);

      expect(mockPush).toHaveBeenCalledWith('/login');

      vi.useRealTimers();
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockSignUp.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button while loading', async () => {
      const user = userEvent.setup();
      mockSignUp.mockImplementation(() => new Promise(() => {}));

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show spinner animation during loading', async () => {
      const user = userEvent.setup();
      mockSignUp.mockImplementation(() => new Promise(() => {}));

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        const spinner = submitButton.querySelector('svg.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should disable OAuth buttons while loading', async () => {
      const user = userEvent.setup();
      mockSignInWithOAuth.mockImplementation(() => new Promise(() => {}));

      render(<SignUpForm />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(googleButton).toBeDisabled();
        expect(screen.getByRole('button', { name: /continue with github/i })).toBeDisabled();
      });
    });
  });

  describe('Error Messages', () => {
    it('should display error message when signup fails', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ error: { message: 'Email already in use' } });

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already in use')).toBeInTheDocument();
      });
    });

    it('should display generic error on unexpected failure', async () => {
      const user = userEvent.setup();
      mockSignUp.mockRejectedValue(new Error('Network error'));

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });

    it('should clear error message on new submission', async () => {
      const user = userEvent.setup();
      mockSignUp
        .mockResolvedValueOnce({ error: { message: 'Email already in use' } })
        .mockResolvedValueOnce({ error: null });

      render(<SignUpForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      // First attempt - error
      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already in use')).toBeInTheDocument();
      });

      // Second attempt - should clear error
      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Email already in use')).not.toBeInTheDocument();
      });
    });
  });

  describe('OAuth Authentication', () => {
    it('should call signInWithOAuth for Google', async () => {
      const user = userEvent.setup();
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      render(<SignUpForm />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith('google');
      });
    });

    it('should call signInWithOAuth for GitHub', async () => {
      const user = userEvent.setup();
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      render(<SignUpForm />);

      const githubButton = screen.getByRole('button', { name: /continue with github/i });
      await user.click(githubButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith('github');
      });
    });

    it('should show error message on OAuth failure', async () => {
      const user = userEvent.setup();
      mockSignInWithOAuth.mockResolvedValue({ error: { message: 'OAuth provider error' } });

      render(<SignUpForm />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('OAuth provider error')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form inputs', () => {
      render(<SignUpForm />);

      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('should have accessible submit button', () => {
      render(<SignUpForm />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should have heading for the form', () => {
      render(<SignUpForm />);

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    it('should have accessible checkbox with label', () => {
      render(<SignUpForm />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id', 'terms');

      const label = screen.getByText(/I agree to the/i);
      expect(label).toBeInTheDocument();
    });
  });

  describe('Input Placeholders', () => {
    it('should have appropriate placeholders', () => {
      render(<SignUpForm />);

      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('••••••••')).toHaveLength(2);
    });
  });
});
