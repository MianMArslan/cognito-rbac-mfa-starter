'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/\d/, 'Include a number')
      .regex(/[@$!%*?&]/, 'Include a special character (@$!%*?&)'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const confirmSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
});

type RegisterValues = z.infer<typeof registerSchema>;
type ConfirmValues = z.infer<typeof confirmSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const confirmForm = useForm<ConfirmValues>({ resolver: zodResolver(confirmSchema) });

  const onRegister = async (values: RegisterValues) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Registration failed'); return; }
      setPendingEmail(values.email);
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  const onConfirm = async (values: ConfirmValues) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code: values.code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Verification failed'); return; }
      router.push('/login?confirmed=1');
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  if (pendingEmail) {
    return (
      <AuthShell heading="Check your email" subheading={`We sent a 6-digit code to ${pendingEmail}`}>
        <form onSubmit={confirmForm.handleSubmit(onConfirm)} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
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
              {...confirmForm.register('code')}
            />
            {confirmForm.formState.errors.code && (
              <p className="text-xs text-destructive">{confirmForm.formState.errors.code.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={confirmForm.formState.isSubmitting}>
            {confirmForm.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {confirmForm.formState.isSubmitting ? 'Verifying…' : 'Verify email'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Wrong email?{' '}
            <button type="button" onClick={() => { setPendingEmail(null); setError(null); }}
              className="font-medium text-primary hover:underline">
              Go back
            </button>
          </p>
        </form>
      </AuthShell>
    );
  }

  const { register, handleSubmit, formState: { errors, isSubmitting } } = registerForm;

  return (
    <AuthShell heading="Create an account" subheading="Start with a secure, production-ready setup">
      <form onSubmit={handleSubmit(onRegister)} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a strong password"
              className="pr-10"
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter your password" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
