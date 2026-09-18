// frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Montserrat, Open_Sans } from 'next/font/google';
import NavBar from './components/NavBar';

const mont = Montserrat({
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
});

const open = Open_Sans({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SeroTrek — Explore Nepal',
  description:
    'Discover Nepal with SeroTrek: trails, packages, and authentic nature experiences.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${mont.className} ${open.className}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-white text-green-900" suppressHydrationWarning>
        {/* Global NavBar */}
        <NavBar />
        {children}
      </body>
    </html>
  );
}
