/**
 * In-memory test adapter — proves the pipeline end-to-end with ZERO network.
 *
 * Three hand-written raw records, each exercising a different pipeline branch:
 *   1. valid + coordinates + phone/nusach/address → duplicate `match` that can
 *      ENRICH an existing record → routed to the review queue.
 *   2. valid but NO coordinates → exercises the optional geocoding step (offline
 *      NullGeocoder leaves it unresolved) → `new` → auto-approvable.
 *   3. missing name → fails validation → `rejected`.
 *
 * `fetch` returns the local fixtures synchronously wrapped in a promise; it is
 * NOT a network call, so the orchestrator stays offline-safe.
 */
import type { NormalizedImportRecord } from '../schema/normalized-record.ts';
import { makeRecordId } from '../schema/normalized-record.ts';
import type {
  AdapterContext,
  AdapterDescription,
  RawFetchResult,
  SourceAdapter,
} from './contract.ts';

/** The raw shape this fake source "returns" (pre-normalization). */
interface TestRaw {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  city?: string;
  street?: string;
  phone?: string;
  nusach?: string;
}

const FIXTURE_FETCHED_AT = '2026-06-18T00:00:00.000Z';

const FIXTURES: TestRaw[] = [
  {
    id: 'rec-1',
    name: 'בית הכנסת הגדול',
    lat: 32.0853,
    lng: 34.7818,
    city: 'תל אביב',
    street: 'אלנבי 50',
    phone: '03-1234567',
    nusach: 'אשכנז',
  },
  {
    id: 'rec-2',
    name: 'בית כנסת אור החיים',
    // no coordinates → geocoding step is exercised
    city: 'פתח תקווה',
    street: 'הרצל 10',
  },
  {
    id: 'rec-3',
    name: '   ', // blank → validation rejects it
    lat: 31.7683,
    lng: 35.2137,
    city: 'ירושלים',
  },
];

export const TEST_ADAPTER_ID = 'in-memory-test-v1';

export class InMemoryTestAdapter implements SourceAdapter {
  readonly id = TEST_ADAPTER_ID;
  private readonly fixtures: TestRaw[];

  constructor(fixtures: TestRaw[] = FIXTURES) {
    this.fixtures = fixtures;
  }

  describe(): AdapterDescription {
    return {
      id: this.id,
      kind: 'manual',
      produces: ['synagogue'],
      summary: 'Offline fixture adapter (3 fake synagogue records) for pipeline tests.',
    };
  }

  async fetch(ctx: AdapterContext): Promise<RawFetchResult> {
    ctx.log(`[${this.id}] returning ${this.fixtures.length} in-memory fixtures (no network)`);
    return {
      items: this.fixtures,
      fetchedFrom: 'memory://test-fixtures',
      fetchedAt: FIXTURE_FETCHED_AT,
    };
  }

  normalize(rawItem: unknown, ctx: AdapterContext): NormalizedImportRecord[] {
    const raw = rawItem as TestRaw;
    const sourceId = ctx.source.id;
    const address = [raw.street, raw.city].filter(Boolean).join(', ');

    const record: NormalizedImportRecord = {
      id: makeRecordId(sourceId, raw.id),
      type: 'synagogue',
      name: raw.name.trim(),
      address: address || undefined,
      cityHint: raw.city,
      location:
        typeof raw.lat === 'number' && typeof raw.lng === 'number'
          ? { latitude: raw.lat, longitude: raw.lng }
          : undefined,
      phone: raw.phone,
      nusach: raw.nusach,
      confidence: 'medium',
      provenance: {
        sourceId,
        adapterId: this.id,
        sourceRecordId: raw.id,
        sourceUrl: 'memory://test-fixtures',
        fetchedAt: FIXTURE_FETCHED_AT,
        raw: { ...raw },
      },
    };
    return [record];
  }
}
