import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';

import App from '@/App';
import { queryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import '@/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Toaster defaults locked in chunk-12 decisions:
//   - position bottom-right on desktop; CSS overrides position to bottom-center on small viewports.
//     Implemented via [data-sonner-toaster] in index.css.
//   - duration is set per-toast via the lib/toast.ts wrapper (3s success / 5s error / 3s info).
//   - max 3 stacked at a time; newer toasts push older ones out.
//   - all dismissable via closeButton.
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors closeButton position="bottom-right" expand={false} visibleToasts={3} />
    </QueryClientProvider>
  </React.StrictMode>,
);
