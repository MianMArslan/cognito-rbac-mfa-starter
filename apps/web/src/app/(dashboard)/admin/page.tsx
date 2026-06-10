'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { AuthenticatedUser } from '@repo/shared-types';
import { Users, ShieldAlert, UserCheck, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function AdminPage() {
  const router = useRouter();
  const { user, idToken, isLoading } = useAuth();
  const [users, setUsers] = useState<AuthenticatedUser[]>([]);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!idToken || !user || user.role !== 'ADMIN') return;
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
      .catch(() => {});
  }, [idToken, user]);

  if (isLoading || !user || user.role !== 'ADMIN') return null;

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const clientCount = users.filter((u) => u.role === 'CLIENT').length;

  const summaryCards = [
    { title: 'Total users', value: users.length, icon: Users, color: 'text-primary bg-primary/10' },
    { title: 'Admins', value: adminCount, icon: ShieldAlert, color: 'text-violet-600 bg-violet-100' },
    { title: 'Clients', value: clientCount, icon: UserCheck, color: 'text-blue-600 bg-blue-100' },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage roles and access permissions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-md ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <CardTitle>All Users</CardTitle>
          </div>
          <CardDescription>{users.length} registered account{users.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-b-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-t border-b bg-muted/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groups</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.sub}
                      className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs font-bold uppercase bg-primary/10 text-primary">
                              {u.email[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{u.username}</td>
                      <td className="px-6 py-4">
                        <Badge variant={u.role === 'ADMIN' ? 'purple' : 'secondary'}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {u.groups.length > 0
                          ? u.groups.map((g) => <Badge key={g} variant="outline" className="mr-1">{g}</Badge>)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
