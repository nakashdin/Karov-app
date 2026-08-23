import { OsmPlacesRepository } from '../OsmPlacesRepository';
import places from '../../generated/places.osm.json';

describe('OsmPlacesRepository — merged-id resolution', () => {
  const repo = new OsmPlacesRepository();

  it('resolves a live id normally', async () => {
    const survivor = (places as Array<{ id: string; extra?: { mergedFrom?: string[] } }>).find(
      (p) => p.extra?.mergedFrom?.length,
    );
    expect(survivor).toBeDefined();

    const found = await repo.getPlaceById(survivor!.id);
    expect(found?.id).toBe(survivor!.id);
  });

  it('resolves a merged-away id to the record it was folded into — a /place/:id link from before the merge must not 404', async () => {
    const survivor = (places as Array<{ id: string; extra?: { mergedFrom?: string[] } }>).find(
      (p) => p.extra?.mergedFrom?.length,
    );
    expect(survivor).toBeDefined();
    const oldId = survivor!.extra!.mergedFrom![0];

    const found = await repo.getPlaceById(oldId);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(survivor!.id);
  });

  it('still returns null for an id that was never real', async () => {
    const found = await repo.getPlaceById('does-not-exist');
    expect(found).toBeNull();
  });
});
