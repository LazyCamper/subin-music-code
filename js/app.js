import {
  ROOTS,
  getRootById,
  formatChordSymbol,
  getChordKey,
  parseChordKey,
  getChordNotes,
  searchChords
} from './music.js';
import { renderPianoSVG, renderFretboardSVG } from './diagrams.js';
import { playChord } from './audio.js';
import {
  getFavorites,
  isFavorite,
  toggleFavorite,
  getLastState,
  saveLastState
} from './storage.js';
import { createSongsController } from './songs.js';

const state = {
  data: null,
  rootId: 'C',
  typeId: 'major',
  instrument: 'all', // 'all' | 'piano' | 'ukulele' | 'guitar'
  activeTab: 'chords' // 'chords' | 'favorites'
};

const els = {
  searchInput: document.getElementById('chord-search'),
  searchResults: document.getElementById('search-results'),
  rootGrid: document.getElementById('root-grid'),
  typeList: document.getElementById('type-list'),
  detailSymbol: document.getElementById('detail-symbol'),
  detailName: document.getElementById('detail-name'),
  detailNotes: document.getElementById('detail-notes'),
  btnPlay: document.getElementById('btn-play'),
  btnFavorite: document.getElementById('btn-favorite'),
  favIcon: document.getElementById('fav-icon'),
  diagramsContainer: document.getElementById('diagrams-container'),
  instTabs: document.querySelectorAll('.inst-tab'),
  navBtns: document.querySelectorAll('.nav-btn'),
  viewChords: document.getElementById('view-chords'),
  viewFavorites: document.getElementById('view-favorites'),
  viewSongs: document.getElementById('view-songs'),
  favoritesList: document.getElementById('favorites-list'),
  favTotalLabel: document.getElementById('fav-total-label'),
  navFavBadge: document.getElementById('nav-fav-badge'),
  btnAppLauncher: document.getElementById('btn-app-launcher'),
  appLauncherBackdrop: document.getElementById('app-launcher-backdrop'),
  launcherCloseBtn: document.getElementById('launcher-close-btn')
};

const songsController = createSongsController({
  getData: () => state.data,
  onOpenInChordTab: (rootId, typeId) => {
    selectChord(rootId, typeId);
    switchTab('chords');
  }
});

async function init() {
  const res = await fetch('./data/chords.json');
  state.data = await res.json();

  const saved = getLastState();
  if (saved) {
    if (ROOTS.some((r) => r.id === saved.rootId)) state.rootId = saved.rootId;
    if (state.data.chordTypes.some((t) => t.id === saved.typeId)) state.typeId = saved.typeId;
    if (['all', 'piano', 'ukulele', 'guitar'].includes(saved.instrument)) {
      state.instrument = saved.instrument;
    }
  }

  renderRoots();
  renderTypes();
  bindEvents();
  syncInstrumentTabs();
  renderDetail();
  renderFavorites();
  registerServiceWorker();
}

function getCurrentType() {
  return state.data.chordTypes.find((t) => t.id === state.typeId) || state.data.chordTypes[0];
}

function selectChord(rootId, typeId) {
  state.rootId = rootId;
  state.typeId = typeId;
  saveLastState({ rootId: state.rootId, typeId: state.typeId, instrument: state.instrument });
  renderRoots();
  renderTypes();
  renderDetail();
}

function renderRoots() {
  els.rootGrid.innerHTML = ROOTS.map(
    (root) => `
      <button
        class="root-btn ${root.id === state.rootId ? 'active' : ''}"
        type="button"
        data-root="${root.id}"
        aria-pressed="${root.id === state.rootId}"
      >${root.label}</button>
    `
  ).join('');
}

function renderTypes() {
  els.typeList.innerHTML = state.data.chordTypes.map((ct) => {
    const label = formatChordSymbol(state.rootId, ct.suffix);
    const active = ct.id === state.typeId;
    return `
      <button
        class="type-chip ${active ? 'active' : ''}"
        type="button"
        data-type="${ct.id}"
        aria-pressed="${active}"
      >${label}</button>
    `;
  }).join('');
}

function renderDetail() {
  const ct = getCurrentType();
  const key = getChordKey(state.rootId, ct.id);
  const symbol = formatChordSymbol(state.rootId, ct.suffix);
  const { midiNotes, noteNames } = getChordNotes(state.rootId, ct.intervals);

  els.detailSymbol.textContent = symbol;
  els.detailName.textContent = `${state.rootId} ${ct.name}`;
  els.detailNotes.innerHTML = noteNames
    .map((n, idx) => `<span class="note-pill ${idx === 0 ? 'root-note' : ''}">${n}</span>`)
    .join('');

  const fav = isFavorite(key);
  els.btnFavorite.setAttribute('aria-pressed', String(fav));
  els.btnFavorite.setAttribute('aria-label', fav ? '즐겨찾기 해제' : '즐겨찾기 추가');
  els.favIcon.textContent = fav ? '★' : '☆';

  const sections = [];

  if (state.instrument === 'all' || state.instrument === 'piano') {
    sections.push(`
      <article class="diagram-card">
        <div class="diagram-card-header">
          <h3 class="diagram-title">피아노</h3>
          <span class="diagram-sub">구성음: ${noteNames.join(' · ')}</span>
        </div>
        <div class="svg-wrap">${renderPianoSVG(midiNotes, noteNames)}</div>
      </article>
    `);
  }

  if (state.instrument === 'all' || state.instrument === 'ukulele') {
    const ukeData = state.data.ukulele[key] || null;
    sections.push(`
      <article class="diagram-card">
        <div class="diagram-card-header">
          <h3 class="diagram-title">우쿨렐레</h3>
          <span class="diagram-sub">${state.data.tunings.ukulele.label}</span>
        </div>
        <div class="svg-wrap">
          ${renderFretboardSVG({
            chordData: ukeData,
            tuningStrings: state.data.tunings.ukulele.strings,
            instrumentName: '우쿨렐레'
          })}
        </div>
      </article>
    `);
  }

  if (state.instrument === 'all' || state.instrument === 'guitar') {
    const guitarData = state.data.guitar[key] || null;
    sections.push(`
      <article class="diagram-card">
        <div class="diagram-card-header">
          <h3 class="diagram-title">기타</h3>
          <span class="diagram-sub">${state.data.tunings.guitar.label}</span>
        </div>
        <div class="svg-wrap">
          ${renderFretboardSVG({
            chordData: guitarData,
            tuningStrings: state.data.tunings.guitar.strings,
            instrumentName: '기타'
          })}
        </div>
      </article>
    `);
  }

  els.diagramsContainer.innerHTML = sections.join('');
}

function renderFavorites() {
  const favKeys = getFavorites();
  const count = favKeys.length;
  els.favTotalLabel.textContent = `${count}개`;

  if (count > 0) {
    els.navFavBadge.hidden = false;
    els.navFavBadge.textContent = String(count);
  } else {
    els.navFavBadge.hidden = true;
  }

  if (count === 0) {
    els.favoritesList.innerHTML = `
      <div class="fav-empty">
        <p>아직 즐겨찾기한 코드가 없습니다.</p>
        <p>코드 상세 화면에서 ☆ 버튼을 눌러 저장해 보세요.</p>
      </div>
    `;
    return;
  }

  els.favoritesList.innerHTML = favKeys
    .map((key) => {
      const { rootId, typeId } = parseChordKey(key);
      const ct = state.data.chordTypes.find((t) => t.id === typeId);
      if (!ct) return '';
      const root = getRootById(rootId);
      const symbol = formatChordSymbol(root.id, ct.suffix);
      return `
        <div class="fav-row">
          <button class="fav-jump-btn" type="button" data-fav-jump="${key}">
            <span class="fav-symbol">${symbol}</span>
            <span class="fav-desc">${root.id} ${ct.name}</span>
          </button>
          <button class="icon-btn" type="button" data-fav-play="${key}" aria-label="${symbol} 소리 듣기">▶</button>
          <button class="icon-btn fav-btn" type="button" data-fav-remove="${key}" aria-pressed="true" aria-label="${symbol} 즐겨찾기 해제">★</button>
        </div>
      `;
    })
    .join('');
}

function syncInstrumentTabs() {
  els.instTabs.forEach((tab) => {
    const active = tab.dataset.inst === state.instrument;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
}

function switchTab(tabName) {
  state.activeTab = tabName;
  els.viewChords.hidden = tabName !== 'chords';
  els.viewFavorites.hidden = tabName !== 'favorites';
  els.viewSongs.hidden = tabName !== 'songs';

  els.navBtns.forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('active', active);
    if (active) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  if (tabName === 'favorites') {
    renderFavorites();
  } else if (tabName === 'songs') {
    songsController.render();
  }
}

function renderSearchResults(query) {
  const matches = searchChords(query, state.data.chordTypes);
  if (!query.trim() || matches.length === 0) {
    els.searchResults.hidden = true;
    els.searchResults.innerHTML = '';
    return;
  }

  els.searchResults.innerHTML = matches
    .map(
      (item) => `
        <button class="search-item" type="button" role="option" data-search-key="${item.key}">
          <span class="search-item-symbol">${item.symbol}</span>
          <span class="search-item-name">${item.root.id} ${item.chordType.name}</span>
        </button>
      `
    )
    .join('');
  els.searchResults.hidden = false;
}

function bindEvents() {
  els.rootGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-root]');
    if (!btn) return;
    selectChord(btn.dataset.root, state.typeId);
  });

  els.typeList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    selectChord(state.rootId, btn.dataset.type);
  });

  els.instTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      state.instrument = tab.dataset.inst;
      saveLastState({ rootId: state.rootId, typeId: state.typeId, instrument: state.instrument });
      syncInstrumentTabs();
      renderDetail();
    });
  });

  els.btnPlay.addEventListener('click', () => {
    const ct = getCurrentType();
    const { midiNotes } = getChordNotes(state.rootId, ct.intervals);
    playChord(midiNotes);
  });

  els.btnFavorite.addEventListener('click', () => {
    const key = getChordKey(state.rootId, state.typeId);
    toggleFavorite(key);
    renderDetail();
    renderFavorites();
  });

  els.navBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  els.favoritesList.addEventListener('click', (e) => {
    const jumpBtn = e.target.closest('[data-fav-jump]');
    if (jumpBtn) {
      const { rootId, typeId } = parseChordKey(jumpBtn.dataset.favJump);
      selectChord(rootId, typeId);
      switchTab('chords');
      return;
    }

    const playBtn = e.target.closest('[data-fav-play]');
    if (playBtn) {
      const { rootId, typeId } = parseChordKey(playBtn.dataset.favPlay);
      const ct = state.data.chordTypes.find((t) => t.id === typeId);
      if (ct) {
        const { midiNotes } = getChordNotes(rootId, ct.intervals);
        playChord(midiNotes);
      }
      return;
    }

    const removeBtn = e.target.closest('[data-fav-remove]');
    if (removeBtn) {
      toggleFavorite(removeBtn.dataset.favRemove);
      renderDetail();
      renderFavorites();
    }
  });

  els.searchInput.addEventListener('input', (e) => {
    renderSearchResults(e.target.value);
  });

  els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const matches = searchChords(els.searchInput.value, state.data.chordTypes);
      if (matches.length > 0) {
        const first = matches[0];
        selectChord(first.root.id, first.chordType.id);
        switchTab('chords');
        els.searchInput.value = '';
        els.searchResults.hidden = true;
        els.searchInput.blur();
      }
    } else if (e.key === 'Escape') {
      els.searchResults.hidden = true;
    }
  });

  els.searchResults.addEventListener('click', (e) => {
    const item = e.target.closest('[data-search-key]');
    if (!item) return;
    const { rootId, typeId } = parseChordKey(item.dataset.searchKey);
    selectChord(rootId, typeId);
    switchTab('chords');
    els.searchInput.value = '';
    els.searchResults.hidden = true;
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
      els.searchResults.hidden = true;
    }
  });

  function setLauncherOpen(open) {
    if (!els.appLauncherBackdrop || !els.btnAppLauncher) return;
    els.appLauncherBackdrop.hidden = !open;
    els.btnAppLauncher.setAttribute('aria-expanded', String(open));
  }

  els.btnAppLauncher?.addEventListener('click', () => setLauncherOpen(true));
  els.launcherCloseBtn?.addEventListener('click', () => setLauncherOpen(false));
  els.appLauncherBackdrop?.addEventListener('click', (e) => {
    if (e.target === els.appLauncherBackdrop) setLauncherOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.appLauncherBackdrop && !els.appLauncherBackdrop.hidden) {
      setLauncherOpen(false);
    }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

init();
