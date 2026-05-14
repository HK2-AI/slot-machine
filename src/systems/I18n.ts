// Tiny i18n facade. Boot loads the persisted locale (or device default), then
// `i18n.t(key, params)` is sync everywhere. Locale change persists and emits a
// change event so live UI can re-render.
import { Preferences } from '@capacitor/preferences';
import { en, type StringKey } from '../i18n/locales/en';
import { zhHK } from '../i18n/locales/zh-HK';

export type Locale = 'en' | 'zh-HK';
const STORAGE_KEY = 'slot-machine:locale';

const tables: Record<Locale, Record<StringKey, string>> = {
  en,
  'zh-HK': zhHK,
};

function detectLocale(): Locale {
  const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  if (lang.toLowerCase().startsWith('zh')) return 'zh-HK';
  return 'en';
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

type Listener = (locale: Locale) => void;

class I18nImpl {
  private current: Locale = 'en';
  private ready = false;
  private listeners = new Set<Listener>();

  async init(): Promise<void> {
    if (this.ready) return;
    let next: Locale = detectLocale();
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value === 'en' || value === 'zh-HK') next = value;
    } catch {
      /* preferences may be unavailable */
    }
    this.current = next;
    this.ready = true;
  }

  get locale(): Locale {
    return this.current;
  }

  /** Translate `key`, interpolating `{name}` placeholders from `params`. */
  t(key: StringKey, params?: Record<string, string | number>): string {
    const table = tables[this.current];
    const raw = table[key] ?? en[key] ?? key;
    return interpolate(raw, params);
  }

  setLocale(locale: Locale): void {
    if (locale === this.current) return;
    this.current = locale;
    void Preferences.set({ key: STORAGE_KEY, value: locale });
    for (const fn of this.listeners) {
      try { fn(locale); } catch { /* keep going */ }
    }
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const i18n = new I18nImpl();
