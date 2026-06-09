'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const schema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
});
type FormValues = z.infer<typeof schema>;

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';

  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: values.code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Verification failed'); return; }
      router.push('/login?confirmed=1');
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  const resendCode = async () => {
    setResending(true);
    setError(null);
    try {
      await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 30000);
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell heading="Verify your email" subheading={`Enter the 6-digit code sent to ${email}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {resent && (
          <Alert>
            <AlertDescription>A new code has been sent to your email.</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            autoComplete="one-time-code"
            {...register('code')}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? 'Verifying…' : 'Verify email'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive a code?{' '}
          <button
            type="button"
            onClick={resendCode}
            disabled={resending || resent}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            {resending ? 'Sending…' : resent ? 'Code sent' : 'Resend code'}
          </button>
        </p>
      </form>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
