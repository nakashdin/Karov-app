import { useEffect, useState } from 'react';
import { getCachedLocation } from '../context/LocationContext';
import { halachicDate, msUntilRollover, type HalachicDate } from '../utils/hebrewDay';

/**
 * Today's Jewish day, as a civil date — and it re-renders when that day turns
 * over, so an app left open across sunset does not go stale.
 */
export function useHalachicDate(): HalachicDate {
  const [date, setDate] = useState<HalachicDate>(() =>
    halachicDate(new Date(), getCachedLocation()),
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(() => {
        setDate(halachicDate(new Date(), getCachedLocation()));
        schedule();
      }, msUntilRollover(new Date(), getCachedLocation()));
    };

    schedule();
    return () => clearTimeout(timer);
  }, []);

  return date;
}
