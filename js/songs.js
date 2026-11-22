import { ROOTS, getChordKey, getChordNotes } from './music.js';
import {
  parseChordSymbol,
  transposeChordSymbol,
  transposeKeyName,
  parseProgressionText,
  getUniqueChords
} from './chord-parser.js';
import { renderPianoSVG, renderFretboardSVG } from './diagrams.js';
import { playChord } from './audio.js';
import {
  getSongs,
  saveSong,
  deleteSong,
  exportSongsJson,
  importSongsJson
} from './storage.js';

export function createSongsController({ getData, onOpenInChordTab }) {
  const container = document.getElementById('view-songs');
  const sheetBackdrop = document.getElementById('chord-sheet-backdrop');
  const sheetContent = document.getElementById('chord-sheet-content');

  const ui = {
    mode: 'list', // 'list' | 'detail' | 'edit'
    searchQuery: '',
    activeSongId: null,
    transpose: 0,
    accidentalMode: 'sharp', // 'sharp' | 'flat'
    draft: null,
    selectedLineIdx: 0,
    pickerRoot: 'C',
    pickerType: 'major'
  };

  function getChordTypes() {
    return getData()?.chordTypes || [];
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render() {
    if (!container || !getData()) return;
    if (ui.mode === 'list') {
      renderList();
    } else if (ui.mode === 'detail') {
      renderDetail();
    } else if (ui.mode === 'edit') {
      renderEdit();
    }
  }

  function renderList() {
    const allSongs = getSongs();
    const q = ui.searchQuery.trim().toLowerCase();
    const filtered = q
      ? allSongs.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            (s.artist || '').toLowerCase().includes(q)
        )
      : allSongs;

    container.innerHTML = `
      <div class="panel">
        <div class="songs-toolbar">
          <h2 class="section-label">내 곡 (${allSongs.length})</h2>
          <button class="primary-btn" type="button" data-action="new-song">+ 새 곡 등록</button>
        </div>

        <input
          id="song-search-input"
          class="search-input song-search-input"
          type="search"
          placeholder="곡명 또는 아티스트 검색"
          value="${escapeHtml(ui.searchQuery)}"
        >

        <div class="backup-row">
          <button class="secondary-btn" type="button" data-action="export-songs">내보내기 (JSON)</button>
          <label class="secondary-btn file-btn">
            가져오기 (JSON)
            <input id="song-import-input" type="file" accept=".json,application/json" hidden>
          </label>
        </div>
      </div>

      <div class="songs-list">
        ${
          filtered.length === 0
            ? `<div class="panel fav-empty">
                <p>${allSongs.length === 0 ? '저장된 곡이 아직 없습니다.' : '검색 결과가 없습니다.'}</p>
                <p>상단 <strong>+ 새 곡 등록</strong> 버튼으로 코드 진행을 저장해 보세요.</p>
              </div>`
            : filtered
                .map((song) => {
                  const preview = song.progression.flat().slice(0, 8).join(' · ');
                  return `
                    <article class="panel song-card">
                      <button class="song-card-main" type="button" data-action="open-song" data-song-id="${escapeHtml(song.id)}">
                        <div class="song-card-top">
                          <strong class="song-card-title">${escapeHtml(song.title)}</strong>
                          ${song.originalKey ? `<span class="song-key-badge">Key ${escapeHtml(song.originalKey)}</span>` : ''}
                        </div>
                        ${song.artist ? `<div class="song-card-artist">${escapeHtml(song.artist)}</div>` : ''}
                        <div class="song-card-preview">${escapeHtml(preview || '코드 진행 없음')}</div>
                      </button>
                      <div class="song-card-actions">
                        <button class="icon-btn" type="button" data-action="edit-song" data-song-id="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)} 수정">수정</button>
                        <button class="icon-btn danger-btn" type="button" data-action="delete-song" data-song-id="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)} 삭제">삭제</button>
                      </div>
                    </article>
                  `;
                })
                .join('')
        }
      </div>
    `;
  }

  function renderDetail() {
    const song = getSongs().find((s) => s.id === ui.activeSongId);
    if (!song) {
      ui.mode = 'list';
      renderList();
      return;
    }

    const chordTypes = getChordTypes();
    const transposedProg = song.progression.map((line) =>
      line.map((c) => transposeChordSymbol(c, ui.transpose, ui.accidentalMode, chordTypes))
    );
    const uniqueChords = getUniqueChords(transposedProg, chordTypes);
    const displayKey = song.originalKey
      ? transposeKeyName(song.originalKey, ui.transpose, ui.accidentalMode)
      : '';

    const shiftLabel = ui.transpose === 0
      ? '원키 (0)'
      : ui.transpose > 0
        ? `+${ui.transpose} 반음`
        : `${ui.transpose} 반음`;

    container.innerHTML = `
      <div class="panel">
        <div class="song-detail-nav">
          <button class="secondary-btn" type="button" data-action="back-list">← 목록</button>
          <div class="song-detail-nav-actions">
            <button class="secondary-btn" type="button" data-action="edit-song" data-song-id="${escapeHtml(song.id)}">수정</button>
            <button class="secondary-btn danger-btn" type="button" data-action="delete-song" data-song-id="${escapeHtml(song.id)}">삭제</button>
          </div>
        </div>

        <h2 class="song-detail-title">${escapeHtml(song.title)}</h2>
        <div class="song-detail-meta">
          ${song.artist ? `<span>${escapeHtml(song.artist)}</span>` : ''}
          ${displayKey ? `<span class="song-key-badge">Key ${escapeHtml(displayKey)}</span>` : ''}
        </div>
        ${song.memo ? `<p class="song-detail-memo">${escapeHtml(song.memo)}</p>` : ''}

        <div class="transpose-bar" aria-label="키 변경">
          <button class="icon-btn" type="button" data-action="transpose-down" aria-label="1반음 내리기">-1</button>
          <button class="secondary-btn transpose-reset" type="button" data-action="transpose-reset">${shiftLabel}</button>
          <button class="icon-btn" type="button" data-action="transpose-up" aria-label="1반음 올리기">+1</button>
          <button class="secondary-btn acc-toggle" type="button" data-action="toggle-accidental">
            ${ui.accidentalMode === 'sharp' ? '# 표기' : 'b 표기'}
          </button>
        </div>
      </div>

      <div class="panel">
        <h3 class="section-label">사용 코드 모음 (${uniqueChords.length})</h3>
        <div class="used-chords-wrap">
          ${
            uniqueChords.length === 0
              ? '<span class="diagram-sub">등록된 코드가 없습니다.</span>'
              : uniqueChords
                  .map(
                    (sym) => `<button class="used-chord-chip" type="button" data-action="inspect-chord" data-chord="${escapeHtml(sym)}">${escapeHtml(sym)}</button>`
                  )
                  .join('')
          }
        </div>
      </div>

      <div class="panel">
        <h3 class="section-label">코드 진행 (코드를 탭하면 운지를 볼 수 있습니다)</h3>
        <div class="progression-view">
          ${
            transposedProg.length === 0
              ? '<p class="diagram-sub">등록된 진행이 없습니다.</p>'
              : transposedProg
                  .map(
                    (line, idx) => `
                      <div class="prog-line-card">
                        <span class="prog-line-num">${idx + 1}</span>
                        <div class="prog-line-chords">
                          ${line
                            .map((tok) => {
                              const parsed = parseChordSymbol(tok, chordTypes);
                              return `<button class="prog-chord-btn ${parsed.valid ? '' : 'invalid-chord'}" type="button" data-action="inspect-chord" data-chord="${escapeHtml(tok)}">${escapeHtml(tok)}</button>`;
                            })
                            .join('')}
                        </div>
                      </div>
                    `
                  )
                  .join('')
          }
        </div>
      </div>
    `;
  }

  function startDraft(song = null) {
    ui.draft = song
      ? {
          id: song.id,
          title: song.title,
          artist: song.artist || '',
          originalKey: song.originalKey || '',
          memo: song.memo || '',
          progression: song.progression.map((line) => [...line])
        }
      : {
          id: null,
          title: '',
          artist: '',
          originalKey: '',
          memo: '',
          progression: [[]]
        };
    if (ui.draft.progression.length === 0) ui.draft.progression.push([]);
    ui.selectedLineIdx = 0;
    ui.mode = 'edit';
    render();
  }

  function renderEdit() {
    const d = ui.draft;
    const chordTypes = getChordTypes();
    if (ui.selectedLineIdx >= d.progression.length) {
      ui.selectedLineIdx = Math.max(0, d.progression.length - 1);
    }

    const invalidList = [];
    d.progression.forEach((line) => {
      line.forEach((tok) => {
        if (!parseChordSymbol(tok, chordTypes).valid) invalidList.push(tok);
      });
    });

    const textPreview = d.progression
      .filter((l) => l.length > 0)
      .map((l) => l.join(' . '))
      .join('\n');

    container.innerHTML = `
      <div class="panel">
        <div class="song-detail-nav">
          <button class="secondary-btn" type="button" data-action="cancel-edit">취소</button>
          <h2 class="edit-title">${d.id ? '곡 수정' : '새 곡 등록'}</h2>
          <button class="primary-btn" type="button" data-action="save-song">저장</button>
        </div>

        <div class="form-grid">
          <label class="form-field">
            <span class="field-label">곡명 *</span>
            <input id="draft-title" class="search-input" type="text" placeholder="예: 벚꽃 엔딩" value="${escapeHtml(d.title)}" required>
          </label>
          <div class="form-row-2">
            <label class="form-field">
              <span class="field-label">아티스트</span>
              <input id="draft-artist" class="search-input" type="text" placeholder="예: 버스커 버스커" value="${escapeHtml(d.artist)}">
            </label>
            <label class="form-field">
              <span class="field-label">원곡 키</span>
              <input id="draft-key" class="search-input" type="text" placeholder="예: C, Eb" value="${escapeHtml(d.originalKey)}">
            </label>
          </div>
          <label class="form-field">
            <span class="field-label">메모</span>
            <input id="draft-memo" class="search-input" type="text" placeholder="카포 위치, 템포 등" value="${escapeHtml(d.memo)}">
          </label>
        </div>
      </div>

      <div class="panel">
        <h3 class="section-label">입력 방법 A · 텍스트로 붙여넣기</h3>
        <textarea id="draft-text-prog" class="prog-textarea" rows="3" placeholder="C . Am . F . G7&#10;점(.) 또는 띄어쓰기로 구분, 줄바꿈으로 마디 줄 구분">${escapeHtml(textPreview)}</textarea>
        <button class="secondary-btn full-btn" type="button" data-action="apply-text-prog">텍스트를 코드 진행에 반영</button>
      </div>

      <div class="panel">
        <h3 class="section-label">입력 방법 B · 선택해서 하나씩 추가</h3>
        <div class="picker-row">
          <select id="picker-root" class="search-input picker-select" aria-label="루트 선택">
            ${ROOTS.map((r) => `<option value="${r.id}" ${r.id === ui.pickerRoot ? 'selected' : ''}>${r.label}</option>`).join('')}
          </select>
          <select id="picker-type" class="search-input picker-select" aria-label="코드 종류 선택">
            ${chordTypes.map((ct) => `<option value="${ct.id}" ${ct.id === ui.pickerType ? 'selected' : ''}>${ct.suffix || 'Major'} (${ct.name})</option>`).join('')}
          </select>
          <button class="primary-btn" type="button" data-action="add-picked-chord">+ 추가</button>
        </div>
      </div>

      <div class="panel">
        <div class="songs-toolbar">
          <h3 class="section-label">코드 진행 편집 (${ui.selectedLineIdx + 1}번째 줄 선택됨)</h3>
          <button class="secondary-btn" type="button" data-action="add-line">+ 새 줄</button>
        </div>

        ${
          invalidList.length > 0
            ? `<div class="validation-banner" role="alert">인식할 수 없는 코드: <strong>${escapeHtml(invalidList.join(', '))}</strong></div>`
            : ''
        }

        <div class="edit-lines">
          ${d.progression
            .map(
              (line, lIdx) => `
                <div class="edit-line-card ${lIdx === ui.selectedLineIdx ? 'selected-line' : ''}" data-line-idx="${lIdx}">
                  <div class="edit-line-header">
                    <button class="line-select-btn" type="button" data-action="select-line" data-line="${lIdx}">
                      ${lIdx + 1}번째 줄 ${lIdx === ui.selectedLineIdx ? '(선택됨)' : ''}
                    </button>
                    <div class="line-order-btns">
                      <button class="mini-btn" type="button" data-action="move-line-up" data-line="${lIdx}" aria-label="줄 위로">↑</button>
                      <button class="mini-btn" type="button" data-action="move-line-down" data-line="${lIdx}" aria-label="줄 아래로">↓</button>
                      <button class="mini-btn danger-btn" type="button" data-action="remove-line" data-line="${lIdx}" aria-label="줄 삭제">✕</button>
                    </div>
                  </div>
                  <div class="edit-chord-chips">
                    ${
                      line.length === 0
                        ? '<span class="diagram-sub">코드가 없습니다. 위에서 추가해 주세요.</span>'
                        : line
                            .map((tok, cIdx) => {
                              const valid = parseChordSymbol(tok, chordTypes).valid;
                              return `
                                <div class="edit-chord-chip ${valid ? '' : 'invalid-chord'}">
                                  <span class="edit-chord-text">${escapeHtml(tok)}</span>
                                  <button class="chip-ctrl-btn" type="button" data-action="move-chord-left" data-line="${lIdx}" data-chord-idx="${cIdx}" aria-label="왼쪽 이동">◀</button>
                                  <button class="chip-ctrl-btn" type="button" data-action="move-chord-right" data-line="${lIdx}" data-chord-idx="${cIdx}" aria-label="오른쪽 이동">▶</button>
                                  <button class="chip-ctrl-btn danger-text" type="button" data-action="remove-chord" data-line="${lIdx}" data-chord-idx="${cIdx}" aria-label="코드 삭제">×</button>
                                </div>
                              `;
                            })
                            .join('')
                    }
                  </div>
                </div>
              `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  function syncDraftFieldsFromDom() {
    if (!ui.draft) return;
    const titleEl = document.getElementById('draft-title');
    const artistEl = document.getElementById('draft-artist');
    const keyEl = document.getElementById('draft-key');
    const memoEl = document.getElementById('draft-memo');
    if (titleEl) ui.draft.title = titleEl.value;
    if (artistEl) ui.draft.artist = artistEl.value;
    if (keyEl) ui.draft.originalKey = keyEl.value;
    if (memoEl) ui.draft.memo = memoEl.value;
  }

  function openChordSheet(chordStr) {
    const data = getData();
    const parsed = parseChordSymbol(chordStr, data.chordTypes);
    if (!parsed.valid) {
      alert(`"${chordStr}"은(는) 인식할 수 없는 코드입니다.`);
      return;
    }

    const ct = data.chordTypes.find((t) => t.id === parsed.typeId);
    const key = getChordKey(parsed.rootId, parsed.typeId);
    const { midiNotes, noteNames } = getChordNotes(parsed.rootId, ct.intervals);
    const guitarData = data.guitar[key] || null;
    const ukeData = data.ukulele[key] || null;

    sheetContent.innerHTML = `
      <div class="sheet-header">
        <div>
          <h3 class="detail-symbol">${escapeHtml(parsed.symbol)}</h3>
          <span class="detail-name">${escapeHtml(parsed.rootId)} ${escapeHtml(ct.name)}${parsed.bassId ? ` (베이스 ${escapeHtml(parsed.bassId)})` : ''}</span>
        </div>
        <div class="detail-actions">
          <button id="sheet-play-btn" class="icon-btn play-btn" type="button">▶ 듣기</button>
          <button id="sheet-open-tab-btn" class="secondary-btn" type="button">코드 탭</button>
          <button id="sheet-close-btn" class="icon-btn" type="button" aria-label="닫기">✕</button>
        </div>
      </div>
      <div class="note-pills" style="margin-bottom: 12px;">
        ${noteNames.map((n, i) => `<span class="note-pill ${i === 0 ? 'root-note' : ''}">${escapeHtml(n)}</span>`).join('')}
      </div>
      <div class="diagrams-container">
        <article class="diagram-card">
          <div class="diagram-card-header">
            <h4 class="diagram-title">피아노</h4>
            <span class="diagram-sub">${noteNames.join(' · ')}</span>
          </div>
          <div class="svg-wrap">${renderPianoSVG(midiNotes, noteNames)}</div>
        </article>
        <article class="diagram-card">
          <div class="diagram-card-header">
            <h4 class="diagram-title">우쿨렐레</h4>
          </div>
          <div class="svg-wrap">${renderFretboardSVG({ chordData: ukeData, tuningStrings: data.tunings.ukulele.strings, instrumentName: '우쿨렐레' })}</div>
        </article>
        <article class="diagram-card">
          <div class="diagram-card-header">
            <h4 class="diagram-title">기타</h4>
          </div>
          <div class="svg-wrap">${renderFretboardSVG({ chordData: guitarData, tuningStrings: data.tunings.guitar.strings, instrumentName: '기타' })}</div>
        </article>
      </div>
    `;

    sheetBackdrop.hidden = false;

    document.getElementById('sheet-play-btn').addEventListener('click', () => playChord(midiNotes));
    document.getElementById('sheet-close-btn').addEventListener('click', closeChordSheet);
    document.getElementById('sheet-open-tab-btn').addEventListener('click', () => {
      closeChordSheet();
      onOpenInChordTab(parsed.rootId, parsed.typeId);
    });
  }

  function closeChordSheet() {
    sheetBackdrop.hidden = true;
  }

  function bindEvents() {
    sheetBackdrop.addEventListener('click', (e) => {
      if (e.target === sheetBackdrop) closeChordSheet();
    });

    container.addEventListener('input', (e) => {
      if (e.target.id === 'song-search-input') {
        ui.searchQuery = e.target.value;
        renderList();
        const input = document.getElementById('song-search-input');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    });

    container.addEventListener('change', async (e) => {
      if (e.target.id === 'picker-root') ui.pickerRoot = e.target.value;
      if (e.target.id === 'picker-type') ui.pickerType = e.target.value;
      if (e.target.id === 'song-import-input') {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const res = importSongsJson(text);
          alert(`가져오기 완료: 추가 ${res.added}곡, 업데이트 ${res.updated}곡`);
          renderList();
        } catch (err) {
          alert(`가져오기 실패: ${err.message}`);
        }
      }
    });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'new-song') {
        startDraft(null);
        return;
      }

      if (action === 'export-songs') {
        const json = exportSongsJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-chords-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (action === 'open-song') {
        ui.activeSongId = btn.dataset.songId;
        ui.transpose = 0;
        ui.mode = 'detail';
        render();
        return;
      }

      if (action === 'edit-song') {
        const song = getSongs().find((s) => s.id === btn.dataset.songId);
        if (song) startDraft(song);
        return;
      }

      if (action === 'delete-song') {
        const song = getSongs().find((s) => s.id === btn.dataset.songId);
        if (song && confirm(`"${song.title}" 곡을 삭제할까요?`)) {
          deleteSong(song.id);
          ui.mode = 'list';
          render();
        }
        return;
      }

      if (action === 'back-list' || action === 'cancel-edit') {
        ui.mode = 'list';
        render();
        return;
      }

      if (action === 'transpose-up') {
        ui.transpose = (ui.transpose + 1) % 12;
        renderDetail();
        return;
      }

      if (action === 'transpose-down') {
        ui.transpose = (ui.transpose - 1 + 12) % 12;
        renderDetail();
        return;
      }

      if (action === 'transpose-reset') {
        ui.transpose = 0;
        renderDetail();
        return;
      }

      if (action === 'toggle-accidental') {
        ui.accidentalMode = ui.accidentalMode === 'sharp' ? 'flat' : 'sharp';
        renderDetail();
        return;
      }

      if (action === 'inspect-chord') {
        openChordSheet(btn.dataset.chord);
        return;
      }

      // --- Edit Mode Actions ---
      if (action === 'apply-text-prog') {
        syncDraftFieldsFromDom();
        const textEl = document.getElementById('draft-text-prog');
        const parsed = parseProgressionText(textEl?.value || '', getChordTypes());
        ui.draft.progression = parsed.length > 0 ? parsed : [[]];
        ui.selectedLineIdx = 0;
        renderEdit();
        return;
      }

      if (action === 'add-picked-chord') {
        syncDraftFieldsFromDom();
        const ct = getChordTypes().find((t) => t.id === ui.pickerType);
        const sym = `${ui.pickerRoot}${ct ? ct.suffix : ''}`;
        if (!ui.draft.progression[ui.selectedLineIdx]) {
          ui.draft.progression.push([]);
          ui.selectedLineIdx = ui.draft.progression.length - 1;
        }
        ui.draft.progression[ui.selectedLineIdx].push(sym);
        renderEdit();
        return;
      }

      if (action === 'add-line') {
        syncDraftFieldsFromDom();
        ui.draft.progression.push([]);
        ui.selectedLineIdx = ui.draft.progression.length - 1;
        renderEdit();
        return;
      }

      if (action === 'select-line') {
        syncDraftFieldsFromDom();
        ui.selectedLineIdx = Number(btn.dataset.line);
        renderEdit();
        return;
      }

      if (action === 'move-line-up') {
        syncDraftFieldsFromDom();
        const i = Number(btn.dataset.line);
        if (i > 0) {
          [ui.draft.progression[i - 1], ui.draft.progression[i]] = [ui.draft.progression[i], ui.draft.progression[i - 1]];
          ui.selectedLineIdx = i - 1;
          renderEdit();
        }
        return;
      }

      if (action === 'move-line-down') {
        syncDraftFieldsFromDom();
        const i = Number(btn.dataset.line);
        if (i < ui.draft.progression.length - 1) {
          [ui.draft.progression[i + 1], ui.draft.progression[i]] = [ui.draft.progression[i], ui.draft.progression[i + 1]];
          ui.selectedLineIdx = i + 1;
          renderEdit();
        }
        return;
      }

      if (action === 'remove-line') {
        syncDraftFieldsFromDom();
        const i = Number(btn.dataset.line);
        ui.draft.progression.splice(i, 1);
        if (ui.draft.progression.length === 0) ui.draft.progression.push([]);
        ui.selectedLineIdx = Math.min(ui.selectedLineIdx, ui.draft.progression.length - 1);
        renderEdit();
        return;
      }

      if (action === 'move-chord-left') {
        syncDraftFieldsFromDom();
        const l = Number(btn.dataset.line);
        const c = Number(btn.dataset.chordIdx);
        const line = ui.draft.progression[l];
        if (line && c > 0) {
          [line[c - 1], line[c]] = [line[c], line[c - 1]];
          renderEdit();
        }
        return;
      }

      if (action === 'move-chord-right') {
        syncDraftFieldsFromDom();
        const l = Number(btn.dataset.line);
        const c = Number(btn.dataset.chordIdx);
        const line = ui.draft.progression[l];
        if (line && c < line.length - 1) {
          [line[c + 1], line[c]] = [line[c], line[c + 1]];
          renderEdit();
        }
        return;
      }

      if (action === 'remove-chord') {
        syncDraftFieldsFromDom();
        const l = Number(btn.dataset.line);
        const c = Number(btn.dataset.chordIdx);
        ui.draft.progression[l]?.splice(c, 1);
        renderEdit();
        return;
      }

      if (action === 'save-song') {
        syncDraftFieldsFromDom();
        if (!ui.draft.title.trim()) {
          alert('곡명을 입력해 주세요.');
          document.getElementById('draft-title')?.focus();
          return;
        }
        const cleanedProg = ui.draft.progression.filter((line) => line.length > 0);
        const invalidTokens = [];
        for (const line of cleanedProg) {
          for (const tok of line) {
            if (!parseChordSymbol(tok, getChordTypes()).valid) {
              invalidTokens.push(tok);
            }
          }
        }
        if (invalidTokens.length > 0) {
          const proceed = confirm(
            `인식할 수 없는 코드(${invalidTokens.join(', ')})가 포함되어 있습니다.\n그래도 저장할까요?`
          );
          if (!proceed) return;
        }

        const saved = saveSong({
          ...ui.draft,
          progression: cleanedProg
        });
        ui.activeSongId = saved.id;
        ui.transpose = 0;
        ui.mode = 'detail';
        render();
      }
    });
  }

  bindEvents();

  return {
    render,
    showList() {
      ui.mode = 'list';
      render();
    }
  };
}
