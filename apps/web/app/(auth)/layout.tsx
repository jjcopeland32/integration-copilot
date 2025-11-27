import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth-provider';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Sign In | Integration Copilot',
  description: 'Sign in to your Integration Copilot workspace',
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <AuthProvider session={session}>
      {/* Minimal auth background */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {children}
      </div>
    </AuthProvider>
  );
}


