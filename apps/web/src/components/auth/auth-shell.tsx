import { ShieldCheck, Lock, Users, Zap } from 'lucide-react';

interface AuthShellProps {
  children: React.ReactNode;
  heading: string;
  subheading: string;
}

const features = [
  { icon: Lock, text: 'TOTP Multi-Factor Authentication' },
  { icon: Users, text: 'Role-Based Access Control' },
  { icon: Zap, text: 'CloudFormation Infrastructure as Code' },
];

export function AuthShell({ children, heading, subheading }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-zinc-900 p-12 text-white overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Cognito Starter</span>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Production Ready
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Secure auth for<br />modern applications.
            </h1>
            <p className="text-base text-zinc-400 leading-relaxed max-w-xs">
              AWS Cognito with RBAC, MFA, and CloudFormation — built with Next.js 14 and NestJS.
            </p>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-3.5 w-3.5 text-indigo-300" />
                </div>
                <span className="text-sm text-zinc-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-zinc-600">
          Open source · MIT License
        </p>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold">Cognito Starter</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{heading}</h2>
            <p className="text-sm text-muted-foreground">{subheading}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
