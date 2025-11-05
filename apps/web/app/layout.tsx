import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc/client';
import { Nav } from '@/components/layout/nav';
import { Sparkles } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Integration Copilot',
  description: 'AI-powered API vendor onboarding system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 glass border-r border-white/20 animate-slide-in">
              <div className="p-8">
                {/* Logo */}
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold gradient-text">
                      Integration Copilot
                    </h1>
                  </div>
                  <p className="text-sm text-gray-500 ml-13">
                    AI-Powered API Onboarding
                  </p>
                </div>

                {/* Navigation */}
                <Nav />
              </div>

              {/* Bottom decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-50/50 to-transparent pointer-events-none" />
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
              <div className="min-h-full p-8 lg:p-12 animate-in">
                {children}
              </div>
            </main>
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
