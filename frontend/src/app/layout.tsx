import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SIPPro',
  description: 'SIPPro Web Application',
  icons: {
    icon: '/images/logo-PG.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

