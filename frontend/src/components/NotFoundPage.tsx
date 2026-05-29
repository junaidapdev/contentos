import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { NOT_FOUND_MESSAGES } from '@/constants/messages';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">{NOT_FOUND_MESSAGES.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{NOT_FOUND_MESSAGES.body}</p>
      </div>
      <Button asChild>
        <Link to={ROUTES.HOME}>{NOT_FOUND_MESSAGES.cta}</Link>
      </Button>
    </div>
  );
}
