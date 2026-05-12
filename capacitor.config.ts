import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'slot.eggtart.app',
  appName: 'Slot Machine',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
