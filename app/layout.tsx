import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWAD AI Content Engine',
  description: 'Internal portal for generating and scheduling AWAD LinkedIn content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
