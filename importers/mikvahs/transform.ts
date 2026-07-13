/**
 * data.gov.il "מקוואות טהרה" record → cleaned `MikvahRaw` → internal
 * `MikvahPlace`. NO coordinates here — geocoding is a later step. Text cleaning
 * is whitespace-only; we never fix typos or invent content.
 */
import type { MikvahPlace, MikvahRaw } from '../shared/types.ts';

type GovRecord = Record<string, any>;

/** Trim and collapse internal whitespace. Never alters the actual content. */
export function cleanText(v: unknown): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

/** Source record → typed, cleaned raw record (keeps empty strings as-is). */
export function toMikvahRaw(r: GovRecord): MikvahRaw {
  return {
    sourceId: `mikveh-${r._id}`,
    name: cleanText(r.mikveName),
    city: cleanText(r.mikveCity),
    address: cleanText(r.mikveAddress),
    phone: cleanText(r.mikvePhone),
    hoursSummer: cleanText(r.activityHoursSummer),
    hoursWinter: cleanText(r.activityHoursWinter),
    hoursShabbat: cleanText(r.activityHoursShabat),
    accessibility: cleanText(r.accessability),
    forWomen: cleanText(r.mikveForWomenYesNo),
    forMen: cleanText(r.mikveForMenYesNo),
    forDishes: cleanText(r.mikveForDishesYesNo),
    brideRoom: cleanText(r.brideRoomYesNo),
    responsible: cleanText(r.responsibleWorker),
    council: cleanText(r.counciName),
  };
}

/** Cleaned raw → normalized internal place (no lat/lng yet). */
export function toMikvahPlace(raw: MikvahRaw, verifiedAt: string): MikvahPlace {
  const place: MikvahPlace = {
    type: 'mikveh',
    source: 'datagov',
    sourceId: raw.sourceId,
    name: raw.name,
    verifiedAt,
    isActive: true,
    extra: {},
  };

  if (raw.city) place.city = raw.city;
  if (raw.address) place.address = raw.address;
  if (raw.phone) place.phone = raw.phone;
  if (raw.hoursSummer) place.openingHours = raw.hoursSummer;

  const e = place.extra;
  if (raw.hoursWinter) e.hoursWinter = raw.hoursWinter;
  if (raw.hoursShabbat) e.hoursShabbat = raw.hoursShabbat;
  if (raw.accessibility) e.accessibility = raw.accessibility;
  if (raw.forWomen) e.forWomen = raw.forWomen;
  if (raw.forMen) e.forMen = raw.forMen;
  if (raw.forDishes) e.forDishes = raw.forDishes;
  if (raw.brideRoom) e.brideRoom = raw.brideRoom;
  if (raw.responsible) e.responsible = raw.responsible;
  if (raw.council) e.council = raw.council;

  return place;
}
