import type { Metadata } from 'next';
import '../globals.css';
import { TRPCProvider } from '@/lib/trpc/client';
import { Nav } from '@/components/layout/nav';
import { Sparkles } from 'lucide-react';
import { UserBar } from '@/components/layout/user-bar';
import { AuthProvider } from '@/components/auth-provider';
import { auth } from '@/lib/auth';
import { ProjectProvider } from '@/components/project-context';
import { ProjectBanner } from '@/components/project-banner';
import { redirect } from 'next/navigation';

const fontClass = 'font-sans antialiased';

export const metadata: Metadata = {
  title: 'Integration Copilot',
  description: 'AI-powered API vendor onboarding system',
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <html lang="en">
      <body className={fontClass}>
        <AuthProvider session={session}>
          <TRPCProvider>
            <ProjectProvider>
              {/* Enterprise Mesh Background */}
              <div className="fixed inset-0 enterprise-mesh-bg animate-gradient-shift" />

              {/* Floating background orbs */}
              <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute top-[5%] left-[10%] w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-float"
                  style={{ animationDelay: '0s' }}
                />
                <div
                  className="absolute top-[40%] right-[5%] w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-float"
                  style={{ animationDelay: '3s' }}
                />
                <div
                  className="absolute bottom-[10%] left-[30%] w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float"
                  style={{ animationDelay: '6s' }}
                />
              </div>

              <div className="relative z-10 flex h-screen overflow-hidden">
                {/* Enterprise Glass Sidebar */}
                <aside className="relative w-72 glass-enterprise-sidebar animate-slide-in">
                  <div className="p-8">
                    {/* Logo */}
                    <div className="mb-10">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25">
                          <Sparkles className="h-6 w-6 text-white" />
                          <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <h1 className="bg-gradient-to-r from-indigo-700 via-purple-600 to-indigo-700 bg-clip-text text-xl font-bold text-transparent">
                            Integration Copilot
                          </h1>
                        </div>
                      </div>
                      <p className="ml-14 text-xs text-slate-500 font-medium tracking-wide">
                        AI-Powered API Onboarding
                      </p>
                    </div>

                    {/* Navigation */}
                    <Nav />
                  </div>

                  {/* Bottom gradient decoration */}
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-indigo-100/30 via-purple-100/20 to-transparent" />
                </aside>

                {/* Main content area */}
                <main className="flex-1 overflow-auto">
                  <div className="min-h-full space-y-6 p-8 lg:p-12">
                    {/* Top bar */}
                    <div className="flex justify-end animate-in">
                      <UserBar />
                    </div>

                    {/* Project context banner */}
                    <div className="animate-in stagger-1">
                      <ProjectBanner />
                    </div>

                    {/* Page content */}
                    <div className="animate-in stagger-2">{children}</div>
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


