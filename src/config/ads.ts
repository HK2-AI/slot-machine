// AdMob configuration — Lucky Vegas Slots (publisher pub-7717027486393301).
//
// Production IDs from https://apps.admob.com/. Test IDs are also exported in
// case you need to debug ad rendering without spending impressions.
import { Capacitor } from '@capacitor/core';

interface AdMobIds {
  appId: string;
  interstitial: string;
  rewarded: string;
  appOpen: string;
}

export const ADMOB_ANDROID: AdMobIds = {
  appId: 'ca-app-pub-7717027486393301~9090595953',
  interstitial: 'ca-app-pub-7717027486393301/3566806531',
  rewarded: 'ca-app-pub-7717027486393301/8627561526',
  appOpen: 'ca-app-pub-7717027486393301/7394370903',
};

export const ADMOB_IOS: AdMobIds = {
  appId: 'ca-app-pub-7717027486393301~8515880889',
  interstitial: 'ca-app-pub-7717027486393301/1378563831',
  rewarded: 'ca-app-pub-7717027486393301/5752923116',
  appOpen: 'ca-app-pub-7717027486393301/4193492499',
};

export function currentAdMob(): AdMobIds {
  return Capacitor.getPlatform() === 'ios' ? ADMOB_IOS : ADMOB_ANDROID;
}
