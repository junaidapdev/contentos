// Copy for the shared feedback primitives. Cross-feature so it lives next to the components.
// Feature-local empty/error copy (e.g., "No ideas yet") stays in each feature's own messages.ts;
// these are the strings that the primitives themselves own.

export const feedbackMessages = {
  errorState: {
    retry: 'Try again',
    codeAria: (code: string) => `Error code: ${code}`,
  },
  networkErrorState: {
    title: 'We can’t reach the server right now.',
    body: 'Check your connection and try again. Your work is not lost.',
    retry: 'Try again',
  },
  routeErrorBoundary: {
    title: 'Something went wrong on this page.',
    body: 'The error has been logged. You can try again, or go back to the dashboard.',
    retry: 'Try again',
    goDashboard: 'Go to dashboard',
  },
} as const;
