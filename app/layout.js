import './globals.css';

export const metadata = {
  title: 'Our Money',
  description: 'Private household money manager',
  applicationName: 'Our Money',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Our Money', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#D4147E',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
