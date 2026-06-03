import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { ShieldCheck, LayoutDashboard, Settings, Users, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/login');

  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/settings', label: 'Settings', icon: Settings },
    ...(user.role === 'ADMIN' ? [{ href: '/admin', label: 'User Management', icon: Users }] : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Cognito Starter
          </span>
        </div>

        <Separator className="bg-sidebar-muted" />

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3 pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Navigation
          </p>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-muted hover:text-sidebar-foreground"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <Separator className="bg-sidebar-muted" />

        {/* User footer */}
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-md px-3 py-2.5">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-sidebar-muted text-sidebar-foreground text-xs font-bold uppercase">
                {user.email[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user.email}</p>
              <Badge
                variant={user.role === 'ADMIN' ? 'purple' : 'secondary'}
                className="mt-0.5 text-[10px] py-0 h-4"
              >
                {user.role}
              </Badge>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                title="Sign out"
                className="text-sidebar-foreground/30 hover:text-sidebar-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex flex-1 flex-col overflow-auto">
        <div className="flex-1 p-8">
          <div className="mx-auto max-w-5xl animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
