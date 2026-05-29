import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useSignIn } from '@/features/auth/useSignIn';
import { useOnboardingStatus } from '@/features/onboarding/useOnboardingStatus';
import { SignInSchema, type SignInInput } from '@/features/auth/auth-schemas';
import { authErrorMessage, authMessages } from '@/features/auth/messages';
import { toErrorCode } from '@/features/auth/auth-errors';

const m = authMessages.signIn;

export function SignInPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const onboarding = useOnboardingStatus();
  const signIn = useSignIn();

  const form = useForm<SignInInput>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: '', password: '' },
  });

  // Already signed in → route to dashboard (or onboarding if not yet onboarded).
  if (isLoading || (user && onboarding.isLoading)) {
    return <FullPageLoader />;
  }
  if (user) {
    return (
      <Navigate to={onboarding.data?.isOnboarded ? ROUTES.DASHBOARD : ROUTES.ONBOARDING} replace />
    );
  }

  const onSubmit = (values: SignInInput): void => {
    signIn.mutate(values, {
      onSuccess: () => {
        toast.success(m.success);
        // RequireOnboarded will bounce to /onboarding if the user hasn't finished setup.
        navigate(ROUTES.DASHBOARD);
      },
      onError: (error: unknown) => {
        toast.error(authErrorMessage(toErrorCode(error)));
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{m.title}</CardTitle>
          <CardDescription>{m.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {signIn.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{authErrorMessage(toErrorCode(signIn.error))}</AlertDescription>
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
                        autoComplete="current-password"
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
                disabled={signIn.isPending}
                aria-busy={signIn.isPending}
              >
                {signIn.isPending ? m.submitting : m.submit}
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {m.switchPrompt}{' '}
            <Link
              to={ROUTES.SIGN_UP}
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
