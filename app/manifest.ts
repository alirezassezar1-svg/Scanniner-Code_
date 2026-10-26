import type { MetadataRoute } from 'next';
import { BASE_PATH } from '@/lib/base-path';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${BASE_PATH}/`,
    name: 'اسکنر هوشمند مدارک دانشگاهی ایران',
    short_name: 'اسکنر مدارک',
    description: 'اسکن هوشمند، تصحیح پرسپکتیو و فشرده‌سازی مدارک برای سامانه‌های دانشگاهی',
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#090d16',
    theme_color: '#059669',
    icons: [
      {
        src: `${BASE_PATH}/pwa-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${BASE_PATH}/pwa-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${BASE_PATH}/pwa-maskable-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `${BASE_PATH}/apple-touch-icon.png`,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
