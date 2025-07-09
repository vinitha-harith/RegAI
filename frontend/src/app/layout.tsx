import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Your global styles
import { Sidebar } from '@/app/components/Sidebar'; // We will create this next

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Regulatory Review',
  description: 'AI-powered analysis of financial regulatory documents.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}