import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FixMyRoad',
  description: 'AI pothole reporting platform for citizens and municipal officers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
