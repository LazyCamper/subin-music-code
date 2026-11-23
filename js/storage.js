const FAVORITES_KEY = 'subin_chord_favorites_v1';
const LAST_STATE_KEY = 'subin_chord_last_v1';
const SONGS_KEY = 'subin_chord_songs_v1';
const THEME_KEY = 'subin_chord_theme_v1';
export const SONGS_SCHEMA_VERSION = 1;

const DEFAULT_SONGS = [
  {
    id: 'builtin_akmu_give_love',
    title: 'Give Love',
    artist: '악동뮤지션 (AKMU)',
    originalKey: 'F',
    memo: '전 구간 4코드 루프 · 카포 1프렛 시 E 키 폼(-1 반음)',
    progression: [
      ['F', 'Am7', 'Dm7', 'Bb'],
      ['F', 'Am7', 'Dm7', 'Bb']
    ]
  },
  {
    id: 'builtin_hanroro_landing_in_love',
    title: '사랑하게 될 거야',
    artist: '한로로',
    originalKey: 'G',
    memo: '모던록 약 92 BPM · G 키 오픈 코드 위주',
    progression: [
      ['G', 'B7', 'Em', 'C', 'D', 'G'],
      ['G', 'B7', 'Em', 'B7', 'C', 'D', 'G'],
      ['B7', 'Em', 'B7', 'Em'],
      ['B7', 'Em', 'C', 'D'],
      ['G', 'B7', 'Em', 'G7', 'C', 'D', 'G'],
      ['G', 'B7', 'Em', 'B7', 'C', 'D', 'G']
    ]
  },
  {
    id: 'builtin_hachiware_hitorigotsu',
    title: '혼잣말 (ひとりごつ)',
    artist: '하치와레',
    originalKey: 'C',
    memo: '원곡 키 C 기준 (Verse 1 · Verse 2 · Chorus)',
    progression: [
      ['C', 'E7'],
      ['FM7', 'FM7', 'G'],
      ['FM7', 'FM7'],
      ['C', 'E7', 'FM7'],
      ['FM7', 'G', 'C'],
      ['Em', 'Am'],
      ['FM7', 'Dadd2', 'G'],
      ['C', 'E7', 'FM7'],
      ['FM7', 'G', 'C'],
      ['Bb', 'F', 'Bb', 'F', 'G#', 'Bb'],
      ['C', 'F', 'Dm', 'G'],
      ['C/E', 'F', 'Dm', 'G'],
      ['C/E', 'F', 'Dm', 'G', 'F'],
      ['F'],
      ['Bb', 'F', 'C']
    ]
  },
  {
    id: 'builtin_busker_cherry_blossom',
    title: '벚꽃 엔딩',
    artist: '버스커 버스커',
    originalKey: 'A',
    memo: '셔플 리듬 · 카포 2프렛 시 Am-D7-G-Em 폼(-2 반음)',
    progression: [
      ['Bm7', 'E7', 'Amaj7', 'F#m7'],
      ['Bm7', 'E7', 'Amaj7', 'F#m7']
    ]
  }
];

export function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

export function isFavorite(chordKey) {
  return getFavorites().includes(chordKey);
}

export function toggleFavorite(chordKey) {
  const list = getFavorites();
  const idx = list.indexOf(chordKey);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift(chordKey);
  }
  saveFavorites(list);
  return list;
}

export function getLastState() {
  try {
    const raw = localStorage.getItem(LAST_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastState(state) {
  try {
    localStorage.setItem(LAST_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function getTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'default';
  } catch {
    return 'default';
  }
}

export function saveTheme(themeId) {
  try {
    localStorage.setItem(THEME_KEY, themeId);
  } catch {
    // Ignore storage errors
  }
}

/* --- My Songs / Chord Progressions --- */

function migrateSongsStore(rawStore) {
  if (!rawStore || typeof rawStore !== 'object') {
    return { schemaVersion: SONGS_SCHEMA_VERSION, songs: [] };
  }
  const songs = Array.isArray(rawStore.songs) ? rawStore.songs : [];
  const normalized = songs
    .filter((s) => s && typeof s === 'object' && typeof s.title === 'string' && s.title.trim())
    .map((s) => {
      const rawTitle = s.title.trim();
      const title =
        s.id === 'builtin_hachiware_hitorigotsu' && rawTitle === '혼자말 (ひとりごつ)'
          ? '혼잣말 (ひとりごつ)'
          : rawTitle;
      let progression = Array.isArray(s.progression)
        ? s.progression
            .filter((line) => Array.isArray(line) && line.length > 0)
            .map((line) => line.map((c) => String(c).trim()).filter(Boolean))
            .filter((line) => line.length > 0)
        : [];
      let memo = typeof s.memo === 'string' ? s.memo.trim() : '';

      if (
        s.id === 'builtin_hachiware_hitorigotsu' &&
        JSON.stringify(progression) === JSON.stringify([['C', 'F', 'G', 'C'], ['Am', 'Em', 'F', 'G'], ['C', 'E7', 'Am', 'F', 'G', 'C']])
      ) {
        const latest = DEFAULT_SONGS.find((d) => d.id === 'builtin_hachiware_hitorigotsu');
        if (latest) {
          progression = latest.progression.map((line) => [...line]);
          memo = latest.memo;
        }
      }

      return {
        id: typeof s.id === 'string' && s.id ? s.id : generateSongId(),
        title,
        artist: typeof s.artist === 'string' ? s.artist.trim() : '',
        originalKey: typeof s.originalKey === 'string' ? s.originalKey.trim() : '',
        memo,
        progression,
        createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
        updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : new Date().toISOString()
      };
    });

  return {
    schemaVersion: SONGS_SCHEMA_VERSION,
    seededDefaults: Boolean(rawStore.seededDefaults),
    songs: normalized
  };
}

function generateSongId() {
  return `song_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function loadSongsStore() {
  try {
    const raw = localStorage.getItem(SONGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const store = migrateSongsStore(parsed);

    if (!store.seededDefaults) {
      const now = new Date().toISOString();
      const existingIds = new Set(store.songs.map((s) => s.id));
      const toAdd = DEFAULT_SONGS
        .filter((s) => !existingIds.has(s.id))
        .map((s) => ({
          ...s,
          progression: s.progression.map((line) => [...line]),
          createdAt: now,
          updatedAt: now
        }));
      store.songs = [...store.songs, ...toAdd];
      store.seededDefaults = true;
      saveSongsStore(store);
    } else if (!parsed?.schemaVersion || parsed.schemaVersion < SONGS_SCHEMA_VERSION) {
      saveSongsStore(store);
    }

    return store;
  } catch {
    return { schemaVersion: SONGS_SCHEMA_VERSION, seededDefaults: true, songs: [] };
  }
}

export function saveSongsStore(store) {
  try {
    localStorage.setItem(SONGS_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors
  }
}

export function getSongs() {
  return loadSongsStore().songs;
}

export function saveSong(songInput) {
  const store = loadSongsStore();
  const now = new Date().toISOString();

  if (songInput.id) {
    const idx = store.songs.findIndex((s) => s.id === songInput.id);
    if (idx >= 0) {
      const updated = {
        ...store.songs[idx],
        title: songInput.title.trim(),
        artist: (songInput.artist || '').trim(),
        originalKey: (songInput.originalKey || '').trim(),
        memo: (songInput.memo || '').trim(),
        progression: songInput.progression,
        updatedAt: now
      };
      store.songs[idx] = updated;
      saveSongsStore(store);
      return updated;
    }
  }

  const created = {
    id: generateSongId(),
    title: songInput.title.trim(),
    artist: (songInput.artist || '').trim(),
    originalKey: (songInput.originalKey || '').trim(),
    memo: (songInput.memo || '').trim(),
    progression: songInput.progression,
    createdAt: now,
    updatedAt: now
  };
  store.songs.unshift(created);
  saveSongsStore(store);
  return created;
}

export function deleteSong(songId) {
  const store = loadSongsStore();
  store.songs = store.songs.filter((s) => s.id !== songId);
  saveSongsStore(store);
  return store.songs;
}

export function exportSongsJson() {
  const store = loadSongsStore();
  return JSON.stringify(store, null, 2);
}

export function importSongsJson(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.songs)) {
    throw new Error('올바른 내 곡 백업 JSON 형식이 아닙니다.');
  }
  const incoming = migrateSongsStore(parsed).songs;
  const store = loadSongsStore();
  const existingMap = new Map(store.songs.map((s, idx) => [s.id, idx]));

  let added = 0;
  let updated = 0;
  for (const song of incoming) {
    if (existingMap.has(song.id)) {
      store.songs[existingMap.get(song.id)] = song;
      updated++;
    } else {
      store.songs.unshift(song);
      added++;
    }
  }

  saveSongsStore(store);
  return { added, updated, total: store.songs.length };
}
