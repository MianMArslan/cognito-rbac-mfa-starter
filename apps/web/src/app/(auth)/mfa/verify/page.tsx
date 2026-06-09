'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Smartphone, AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { saveSession } from '@/lib/session';

const schema = z.object({ code: z.string().length(6, 'Enter the 6-digit code') });
type FormValues = z.infer<typeof schema>;

function MfaVerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const session = params.get('session') ?? '';
  const username = params.get('username') ?? '';
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const res = await fetch('/api/auth/mfa/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, username, code: values.code }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.message ?? 'Invalid code.'); return; }
    const data = await res.json();
    saveSession({ idToken: data.idToken, accessToken: data.accessToken, refreshToken: data.refreshToken });
    router.push('/dashboard');
  };

  return (
    <AuthShell heading="Two-factor authentication" subheading={username ? `Verifying identity for ${username}` : 'Enter the code from your authenticator app'}>
      <div className="space-y-5">
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open your authenticator app and enter the 6-digit code shown for this account.
            </p>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000 000"
            autoFocus
            className="text-center text-3xl tracking-[0.5em] font-mono h-16"
            {...register('code')}
          />
          {errors.code && <p className="text-center text-xs text-destructive">{errors.code.message}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? 'Verifying…' : 'Verify code'}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}

export default function MfaVerifyPage() {
  return <Suspense><MfaVerifyForm /></Suspense>;
}
