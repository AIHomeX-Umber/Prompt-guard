import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PromptGuard',
  description: 'Make AI sound human.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
