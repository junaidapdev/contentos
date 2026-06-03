import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// On every route change, find the first <h1> inside <main> (or <body> as fallback) and focus it.
//
// Why:
//   - Screen reader users need an explicit cue that the page changed; without focus management
//     focus stays on whatever link they clicked, and the new heading is not announced.
//   - The <h1> is set tabindex="-1" right before focus so it's keyboard-focusable but stays out
//     of the regular tab order — sighted keyboard users see a focus ring, then continue tabbing.
//   - preventScroll: true keeps the existing scroll position. Re-focusing the heading should not
//     jerk the viewport; the user is already looking at the new page.
//
// Mounted inside <AppShell> so it fires for every authenticated route. The public auth/onboarding
// pages don't get it — they have their own scoped focus behavior and would only blur an active
// input.
export function useFocusOnRouteChange(): void {
  const location = useLocation();
  useEffect(() => {
    // Defer to the next frame so the new page has actually mounted and its <h1> exists in the
    // DOM. Without this the query returns the previous page's heading.
    const handle = window.requestAnimationFrame(() => {
      const main = document.querySelector('main') ?? document.body;
      const heading = main.querySelector<HTMLHeadingElement>('h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    });
    return () => {
      window.cancelAnimationFrame(handle);
    };
  }, [location.pathname]);
}
