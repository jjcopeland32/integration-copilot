import type { Metadata } from 'next';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc/client';
import { Nav } from '@/components/layout/nav';
import { Sparkles } from 'lucide-react';
import { UserBar } from '@/components/layout/user-bar';
import { AuthProvider } from '@/components/auth-provider';
import { auth } from '@/lib/auth';
import { ProjectProvider } from '@/components/project-context';
import { ProjectBanner } from '@/components/project-banner';

const fontClass = 'font-sans antialiased';

export const metadata: Metadata = {
  title: 'Integration Copilot',
  description: 'AI-powered API vendor onboarding system',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const missingEnv: string[] = [];
  if (!process.env.TELEMETRY_SIGNING_SECRET) {
    missingEnv.push('TELEMETRY_SIGNING_SECRET');
  }
  if (!process.env.APP_URL) {
    missingEnv.push('APP_URL');
  }

  const session = await auth();

  return (
    <html lang="en">
      <body className={fontClass}>
        <AuthProvider session={session}>
          <TRPCProvider>
            <ProjectProvider>
            {missingEnv.length > 0 && (
              <div className="bg-amber-100 border-b border-amber-300 text-amber-950 px-6 py-3 text-sm">
                <strong>Demo mode:</strong> Missing env vars {missingEnv.join(', ')}. Some integrations will use fallback values until configured.
              </div>
            )}
            <div className="flex h-screen overflow-hidden">
              {/* Sidebar */}
              <aside className="w-72 glass border-r border-white/20 animate-slide-in">
                <div className="p-8">
                  {/* Logo */}
                  <div className="mb-10">
                    <div className="mb-2 flex items-center gap-3">
                      <div className="gradient-bg flex h-10 w-10 items-center justify-center rounded-xl shadow-lg">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <h1 className="gradient-text text-2xl font-bold">
                        Integration Copilot
                      </h1>
                    </div>
                    <p className="ml-13 text-sm text-gray-500">
                      AI-Powered API Onboarding
                    </p>
                  </div>

                  {/* Navigation */}
                  <Nav />
                </div>

                {/* Bottom decoration */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-50/50 to-transparent" />
              </aside>

              {/* Main content */}
              <main className="flex-1 overflow-auto">
                <div className="min-h-full space-y-6 p-8 lg:p-12 animate-in">
                  <div className="flex justify-end">
                    <UserBar />
                  </div>
                  <ProjectBanner />
                  {children}
                </div>
              </main>
            </div>
            </ProjectProvider>
          </TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
