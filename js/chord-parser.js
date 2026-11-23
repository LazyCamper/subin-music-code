import { ROOTS } from './music.js';

const SHARP_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_ROOTS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_SEMITONE = {
  c: 0, 'c#': 1, db: 1,
  d: 2, 'd#': 3, eb: 3,
  e: 4, fb: 4, 'e#': 5,
  f: 5, 'f#': 6, gb: 6,
  g: 7, 'g#': 8, ab: 8,
  a: 9, 'a#': 10, bb: 10,
  b: 11, cb: 11, 'b#': 0
};

const SEMITONE_TO_CANONICAL_ID = ROOTS.map((r) => r.id);

const SUFFIX_ALIASES = {
  '': 'major',
  maj: 'major',
  major: 'major',
  m: 'm',
  min: 'm',
  '-': 'm',
  '7': '7',
  dom7: '7',
  maj7: 'maj7',
  m7: 'm7',
  min7: 'm7',
  '-7': 'm7',
  sus4: 'sus4',
  dim: 'dim',
  o: 'dim',
  aug: 'aug',
  '+': 'aug',
  '6': '6',
  '9': '9',
  add2: 'add2',
  add9: 'add2'
};

function parseNoteToken(token) {
  const m = /^([A-Ga-g])([#b♯♭]?)$/.exec(token.trim());
  if (!m) return null;
  const letter = m[1].toLowerCase();
  const acc = m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : m[2].toLowerCase();
  const key = letter + acc;
  if (!(key in NOTE_TO_SEMITONE)) return null;
  const semitone = NOTE_TO_SEMITONE[key];
  const display = m[1].toUpperCase() + acc;
  return {
    semitone,
    canonicalId: SEMITONE_TO_CANONICAL_ID[semitone],
    display
  };
}

/**
 * Parses a chord string (e.g. "C", "Cm7", "F#dim", "Bbmaj7", "G/B")
 * into structured chord parts.
 */
export function parseChordSymbol(raw, chordTypes = []) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { valid: false, raw: trimmed, rootId: null, typeId: null, suffix: null, bassId: null, symbol: trimmed };
  }

  // Split optional slash bass note (e.g., G/B, Cm7/Bb)
  const slashParts = trimmed.split('/');
  if (slashParts.length > 2) {
    return { valid: false, raw: trimmed, rootId: null, typeId: null, suffix: null, bassId: null, symbol: trimmed };
  }

  const mainPart = slashParts[0].trim();
  const bassPart = slashParts.length === 2 ? slashParts[1].trim() : null;

  let bassInfo = null;
  if (bassPart !== null) {
    if (!bassPart) {
      return { valid: false, raw: trimmed, rootId: null, typeId: null, suffix: null, bassId: null, symbol: trimmed };
    }
    bassInfo = parseNoteToken(bassPart);
    if (!bassInfo) {
      return { valid: false, raw: trimmed, rootId: null, typeId: null, suffix: null, bassId: null, symbol: trimmed };
    }
  }

  const m = /^([A-Ga-g])([#b♯♭]?)(.*)$/.exec(mainPart);
  if (!m) {
    return { valid: false, raw: trimmed, rootId: null, typeId: null, suffix: null, bassId: null, symbol: trimmed };
  }

  const rootInfo = parseNoteToken(m[1] + m[2]);
  if (!rootInfo) {
    return { valid: false, raw: trimmed, rootId: null, typeId: null, suffix: null, bassId: null, symbol: trimmed };
  }

  const rawSuffix = m[3].trim();
  // Preserve uppercase 'M7' distinction before lowercasing
  let typeId = null;
  if (rawSuffix === 'M7') {
    typeId = 'maj7';
  } else if (rawSuffix === 'M') {
    typeId = 'major';
  } else {
    const lowerSuffix = rawSuffix.toLowerCase();
    if (lowerSuffix in SUFFIX_ALIASES) {
      typeId = SUFFIX_ALIASES[lowerSuffix];
    } else {
      const matched = chordTypes.find((ct) => ct.suffix.toLowerCase() === lowerSuffix);
      if (matched) typeId = matched.id;
    }
  }

  if (!typeId) {
    return { valid: false, raw: trimmed, rootId: null, typeId: null, suffix: null, bassId: null, symbol: trimmed };
  }

  const ctObj = chordTypes.find((ct) => ct.id === typeId);
  const canonicalSuffix = ctObj ? ctObj.suffix : (typeId === 'major' ? '' : typeId);
  const symbol = `${rootInfo.display}${canonicalSuffix}${bassInfo ? '/' + bassInfo.display : ''}`;

  return {
    valid: true,
    raw: trimmed,
    rootId: rootInfo.canonicalId,
    rootSemitone: rootInfo.semitone,
    typeId,
    suffix: canonicalSuffix,
    bassId: bassInfo ? bassInfo.canonicalId : null,
    bassSemitone: bassInfo ? bassInfo.semitone : null,
    symbol
  };
}

/**
 * Transposes a chord string by `semitones` using consistent sharp or flat spelling.
 */
export function transposeChordSymbol(raw, semitones, accidentalMode = 'sharp', chordTypes = []) {
  const parsed = parseChordSymbol(raw, chordTypes);
  if (!parsed.valid) return raw;

  const shift = ((semitones % 12) + 12) % 12;
  if (shift === 0 && semitones === 0) return parsed.symbol;

  const table = accidentalMode === 'flat' ? FLAT_ROOTS : SHARP_ROOTS;
  const newRoot = table[(parsed.rootSemitone + shift) % 12];
  const newBass = parsed.bassSemitone !== null
    ? '/' + table[(parsed.bassSemitone + shift) % 12]
    : '';

  return `${newRoot}${parsed.suffix}${newBass}`;
}

/**
 * Transposes a standalone key name (e.g. "C", "F#", "Bb") consistently.
 */
export function transposeKeyName(keyName, semitones, accidentalMode = 'sharp') {
  const info = parseNoteToken(String(keyName || '').trim());
  if (!info) return keyName;
  const shift = ((semitones % 12) + 12) % 12;
  const table = accidentalMode === 'flat' ? FLAT_ROOTS : SHARP_ROOTS;
  return table[(info.semitone + shift) % 12];
}

/**
 * Parses multi-line chord progression text separated by '.', whitespace, ',' or '|'.
 * Example: "C . Am . F . G7" -> [["C", "Am", "F", "G7"]]
 */
export function parseProgressionText(text, chordTypes = []) {
  const lines = String(text || '').split(/\r?\n/);
  const progression = [];

  for (const line of lines) {
    const tokens = line
      .split(/[.\s,|]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) continue;

    const normalizedLine = tokens.map((tok) => {
      const parsed = parseChordSymbol(tok, chordTypes);
      return parsed.valid ? parsed.symbol : tok;
    });
    progression.push(normalizedLine);
  }

  return progression;
}

/**
 * Returns unique valid chord symbols across a 2D progression array.
 */
export function getUniqueChords(progression, chordTypes = []) {
  const seen = new Set();
  const unique = [];
  for (const line of progression) {
    for (const tok of line) {
      const parsed = parseChordSymbol(tok, chordTypes);
      if (parsed.valid && !seen.has(parsed.symbol)) {
        seen.add(parsed.symbol);
        unique.push(parsed.symbol);
      }
    }
  }
  return unique;
}
