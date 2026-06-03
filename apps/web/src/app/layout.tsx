import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cognito RBAC + MFA Starter',
  description: 'AWS Cognito authentication with role-based access control and MFA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full" suppressHydrationWarning>{children}</body>
    </html>
  );
}
