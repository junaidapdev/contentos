import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FullPageLoader } from '@/components/FullPageLoader';
import { RequiredMark } from '@/components/RequiredMark';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/features/auth/useAuth';
import { useSignUp } from '@/features/auth/useSignUp';
import { useOnboardingStatus } from '@/features/onboarding/useOnboardingStatus';
import { SignUpSchema, type SignUpInput } from '@/features/auth/auth-schemas';
import { authErrorMessage, authMessages } from '@/features/auth/messages';
import { toErrorCode } from '@/features/auth/auth-errors';

const m = authMessages.signUp;

export function SignUpPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const onboarding = useOnboardingStatus();
  const signUp = useSignUp();

  const form = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { email: '', password: '' },
  });

  // Signed-in users don't belong on the auth pages.
  if (isLoading || (user && onboarding.isLoading)) {
    return <FullPageLoader />;
  }
  if (user) {
    return (
      <Navigate to={onboarding.data?.isOnboarded ? ROUTES.DASHBOARD : ROUTES.ONBOARDING} replace />
    );
  }

  const onSubmit = (values: SignUpInput): void => {
    signUp.mutate(values, {
      onSuccess: () => {
        toast.success(m.success);
        navigate(ROUTES.ONBOARDING);
      },
      onError: (error: unknown) => {
        toast.error(authErrorMessage(toErrorCode(error)));
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          {/* h1 used for the page heading. Auth pages render outside <AppShell>, so the
              route-focus hook doesn't fire here, but a real h1 still matters for the document
              outline + screen-reader page identification. */}
          <h1 className="text-2xl font-semibold">{m.title}</h1>
          <CardDescription>{m.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {signUp.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{authErrorMessage(toErrorCode(signUp.error))}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form
              onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {m.emailLabel} <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder={m.emailPlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {m.passwordLabel} <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={m.passwordPlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={signUp.isPending}
                aria-busy={signUp.isPending}
              >
                {signUp.isPending ? m.submitting : m.submit}
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {m.switchPrompt}{' '}
            <Link
              to={ROUTES.SIGN_IN}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {m.switchCta}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
