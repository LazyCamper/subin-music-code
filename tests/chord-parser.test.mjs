import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  parseChordSymbol,
  transposeChordSymbol,
  parseProgressionText
} from '../js/chord-parser.js';

const chordsData = JSON.parse(fs.readFileSync(new URL('../data/chords.json', import.meta.url), 'utf8'));
const chordTypes = chordsData.chordTypes;

const cases = [
  {
    input: 'C',
    expected: { valid: true, rootId: 'C', typeId: 'major', bassId: null, symbol: 'C' }
  },
  {
    input: 'Cm7',
    expected: { valid: true, rootId: 'C', typeId: 'm7', bassId: null, symbol: 'Cm7' }
  },
  {
    input: 'F#dim',
    expected: { valid: true, rootId: 'F#', typeId: 'dim', bassId: null, symbol: 'F#dim' }
  },
  {
    input: 'Bbmaj7',
    expected: { valid: true, rootId: 'Bb', typeId: 'maj7', bassId: null, symbol: 'Bbmaj7' }
  },
  {
    input: 'G/B',
    expected: { valid: true, rootId: 'G', typeId: 'major', bassId: 'B', symbol: 'G/B' }
  },
  {
    input: 'XYZ99',
    expected: { valid: false }
  }
];

let passed = 0;
for (const c of cases) {
  const res = parseChordSymbol(c.input, chordTypes);
  assert.equal(res.valid, c.expected.valid, `valid mismatch for ${c.input}`);
  if (c.expected.valid) {
    assert.equal(res.rootId, c.expected.rootId, `rootId mismatch for ${c.input}`);
    assert.equal(res.typeId, c.expected.typeId, `typeId mismatch for ${c.input}`);
    assert.equal(res.bassId, c.expected.bassId, `bassId mismatch for ${c.input}`);
    assert.equal(res.symbol, c.expected.symbol, `symbol mismatch for ${c.input}`);
  }
  passed++;
  console.log(`PASS parse: "${c.input}" -> valid=${res.valid}, root=${res.rootId}, type=${res.typeId}, bass=${res.bassId}`);
}

// Transpose checks
const t1 = transposeChordSymbol('G/B', 1, 'flat', chordTypes);
assert.equal(t1, 'Ab/C');
passed++;
console.log(`PASS transpose: "G/B" +1 (flat) -> "${t1}"`);

const t2 = transposeChordSymbol('Cm7', 2, 'sharp', chordTypes);
assert.equal(t2, 'Dm7');
passed++;
console.log(`PASS transpose: "Cm7" +2 (sharp) -> "${t2}"`);

const t3 = transposeChordSymbol('F#dim', -1, 'flat', chordTypes);
assert.equal(t3, 'Fdim');
passed++;
console.log(`PASS transpose: "F#dim" -1 (flat) -> "${t3}"`);

// Progression text parse check
const prog = parseProgressionText('| C | Am |\n| F | G7 |', chordTypes);
assert.deepEqual(prog, [['C', 'Am'], ['F', 'G7']]);
passed++;
console.log(`PASS progression: ${JSON.stringify(prog)}`);

console.log(`\nAll ${passed} chord-parser tests passed.`);
