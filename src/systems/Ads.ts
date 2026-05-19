// AdMob + UMP (Google User Messaging Platform) bootstrap.
//
// The SDK is initialised and the consent flow runs on launch so that GDPR /
// IDFA prompts (including ATT on iOS) appear correctly. No ads are requested
// or displayed — this file only wires up the plumbing.
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
} from '@capacitor-community/admob';

let initialized = false;

async function runConsentFlow(): Promise<void> {
  const info = await AdMob.requestConsentInfo();
  if (
    info.status === AdmobConsentStatus.REQUIRED ||
    info.status === AdmobConsentStatus.UNKNOWN
  ) {
    if (info.isConsentFormAvailable) {
      await AdMob.showConsentForm();
    }
  }
}

export async function initAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  if (!Capacitor.isNativePlatform()) return;

  try {
    await AdMob.initialize({
      initializeForTesting: false,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await runConsentFlow();
    if (Capacitor.getPlatform() === 'ios') {
      await AdMob.trackingAuthorizationStatus().catch(() => null);
      await AdMob.requestTrackingAuthorization().catch(() => null);
    }
  } catch {
    // Initialization failures must not block gameplay.
  }
}
