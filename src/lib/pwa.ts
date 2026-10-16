export type InstallPlatform = 'ios' | 'android' | 'mac' | 'other'

export function detectPlatform(userAgent = navigator.userAgent): InstallPlatform {
  const ua = userAgent.toLowerCase()
  const iOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (iOS) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/mac os x|macintosh/.test(ua)) return 'mac'
  return 'other'
}

export function isStandaloneDisplay(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

export const INSTALL_COPY = {
  ios: [
    'Open this site in Safari.',
    'Tap the Share button.',
    'Choose Add to Home Screen, then Add.',
  ],
  android: [
    'Open this site in Chrome.',
    'Open the browser menu.',
    'Tap Install app or Add to Home screen.',
  ],
  mac: [
    'Open this site in Chrome or Edge.',
    'Use the install icon in the address bar, or open the browser menu.',
    'Choose Install TUF LabDesk.',
  ],
  other: [
    'Open this site in a Chromium browser such as Chrome or Edge.',
    'Use the install icon in the address bar if it appears.',
    'Or open the browser menu and choose Install app.',
  ],
} as const
