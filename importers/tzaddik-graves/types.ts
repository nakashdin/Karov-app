/** Types specific to the tzaddik-graves importer (Phase 4). */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface TzaddikGraveRaw {
  sourceId: string;
  source: 'osm' | 'wikidata' | 'manual';
  name: string | null;
  lat: number | null;
  lng: number | null;
  city?: string;
  address?: string;
  phone?: string;
  buriedPerson?: string;
  buriedPersonHe?: string;
  wikidataId?: string;
  osmId?: string;
  hillula?: string;
  verifiedAt: string;
  /** Confidence score 0–100 */
  confidenceScore?: number;
  confidenceLevel?: ConfidenceLevel;
  /** Short human-readable explanation of the score */
  confidenceReason?: string;
  /** True = needs human review before live import */
  manual_review_required?: boolean;
  manual_review_reason?: string;
  extra?: Record<string, unknown>;
}

export interface ValidationOutcome {
  valid: TzaddikGraveRaw[];
  rejected: { sourceId: string; name: string | null; reason: string }[];
  duplicates: number;
}

export interface DedupOutcome {
  unique: TzaddikGraveRaw[];
  merged: { kept: TzaddikGraveRaw; dropped: TzaddikGraveRaw }[];
}

export interface PreviewReport {
  runDate: string;
  phase: 'phase-4';
  sources: {
    osm: { fetched: number; accepted: number };
    wikidata: { fetched: number; accepted: number };
  };
  totals: {
    fetched: number;
    accepted: number;
    rejected: number;
    duplicates: number;
    merged: number;
    final: number;
  };
  confidence: {
    high: number;
    medium: number;
    low: number;
  };
  mustHaveCheck: MustHaveCheck[];
  rejected: { sourceId: string; name: string | null; reason: string }[];
  merged: { kept: TzaddikGraveRaw; dropped: TzaddikGraveRaw }[];
  records: TzaddikGraveRaw[];
  suspicious: TzaddikGraveRaw[];
  /** Phase 4 clean-dataset output */
  approved: TzaddikGraveRaw[];
  manualReview: TzaddikGraveRaw[];
  qualityRejected: { record: TzaddikGraveRaw; reason: string }[];
}

export interface MustHaveCheck {
  name: string;
  found: boolean;
  foundAs?: string;
  sourceId?: string;
  note?: string;
  /** How confidence was established */
  confirmedBy?: ('qid' | 'coords' | 'name')[];
  /** Expected bounding box for the site */
  expectedArea?: { latMin: number; latMax: number; lngMin: number; lngMax: number };
}
