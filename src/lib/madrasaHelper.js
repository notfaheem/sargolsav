import { deriveDefaultUnitName } from './parseParticipants';

// In-memory cache for madrasa_unit_map so components don't re-fetch unnecessarily
let cachedMadrasaMap = null;

export async function fetchMadrasaUnitMap(supabaseClient) {
  if (cachedMadrasaMap && cachedMadrasaMap.size > 0) return cachedMadrasaMap;
  try {
    const { data, error } = await supabaseClient
      .from('madrasa_unit_map')
      .select('madrasa, unit');
    if (!error && data) {
      cachedMadrasaMap = new Map();
      data.forEach((row) => {
        if (row.madrasa && row.unit) {
          cachedMadrasaMap.set(row.madrasa.trim(), row.unit.trim().toUpperCase());
        }
      });
      return cachedMadrasaMap;
    }
  } catch (e) {
    console.warn('Could not fetch madrasa_unit_map:', e);
  }
  return cachedMadrasaMap || new Map();
}

/**
 * Normalizes a student profile to its clean mapped short Madrasa name (e.g. KOLOMPADAM, MYLADI, PULLIYIL, KAMBLAKALLU).
 *
 * Priority order:
 * 1. Mapped value in madrasaUnitMap for raw profile.madrasa
 * 2. profile.unit if non-empty, not 'UNASSIGNED', and not a long raw string
 * 3. deriveDefaultUnitName(profile.madrasa)
 * 4. deriveDefaultUnitName(profile.unit)
 * 5. Fallback 'UNASSIGNED'
 *
 * @param {Object} profile - Participant or row object with { madrasa, unit }
 * @param {Map|Object} [madrasaUnitMap] - Optional map of raw madrasa -> clean unit name
 * @returns {string} The clean short Madrasa name in UPPERCASE (e.g. 'KOLOMPADAM')
 */
export function getCleanMadrasaName(profile, madrasaUnitMap = null) {
  if (!profile) return 'UNASSIGNED';

  const rawMadrasa = (profile.madrasa || '').trim();
  const rawUnit = (profile.unit || '').trim().toUpperCase();

  // 1. Check madrasaUnitMap
  const map = madrasaUnitMap || cachedMadrasaMap;
  if (map && rawMadrasa) {
    if (map instanceof Map && map.has(rawMadrasa)) {
      const val = map.get(rawMadrasa);
      if (val && val !== 'UNASSIGNED') return val.trim().toUpperCase();
    } else if (typeof map === 'object' && map[rawMadrasa]) {
      const val = map[rawMadrasa];
      if (val && val !== 'UNASSIGNED') return val.trim().toUpperCase();
    }
  }

  // 2. Check profile.unit
  if (rawUnit && rawUnit !== 'UNASSIGNED' && rawUnit !== '—' && rawUnit !== '-') {
    const isRawFullString =
      rawUnit.includes('MADRASA') ||
      rawUnit.includes('MADRASSA') ||
      rawUnit.includes('MADRASATHU') ||
      rawUnit.length > 25;
    if (!isRawFullString) {
      return rawUnit;
    }
  }

  // 3. Auto-derive clean short name from rawMadrasa
  if (rawMadrasa) {
    const derived = deriveDefaultUnitName(rawMadrasa);
    if (derived && derived !== 'UNASSIGNED') return derived;
  }

  // 4. Auto-derive clean short name from rawUnit
  if (rawUnit && rawUnit !== 'UNASSIGNED') {
    const derived = deriveDefaultUnitName(rawUnit);
    if (derived && derived !== 'UNASSIGNED') return derived;
    return rawUnit;
  }

  return 'UNASSIGNED';
}
