import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The portal is server-rendered (Clerk auth, MongoDB + M-Pesa API routes), so the Android
 * shell loads the live site and ships a bundled offline page shown when the device cannot
 * reach it.
 */
const config: CapacitorConfig = {
  appId: 'app.dekuwec.portal',
  appName: 'DEKUWEC',
  webDir: 'www',
  server: {
    // Opening the app goes straight into the portal. Clerk keeps the session in the
    // WebView cookie store, so signed-in members land on the dashboard; anyone
    // without a session is redirected to /login by the middleware.
    url: 'https://www.dekuwec.app/dashboard',
    cleartext: false,
    errorPath: 'offline.html',
    allowNavigation: [
      'dekuwec.app',
      '*.dekuwec.app',
      '*.clerk.accounts.dev',
      '*.clerk.com',
      'accounts.google.com',
      '*.google.com',
      'appleid.apple.com',
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#052e16',
    // Android 15 draws apps edge-to-edge; inset the WebView so the portal header
    // is never hidden behind the status bar.
    adjustMarginsForEdgeToEdge: 'auto',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#052e16',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
