import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { COMMON_MESSAGES, HOME_MESSAGES } from '@/constants/messages';

// Public landing placeholder (later chunks can flesh out the marketing surface).
export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="max-w-xl space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">{COMMON_MESSAGES.appName}</h1>
        <p className="text-lg">{HOME_MESSAGES.tagline}</p>
        <p className="text-sm text-muted-foreground">{HOME_MESSAGES.blurb}</p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link to={ROUTES.SIGN_UP}>{HOME_MESSAGES.signUp}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={ROUTES.SIGN_IN}>{HOME_MESSAGES.signIn}</Link>
        </Button>
      </div>
    </div>
  );
}
