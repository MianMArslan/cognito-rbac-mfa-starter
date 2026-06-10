'use client';

import { useAuth } from '@/hooks/use-auth';
import { ShieldCheck, Tag, KeyRound, User, Fingerprint } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  // Layout handles redirect and loading spinner — just bail here
  if (isLoading || !user) return null;

  const stats = [
    {
      title: 'Role',
      value: user.role,
      description: 'Your access level',
      icon: Tag,
      badge: user.role === 'ADMIN' ? ('purple' as const) : ('secondary' as const),
    },
    {
      title: 'Groups',
      value: user.groups.length,
      description: user.groups.join(', ') || 'No groups assigned',
      icon: ShieldCheck,
      badge: null,
    },
    {
      title: 'Account',
      value: 'Active',
      description: user.email,
      icon: User,
      badge: 'success' as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ title, value, description, icon: Icon, badge }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{value}</span>
                {badge && <Badge variant={badge}>{value}</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground truncate">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Identity card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            <CardTitle>Identity Details</CardTitle>
          </div>
          <CardDescription>Your Cognito account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'User ID (sub)', value: user.sub, mono: true },
            { label: 'Username', value: user.username, mono: true },
            { label: 'Email', value: user.email, mono: false },
            { label: 'Groups', value: user.groups.join(', ') || 'None', mono: false },
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
    </div>
  );
}
