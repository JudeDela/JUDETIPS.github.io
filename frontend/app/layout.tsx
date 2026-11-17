import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GoalInsight — Football Intelligence Platform & Match Forecast Engine',
  description: 'Advanced football fixture analytics, Poisson probability models, Dixon-Coles bivariate forecasts, and immutable performance tracking.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚽</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#080d0b] text-[#f1f7f3] antialiased">
        {children}
      </body>
    </html>
  );
}
