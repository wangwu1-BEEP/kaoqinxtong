import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '智能考勤',
    template: '%s | 智能考勤',
  },
  description:
    '人脸识别、声纹识别、电子班牌、考勤打卡一体化解决方案',
  keywords: [
    '智能考勤',
    '人脸识别',
    '声纹识别',
    '电子班牌',
    '考勤打卡',
    '学校管理',
  ],
  authors: [{ name: 'Attendance System' }],
  generator: 'Coze Code',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192x192.png?v=3', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '智能考勤',
  },
  openGraph: {
    title: '智能考勤',
    description: '人脸识别、声纹识别、电子班牌、考勤打卡一体化解决方案',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`antialiased`} suppressHydrationWarning>
        {children}
        <PWAProvider />
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
