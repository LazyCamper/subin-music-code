const WHITE_SEMIS = new Set([0, 2, 4, 5, 7, 9, 11]);

/**
 * Renders a 2-octave piano SVG (C4=60 .. B5=83) highlighting chord notes.
 */
export function renderPianoSVG(midiNotes, noteNames) {
  const startMidi = 60; // C4
  const endMidi = 83;   // B5 (24 semitones = 14 white keys)

  const activeMap = new Map();
  midiNotes.forEach((m, i) => {
    activeMap.set(m, {
      isRoot: i === 0,
      name: noteNames[i] || ''
    });
  });

  const whiteW = 32;
  const whiteH = 128;
  const blackW = 20;
  const blackH = 78;
  const totalWhite = 14;
  const width = totalWhite * whiteW;
  const height = whiteH + 8;

  const whiteKeys = [];
  const blackKeys = [];

  let whiteIdx = 0;
  for (let m = startMidi; m <= endMidi; m++) {
    const semi = m % 12;
    const info = activeMap.get(m);

    if (WHITE_SEMIS.has(semi)) {
      const x = whiteIdx * whiteW;
      const cls = info
        ? info.isRoot
          ? 'piano-key white active root'
          : 'piano-key white active'
        : 'piano-key white';

      whiteKeys.push(
        `<g>
          <rect class="${cls}" x="${x}" y="2" width="${whiteW}" height="${whiteH}" rx="4"/>
          ${info ? `<text class="piano-label" x="${x + whiteW / 2}" y="${whiteH - 12}" text-anchor="middle">${escapeXml(info.name)}</text>` : ''}
        </g>`
      );
      whiteIdx++;
    } else {
      const x = whiteIdx * whiteW - blackW / 2;
      const cls = info
        ? info.isRoot
          ? 'piano-key black active root'
          : 'piano-key black active'
        : 'piano-key black';

      blackKeys.push(
        `<g>
          <rect class="${cls}" x="${x}" y="2" width="${blackW}" height="${blackH}" rx="3"/>
          ${info ? `<text class="piano-label black-label" x="${x + blackW / 2}" y="${blackH - 10}" text-anchor="middle">${escapeXml(info.name)}</text>` : ''}
        </g>`
      );
    }
  }

  return `
    <svg class="chord-svg piano-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="피아노 건반 다이어그램">
      ${whiteKeys.join('')}
      ${blackKeys.join('')}
    </svg>
  `;
}

/**
 * Renders a vertical fretboard SVG for Guitar (6 strings) or Ukulele (4 strings).
 */
export function renderFretboardSVG({ chordData, tuningStrings, instrumentName }) {
  if (!chordData) {
    return `
      <div class="missing-diagram" role="status">
        <span class="missing-icon" aria-hidden="true">♪</span>
        <p class="missing-text">운지 준비 중</p>
        <p class="missing-sub">${escapeXml(instrumentName)} 대표 포지션 데이터가 아직 등록되지 않았습니다.</p>
      </div>
    `;
  }

  const { frets, fingers = [], baseFret = 1, barre = null } = chordData;
  const numStrings = tuningStrings.length;
  const numFrets = 5;

  const padLeft = 34;
  const padRight = 22;
  const padTop = 30;
  const padBottom = 26;
  const stringGap = numStrings === 4 ? 36 : 26;
  const fretGap = 28;

  const gridW = (numStrings - 1) * stringGap;
  const gridH = numFrets * fretGap;
  const width = padLeft + gridW + padRight;
  const height = padTop + gridH + padBottom;

  const parts = [];

  // Nut or baseFret indicator
  if (baseFret === 1) {
    parts.push(`<rect class="fret-nut" x="${padLeft - 1}" y="${padTop - 3}" width="${gridW + 2}" height="5" rx="1"/>`);
  } else {
    parts.push(`<line class="fret-line" x1="${padLeft}" y1="${padTop}" x2="${padLeft + gridW}" y2="${padTop}"/>`);
    parts.push(`<text class="fret-base-label" x="${padLeft - 10}" y="${padTop + fretGap * 0.65}" text-anchor="end">${baseFret}fr</text>`);
  }

  // Horizontal fret lines
  for (let f = 1; f <= numFrets; f++) {
    const y = padTop + f * fretGap;
    parts.push(`<line class="fret-line" x1="${padLeft}" y1="${y}" x2="${padLeft + gridW}" y2="${y}"/>`);
  }

  // Vertical string lines
  for (let s = 0; s < numStrings; s++) {
    const x = padLeft + s * stringGap;
    parts.push(`<line class="string-line" x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + gridH}"/>`);
    parts.push(`<text class="tuning-label" x="${x}" y="${padTop + gridH + 18}" text-anchor="middle">${escapeXml(tuningStrings[s])}</text>`);
  }

  // Barre bar
  if (barre && typeof barre.fret === 'number') {
    const relFret = barre.fret - baseFret + 1;
    if (relFret >= 1 && relFret <= numFrets) {
      const y = padTop + (relFret - 0.5) * fretGap;
      const x1 = padLeft + barre.from * stringGap;
      const x2 = padLeft + barre.to * stringGap;
      parts.push(`<rect class="barre-bar" x="${x1 - 9}" y="${y - 9}" width="${x2 - x1 + 18}" height="18" rx="9"/>`);
    }
  }

  // Open / Mute markers & finger dots
  for (let s = 0; s < numStrings; s++) {
    const fret = frets[s];
    const finger = fingers[s] || 0;
    const x = padLeft + s * stringGap;

    if (fret === -1) {
      parts.push(`<text class="marker-mute" x="${x}" y="${padTop - 10}" text-anchor="middle">✕</text>`);
    } else if (fret === 0) {
      parts.push(`<circle class="marker-open" cx="${x}" cy="${padTop - 14}" r="5.5"/>`);
    } else {
      const relFret = fret - baseFret + 1;
      if (relFret >= 1 && relFret <= numFrets) {
        const y = padTop + (relFret - 0.5) * fretGap;
        parts.push(`<circle class="finger-dot" cx="${x}" cy="${y}" r="9.5"/>`);
        if (finger > 0) {
          parts.push(`<text class="finger-num" x="${x}" y="${y + 3.5}" text-anchor="middle">${finger}</text>`);
        }
      }
    }
  }

  return `
    <svg class="chord-svg fretboard-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(instrumentName)} 운지 다이어그램">
      ${parts.join('')}
    </svg>
  `;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
