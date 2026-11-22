export const ROOTS = [
  { id: 'C',  label: 'C',     semitone: 0,  preferFlats: false, aliases: ['c'] },
  { id: 'C#', label: 'C#/Db', semitone: 1,  preferFlats: false, aliases: ['c#', 'db'] },
  { id: 'D',  label: 'D',     semitone: 2,  preferFlats: false, aliases: ['d'] },
  { id: 'Eb', label: 'D#/Eb', semitone: 3,  preferFlats: true,  aliases: ['eb', 'd#'] },
  { id: 'E',  label: 'E',     semitone: 4,  preferFlats: false, aliases: ['e'] },
  { id: 'F',  label: 'F',     semitone: 5,  preferFlats: true,  aliases: ['f'] },
  { id: 'F#', label: 'F#/Gb', semitone: 6,  preferFlats: false, aliases: ['f#', 'gb'] },
  { id: 'G',  label: 'G',     semitone: 7,  preferFlats: false, aliases: ['g'] },
  { id: 'Ab', label: 'G#/Ab', semitone: 8,  preferFlats: true,  aliases: ['ab', 'g#'] },
  { id: 'A',  label: 'A',     semitone: 9,  preferFlats: false, aliases: ['a'] },
  { id: 'Bb', label: 'A#/Bb', semitone: 10, preferFlats: true,  aliases: ['bb', 'a#'] },
  { id: 'B',  label: 'B',     semitone: 11, preferFlats: false, aliases: ['b'] }
];

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function getRootById(rootId) {
  return ROOTS.find((r) => r.id === rootId) || ROOTS[0];
}

export function formatChordSymbol(rootId, suffix) {
  return `${rootId}${suffix}`;
}

export function getChordKey(rootId, typeId) {
  return `${rootId}:${typeId}`;
}

export function parseChordKey(chordKey) {
  const [rootId, typeId] = String(chordKey).split(':');
  return { rootId, typeId };
}

/**
 * Computes MIDI notes (anchored near C4=60) and human-readable note names
 * from a root ID and interval semitone array.
 */
export function getChordNotes(rootId, intervals) {
  const root = getRootById(rootId);
  const hasMinorOrFlatInterval = intervals.some((iv) => iv === 3 || iv === 6 || iv === 10);
  const useFlats = root.preferFlats || (hasMinorOrFlatInterval && !['C#', 'F#', 'E', 'B'].includes(root.id));
  const nameTable = useFlats ? FLAT_NAMES : SHARP_NAMES;

  const baseMidi = 60 + root.semitone; // C4 = 60
  const midiNotes = intervals.map((iv) => baseMidi + iv);
  const noteNames = intervals.map((iv) => nameTable[(root.semitone + iv) % 12]);

  return {
    root,
    midiNotes,
    noteNames
  };
}

/**
 * Parses a user search query (e.g. "Cm7", "F#dim", "Dbmaj7") into matching chord candidates.
 */
export function searchChords(query, chordTypes) {
  const clean = query.trim().toLowerCase().replace(/\s+/g, '');
  if (!clean) return [];

  const results = [];
  const seen = new Set();

  // Sort roots so 2-character aliases (c#, db, bb...) match before 1-char roots (c, d, b...)
  const rootMatchers = [];
  for (const root of ROOTS) {
    for (const alias of root.aliases) {
      rootMatchers.push({ alias, root });
    }
  }
  rootMatchers.sort((a, b) => b.alias.length - a.alias.length);

  for (const { alias, root } of rootMatchers) {
    if (!clean.startsWith(alias)) continue;
    const rest = clean.slice(alias.length);

    for (const ct of chordTypes) {
      const suffixLower = ct.suffix.toLowerCase();
      const isMajorAlias = ct.id === 'major' && (rest === '' || rest === 'maj' || rest === 'major' || rest === 'M'.toLowerCase());
      const matchesSuffix = suffixLower === rest || (rest !== '' && suffixLower.startsWith(rest)) || (rest === '' && ct.id === 'major');

      if (matchesSuffix || isMajorAlias) {
        const key = getChordKey(root.id, ct.id);
        if (seen.has(key)) continue;
        seen.add(key);

        const exact = (rest === suffixLower) || (ct.id === 'major' && rest === '');
        results.push({
          key,
          root,
          chordType: ct,
          symbol: formatChordSymbol(root.id, ct.suffix),
          exact
        });
      }
    }
  }

  results.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1;
    return 0;
  });

  return results.slice(0, 12);
}
