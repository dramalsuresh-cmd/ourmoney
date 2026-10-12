export default function manifest() {
  return {
    name: 'Our Money',
    short_name: 'Our Money',
    description: 'Private household money manager for two',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF3F8',
    theme_color: '#D4147E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
