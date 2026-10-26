import type { Metadata, Viewport } from 'next';
import './globals.css';
import Script from 'next/script';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#059669' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'اسکنر مدارک دانشگاهی ایران | DocScan Iran',
  description: 'ابزار هوشمند اسکن، تصحیح پرسپکتیو، حذف سایه، افزایش خوانایی و کنترل دقیق حجم فایل مدارک برای سامانه‌های دانشگاهی (آزمون، سنجش، گلستان)',
  applicationName: 'اسکنر مدارک',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'اسکنر مدارک',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon.svg',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'اسکنر مدارک دانشگاهی ایران | DocScan Iran',
    description: 'ابزار هوشمند اسکن، تصحیح پرسپکتیو، حذف سایه، افزایش خوانایی و کنترل دقیق حجم فایل مدارک برای سامانه‌های دانشگاهی (آزمون، سنجش، گلستان)',
    type: 'website',
    locale: 'fa_IR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'اسکنر مدارک دانشگاهی ایران | DocScan Iran',
    description: 'ابزار هوشمند اسکن، تصحیح پرسپکتیو، حذف سایه و کنترل دقیق حجم فایل مدارک',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="اسکنر مدارک" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
        {/* Load OpenCV.js asynchronously */}
        <Script
          src="https://docs.opencv.org/4.8.0/opencv.js"
          strategy="lazyOnload"
          id="opencv-script"
        />
        {/* Register Service Worker for PWA Offline / Standalone Capability */}
        <Script
          id="register-pwa-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('DocScan PWA ServiceWorker registered with scope:', reg.scope);
                  }).catch(function(err) {
                    console.warn('DocScan PWA ServiceWorker registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
