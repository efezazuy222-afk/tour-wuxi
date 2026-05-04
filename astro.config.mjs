// @ts-nocheck
import { defineConfig, fontProviders } from "astro/config";
import mdx from '@astrojs/mdx';
import icon from "astro-icon";
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://ocean.madethemes.com',
  base: '/',
  output: 'static',

  fonts: [
    {
      name: 'Inter',
      cssVariable: '--font-inter',
      provider: fontProviders.google(),
      weights: ['300', '400', '500', '600', '700'],
    },
  ],

  integrations: [
    icon({
       include: {
        // Include Bootstrap icons used in the project
        bi: ['gear-fill','list', 'x-lg', 'arrow-up','star-fill','person-badge','shield-check','people','leaf', 'sliders','headset','globe2','award','house','compass','dash-lg','plus-lg',
          'star-half','arrow-right', 'facebook','twitter-x','link-45deg', 'tiktok','linkedin','instagram','chevron-left','chevron-right', 'calendar-event', 'clock','check-circle','geo-alt',
          'send','whatsapp','envelope','telephone',
        ],
      }
    }),
    mdx(),
  ],

  vite: {
    resolve: {
      alias: {
        '@img': '/src/img',
      },
    },
    plugins: [tailwindcss()]
  }
});