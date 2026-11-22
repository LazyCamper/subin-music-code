# 코드 비교 (피아노 · 우쿨렐레 · 기타)

안드로이드 Chrome 세로 화면·한 손 조작을 기준으로 설계한 모바일 우선 PWA 웹앱입니다.  
빌드 도구나 백엔드 없이 순수 HTML + CSS + JavaScript(ES Modules)로 동작하며 GitHub Pages에 바로 배포할 수 있습니다.

## 주요 기능
- **12음 루트 선택 & 코드 목록**: 자주 쓰는 순서(`major`, `m`, `7`, `maj7`, `m7`, `sus4`, `dim`, `aug`, `6`, `9`)로 코드 제공
- **3악기 한눈에 비교**: 피아노(2옥타브 건반 SVG + 구성음), 우쿨렐레(4줄 G-C-E-A), 기타(6줄 E-A-D-G-B-E) 전체 보기 및 악기별 탭 전환
- **코드 직접 검색**: `Cm7`, `F#dim`, `Bbmaj7` 등 입력 시 즉시 이동
- **즐겨찾기**: `localStorage`에 저장되어 새로고침·재방문 후에도 유지
- **사운드 재생**: Web Audio API를 이용해 외부 라이브러리 없이 구성음 소리 재생
- **PWA 오프라인 지원**: `manifest.json` + `sw.js`로 홈 화면에 추가 및 오프라인 동작

## 프로젝트 구조
```text
.
├── index.html
├── manifest.json
├── sw.js
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── audio.js
│   ├── diagrams.js
│   ├── music.js
│   └── storage.js
├── data/
│   └── chords.json
└── icons/
    ├── icon.svg
    ├── icon-192.png
    └── icon-512.png
```

## 로컬 실행 방법
ES Modules와 `fetch('./data/chords.json')`를 사용하므로 로컬 정적 서버로 실행해야 합니다.

```bash
# Node.js가 설치되어 있는 경우
npx serve .

# 또는 VS Code Live Server 확장 프로그램으로 index.html 열기
```

브라우저에서 `http://localhost:3000` (또는 서버가 안내하는 주소)으로 접속합니다.

## GitHub Pages 배포 방법
1. 이 폴더의 모든 파일을 GitHub 저장소(예: `chord-compare`)에 푸시합니다.
2. GitHub 저장소 페이지에서 **Settings → Pages**로 이동합니다.
3. **Build and deployment**의 **Source**를 `Deploy from a branch`로 선택합니다.
4. **Branch**를 `main` (또는 기본 브랜치) 및 폴더를 `/ (root)`로 지정한 뒤 **Save**를 클릭합니다.
5. 1~2분 후 상단에 표시되는 `https://<username>.github.io/<repo-name>/` URL로 접속합니다.
   - 모든 경로가 `./` 상대 경로로 작성되어 있어 저장소 하위 경로에서도 정상 동작합니다.

## 코드 데이터 추가/수정 방법
`data/chords.json` 파일을 열어 수정합니다.

- **코드 종류 추가**: `chordTypes` 배열에 `id`, `suffix`, `name`, `intervals`(반음 단위 배열)를 추가하면 피아노 건반과 구성음은 모든 루트에 대해 자동으로 계산됩니다.
- **기타/우쿨렐레 운지 추가**: `guitar` 또는 `ukulele` 객체에 `"<루트>:<타입ID>"` 키로 추가합니다.
  ```json
  "C:m7": {
    "frets": [-1, 3, 5, 3, 4, 3],
    "fingers": [0, 1, 3, 1, 2, 1],
    "baseFret": 3,
    "barre": { "fret": 3, "from": 1, "to": 5 }
  }
  ```
  - `frets`: 각 줄의 프렛 번호 (`-1`은 뮤트 `✕`, `0`은 개방현 `○`)
  - `fingers`: 손가락 번호 (`0`은 누르지 않음, `1`~`4`는 검지~새끼)
  - `baseFret`: 다이어그램 상단 시작 프렛 번호
  - `barre` *(선택)*: 바레 코드 프렛(`fret`)과 시작/끝 줄 인덱스(`from`, `to`, 0부터 시작)
