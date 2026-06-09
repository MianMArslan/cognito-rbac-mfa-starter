'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, AlertCircle, Copy, CheckCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAccessToken } from '@/lib/session';

const schema = z.object({ code: z.string().length(6, 'Enter the 6-digit code') });
type FormValues = z.infer<typeof schema>;

export default function MfaSetupPage() {
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const token = getAccessToken();
    fetch('/api/auth/mfa/setup', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => { setQrCodeUrl(d.data?.qrCodeUrl ?? null); setSecretCode(d.data?.secretCode ?? null); })
      .catch(() => setError('Failed to generate MFA setup. Please refresh and try again.'));
  }, []);

  const copySecret = async () => {
    if (!secretCode) return;
    await navigator.clipboard.writeText(secretCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const token = getAccessToken();
    const res = await fetch('/api/auth/mfa/verify-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code: values.code }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.message ?? 'Invalid code.'); return; }
    router.push('/dashboard?mfa=enabled');
  };

  return (
    <AuthShell heading="Enable two-factor authentication" subheading="Protect your account with a one-time password app">
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1</span>
              <div className="space-y-3 flex-1">
                <p className="text-sm font-medium leading-none pt-0.5">Scan with your authenticator app</p>
                <p className="text-xs text-muted-foreground">Use Google Authenticator, Authy, or 1Password.</p>
                <div className="flex justify-center">
                  {qrCodeUrl ? (
                    <div className="rounded-xl border-4 border-background shadow-md overflow-hidden ring-1 ring-border">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeUrl)}&size=176x176&margin=8`}
                        alt="MFA QR Code"
                        width={176}
                        height={176}
                      />
                    </div>
                  ) : (
                    <div className="h-44 w-44 rounded-xl bg-muted animate-pulse" />
                  )}
                </div>
                {secretCode && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Or enter this setup key manually:</p>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                      <code className="flex-1 text-xs font-mono tracking-wider break-all text-foreground">{secretCode}</code>
                      <button onClick={copySecret} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                        {copied ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Step 2 */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">2</span>
                <div className="space-y-3 flex-1">
                  <p className="text-sm font-medium leading-none pt-0.5">Enter the verification code</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="code" className="sr-only">Verification code</Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      autoFocus
                      className="text-center text-xl tracking-[0.4em] font-mono h-12"
                      {...register('code')}
                    />
                    {errors.code && <p className="text-xs text-destructive text-center">{errors.code.message}</p>}
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                {isSubmitting ? 'Activating…' : 'Activate MFA'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
