import { describe, it, expect } from 'vitest';
import { translate, LANGS } from './i18n';

describe('translate', () => {
  it('interpolates and formats numbers per locale', () => {
    expect(translate('en', 'live', { n: 11340 })).toBe('11,340 live');
    expect(translate('es', 'showN', { n: 1200 })).toBe('Ver 1200 canales');
    expect(translate('fr', 'resultsFor', { q: 'bbc' })).toBe('Résultats pour « bbc »');
  });

  it('falls back to English, then to the key', () => {
    expect(translate('xx', 'retry')).toBe('Retry');
    expect(translate('es', 'no-such-key')).toBe('no-such-key');
  });

  it('each language actually translates the core strings', () => {
    for (const lang of Object.keys(LANGS).filter((l) => l !== 'en')) {
      for (const key of ['search', 'filters', 'favorites', 'showN', 'deadStream', 'watchTip', 'nowPlaying']) {
        expect(translate(lang, key), `${lang}.${key}`).not.toBe(translate('en', key));
      }
    }
  });
});
