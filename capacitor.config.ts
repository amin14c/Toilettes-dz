import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aqrab.mirhad',
  appName: 'أقرب مرحاض',
  webDir: 'dist',
  server: {
    allowNavigation: [
      "*.firebaseapp.com",
      "accounts.google.com",
      "*.google.com"
    ]
  },
  android: {
    overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
  }
};

export default config;
