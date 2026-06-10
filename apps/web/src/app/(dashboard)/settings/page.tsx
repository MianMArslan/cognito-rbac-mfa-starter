'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { getAccessToken } from '@/lib/session';
import { Settings, KeyRound, ShieldCheck, Smartphone, Copy, CheckCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const totpSchema = z.object({ code: z.string().length(6, 'Enter the 6-digit code') });
type TotpValues = z.infer<typeof totpSchema>;

type MfaStep = 'idle' | 'loading-qr' | 'scan' | 'verifying' | 'done' | 'error';

export default function SettingsPage() {
  const { user, isLoading } = useAuth();

  const [mfaStep, setMfaStep] = useState<MfaStep>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<TotpValues>({
    resolver: zodResolver(totpSchema),
  });

  if (isLoading || !user) return null;

  const startMfaSetup = async () => {
    setMfaStep('loading-qr');
    setMfaError(null);
    const token = getAccessToken();
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await res.json();
      if (!res.ok) { setMfaError(d.message ?? 'Failed to start MFA setup.'); setMfaStep('error'); return; }
      setQrCodeUrl(d.data?.qrCodeUrl ?? null);
      setSecretCode(d.data?.secretCode ?? null);
      setMfaStep('scan');
    } catch {
      setMfaError('Failed to start MFA setup. Please try again.');
      setMfaStep('error');
    }
  };

  const copySecret = async () => {
    if (!secretCode) return;
    await navigator.clipboard.writeText(secretCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onVerify = async (values: TotpValues) => {
    setMfaError(null);
    const token = getAccessToken();
    const res = await fetch('/api/auth/mfa/verify-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ code: values.code }),
    });
    if (!res.ok) {
      const d = await res.json();
      setMfaError(d.message ?? 'Invalid code. Please try again.');
      return;
    }
    reset();
    setMfaStep('done');
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Email', value: user.email, mono: false },
            { label: 'Username', value: user.username, mono: true },
            { label: 'User ID', value: user.sub, mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="flex items-center gap-2 shrink-0">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <span className={`text-xs text-right break-all ${mono ? 'font-mono text-foreground' : 'text-foreground'}`}>
                  {value}
                </span>
              </div>
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Permissions</CardTitle>
          </div>
          <CardDescription>Your role and group memberships</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">Role</span>
            <Badge variant={user.role === 'ADMIN' ? 'purple' : 'secondary'}>{user.role}</Badge>
          </div>
          <Separator />
          <div className="flex items-start justify-between gap-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">Groups</span>
            <span className="text-xs text-foreground text-right">
              {user.groups.length ? user.groups.join(', ') : 'No groups assigned'}
            </span>
          </div>
          <Separator />
        </CardContent>
      </Card>

      {/* MFA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>Add an extra layer of security with a one-time password app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaStep === 'idle' && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Authenticator app</p>
                <p className="text-xs text-muted-foreground">Use Google Authenticator, Authy, or 1Password</p>
              </div>
              <Button size="sm" onClick={startMfaSetup}>Enable MFA</Button>
            </div>
          )}

          {mfaStep === 'loading-qr' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating setup code…
            </div>
          )}

          {mfaStep === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{mfaError}</AlertDescription>
              </Alert>
              <Button size="sm" variant="outline" onClick={() => setMfaStep('idle')}>Try again</Button>
            </>
          )}

          {mfaStep === 'scan' && (
            <div className="space-y-5">
              {mfaError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{mfaError}</AlertDescription>
                </Alert>
              )}

              {/* Step 1 — scan */}
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1</span>
                <div className="space-y-3 flex-1">
                  <p className="text-sm font-medium leading-none pt-0.5">Scan with your authenticator app</p>
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

              {/* Step 2 — verify */}
              <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">2</span>
                  <div className="space-y-3 flex-1">
                    <p className="text-sm font-medium leading-none pt-0.5">Enter the verification code</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="mfa-code" className="sr-only">Verification code</Label>
                      <Input
                        id="mfa-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        className="text-center text-xl tracking-[0.4em] font-mono h-12"
                        {...register('code')}
                      />
                      {errors.code && <p className="text-xs text-destructive text-center">{errors.code.message}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                    {isSubmitting ? 'Activating…' : 'Activate MFA'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setMfaStep('idle'); setMfaError(null); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {mfaStep === 'done' && (
            <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">MFA enabled</p>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">Your account is now protected with two-factor authentication</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
