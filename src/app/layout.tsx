import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Movie Library MIS',
  description: 'A modern movie library management information system.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-white">
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
