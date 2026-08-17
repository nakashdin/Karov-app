import { SourceRef } from './types';

// Source that needs license review before originalText can be used
export function nrSource(
  reference: string,
  workTitle: string,
  workAuthor?: string
): SourceRef {
  return {
    work: { title: workTitle, author: workAuthor },
    reference,
    version: { licenseStatus: 'needs_review' },
  };
}

// Content written entirely by Karov — no external license needed.
// Use ONLY when we know with certainty that Karov authored the text.
export function karovOriginal(): SourceRef {
  return {
    work: { title: 'קרוב' },
    reference: '',
    version: { licenseStatus: 'karov_original' },
  };
}

// Legacy item whose origin is unknown — no source was recorded at import time.
// Must not be confused with karov_original. Requires provenance review.
export function unknownLegacySource(): SourceRef {
  return {
    work: { title: 'לא ידוע' },
    reference: '',
    version: {
      licenseStatus: 'needs_review',
      copyrightBasis: 'unknown_legacy_origin',
    },
  };
}
