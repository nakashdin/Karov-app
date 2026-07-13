/**
 * Phase 2 — Validation + confidence scoring for grave records.
 *
 * Confidence score (0–100):
 *   Base:
 *     - OSM tomb/shrine = 60 | OSM worship-filtered = 40 | Wikidata grave entity = 55 | Wikidata rabbi = 50
 *   Bonuses:
 *     +15  name contains קבר/tomb/shrine/מערת explicitly
 *     +10  has buriedPerson name
 *     +10  has exact address (not just city)
 *     +5   has wikidataId cross-reference
 *     +5   has OSM wikidata= tag
 *   Penalties:
 *     -20  name is a generic place name (city/region) with no grave keywords
 *     -10  burialPlacePersonCount > 5 (used as generic cemetery)
 *     -15  name in English only (no Hebrew)
 */
import type { TzaddikGraveRaw, ValidationOutcome, ConfidenceLevel } from './types.ts';
import { isInIsrael } from '../shared/utils.ts';

const GRAVE_KEYWORDS = [/קבר/i, /מערת/i, /ציון/i, /tomb/i, /shrine/i, /burial/i, /מקאם/i, /גל עד/i, /kever/i];
const HEBREW_RE = /[֐-׿]/;

function hasGraveKeyword(name: string): boolean {
  return GRAVE_KEYWORDS.some((p) => p.test(name));
}

function isHebrewName(name: string): boolean {
  return HEBREW_RE.test(name);
}

function computeConfidence(r: TzaddikGraveRaw): { score: number; level: ConfidenceLevel; reason: string } {
  const tags = (r.extra?.osmTags as Record<string, string>) || {};
  const osmSubtype = r.extra?.osmSubtype as string || '';
  const sparqlQuery = r.extra?.sparqlQuery as string || '';
  const bpCount = (r.extra?.burialPlacePersonCount as number) || 0;
  const reasons: string[] = [];
  let score = 0;

  // --- Base score ---
  if (r.source === 'osm') {
    if (osmSubtype === 'tomb') { score += 65; reasons.push('OSM tomb'); }
    else if (osmSubtype === 'shrine') { score += 60; reasons.push('OSM shrine'); }
    else if (osmSubtype === 'worship-filtered') { score += 45; reasons.push('OSM worship (שם מתאים)'); }
    else { score += 40; reasons.push('OSM אחר'); }
  } else {
    if (sparqlQuery === 'graves') { score += 60; reasons.push('Wikidata ישות קבר'); }
    else { score += 50; reasons.push('Wikidata איש דת'); }
  }

  // --- Bonuses ---
  if (r.name && hasGraveKeyword(r.name)) { score += 15; reasons.push('+שם מכיל מילת קבר'); }
  if (r.buriedPerson) { score += 10; reasons.push('+שם קבור ידוע'); }
  if (r.address && r.address !== r.city) { score += 8; reasons.push('+כתובת מדויקת'); }
  if (r.wikidataId && r.source === 'osm') { score += 8; reasons.push('+התאמת WikidataID'); }
  if (tags.wikidata) { score += 5; reasons.push('+OSM wikidata tag'); }
  if (r.name && isHebrewName(r.name)) { score += 5; reasons.push('+שם עברי'); }

  // --- Penalties ---
  if (r.name && !hasGraveKeyword(r.name) && !r.buriedPerson) {
    score -= 15;
    reasons.push('-אין מילת קבר ואין שם קבור');
  }
  if (bpCount > 5) { score -= 10; reasons.push(`-מקום קבורה משותף (${bpCount} אישים)`); }
  if (r.name && !isHebrewName(r.name)) { score -= 10; reasons.push('-שם ללא עברית'); }

  score = Math.max(0, Math.min(100, score));
  const level: ConfidenceLevel = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { score, level, reason: reasons.join(' | ') };
}

export function validateGraves(candidates: TzaddikGraveRaw[]): ValidationOutcome {
  const valid: TzaddikGraveRaw[] = [];
  const rejected: ValidationOutcome['rejected'] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const p of candidates) {
    if (!p.name || !p.name.trim()) {
      rejected.push({ sourceId: p.sourceId, name: p.name, reason: 'שם חסר' });
    } else if (p.lat == null || p.lng == null) {
      rejected.push({ sourceId: p.sourceId, name: p.name, reason: 'קואורדינטות חסרות' });
    } else if (!isInIsrael({ latitude: p.lat, longitude: p.lng })) {
      rejected.push({
        sourceId: p.sourceId,
        name: p.name,
        reason: `קואורדינטות מחוץ לישראל (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`,
      });
    } else if (seen.has(p.sourceId)) {
      duplicates++;
    } else {
      seen.add(p.sourceId);
      // Manual seeds already have scores; compute for the rest
      if (p.source !== 'manual') {
        const { score, level, reason } = computeConfidence(p);
        p.confidenceScore = score;
        p.confidenceLevel = level;
        p.confidenceReason = reason;
      }
      // Flag records that need human review before live import
      const reviewReasons: string[] = [];
      if ((p.confidenceScore ?? 0) < 45) reviewReasons.push('אמינות נמוכה');
      if (!p.wikidataId && p.source !== 'manual') reviewReasons.push('מקור יחיד ללא Wikidata');
      if (p.name && !GRAVE_KEYWORDS.some((k) => k.test(p.name!)) && !p.buriedPerson) {
        reviewReasons.push('שם לא מזהה קבר ואין שם קבור');
      }
      if (reviewReasons.length > 0) {
        p.manual_review_required = true;
        p.manual_review_reason = reviewReasons.join(' | ');
      }
      valid.push(p);
    }
  }

  return { valid, rejected, duplicates };
}
