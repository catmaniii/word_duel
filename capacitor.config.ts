/** Hosted App-Ads.txt: https://word-duel-five.vercel.app/app-ads.txt */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wordduel.app',
  appName: 'WordDuel',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
