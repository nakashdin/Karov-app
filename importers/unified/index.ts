/**
 * Unified importer — public surface.
 *
 * Architecture (separate from the legacy per-category importers and from the
 * research-only council discovery files):
 *
 *   adapters  ──fetch+normalize──▶  NormalizedImportRecord
 *                                        │
 *                                        ▼
 *   import_staging  ◀── validation · geocoding · duplicate-detection · review
 *                                        │
 *                                        ▼
 *                              approved (publish = later, out of scope)
 *
 * Importing this module pulls NO live data and touches NO production places.
 */

// schema
export * from './schema/normalized-record.ts';
export * from './schema/source-registry.ts';
export * from './schema/import-staging.ts';

// pipeline
export * from './pipeline/validation.ts';
export * from './pipeline/duplicate-detection.ts';
export * from './pipeline/geocoding.ts';
export * from './pipeline/review.ts';

// adapters
export * from './adapters/contract.ts';
export * from './adapters/in-memory-test-adapter.ts';

// orchestrator (offline-safe runner)
export * from './orchestrator.ts';
