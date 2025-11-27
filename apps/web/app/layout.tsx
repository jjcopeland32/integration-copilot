import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Integration Copilot',
  description: 'AI-powered API vendor onboarding system',
};

/**
 * Root layout - defines the document shell.
 * All pages inherit this html/body wrapper.
 * Route-specific styling is handled by nested layouts.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
