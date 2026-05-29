import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

// All user-facing auth copy lives here (no inline strings in components).
export const authMessages = {
  signIn: {
    title: 'Sign in',
    subtitle: 'Welcome back to ContentEngine.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Your password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    switchPrompt: "Don't have an account?",
    switchCta: 'Create one',
    success: 'Signed in.',
  },
  signUp: {
    title: 'Create your account',
    subtitle: 'Start organizing your content operation.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    submit: 'Create account',
    submitting: 'Creating account…',
    switchPrompt: 'Already have an account?',
    switchCta: 'Sign in',
    success: 'Account created. Let’s set things up.',
  },
  signOut: {
    success: 'Signed out.',
  },
  requiredField: 'required',
} as const;

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.NOT_AUTHENTICATED]: 'Incorrect email or password.',
  [ERROR_CODES.CONFLICT]: 'An account with that email already exists. Try signing in instead.',
  [ERROR_CODES.VALIDATION_FAILED]: 'Please check your details and try again.',
  [ERROR_CODES.RATE_LIMITED]: 'Too many attempts. Wait a moment and try again.',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Check your connection and try again.',
  [ERROR_CODES.FORBIDDEN]: 'You don’t have permission to do that.',
  [ERROR_CODES.NOT_FOUND]: 'We couldn’t find what you were looking for.',
  [ERROR_CODES.INVALID_RESPONSE]: 'The server returned an unexpected response.',
  [ERROR_CODES.INTERNAL_ERROR]: 'Something went wrong. Please try again.',
};

export function authErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code];
}
