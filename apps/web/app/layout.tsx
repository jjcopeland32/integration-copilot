import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Integration Copilot',
  description: 'AI-powered API vendor onboarding system',
};

/**
 * Root layout - minimal wrapper.
 * Actual portal layouts are in route groups:
 * - (auth) - login pages with minimal styling
 * - (portal) - authenticated client portal pages
 * - partner - partner portal with Crystal theme
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
