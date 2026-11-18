# 오늘도득템 — 모바일 웹앱 (PWA)

`@naong_nabi`(오늘도득템)의 **오늘의 특가 · 무료 체험단 · 경품 퀴즈 · 앱테크** 큐레이션 앱입니다.
로그인 없이 열리고, 팝업·전면광고 없이 **1초 안에 가격·혜택·마감·플랫폼**을 볼 수 있게 만든 정적 웹앱입니다.

- 기준 데이터: **2026-11-18 13:10 확인분 42건** (특가 21 · 체험단 6 · 퀴즈 10 · 앱테크 5)
- 실제 확인한 항목만 넣었습니다. 가격·마감일은 `확인 시점 기준`임을 카드마다 표시합니다.
- 앱테크 탭은 **매일 참여 가능한 공식 출석·퀴즈·포인트 이벤트**만 올립니다(앱 안에서만 참여되는 것은 공식 안내 페이지로 연결).

---

## 1. 화면 구성

| 영역 | 내용 |
|---|---|
| 상단 고정 헤더 | 로고 · 검색창 · 찜 개수 · **블로그 / 쓰레드 / 유튜브 바로가기**(아이콘 버튼 4개, 320px까지 한 줄) |
| 대가성 안내 | 공정위 문구를 **스크롤해도 항상 상단에 고정** (계정 정지 리스크 방지) |
| 🔥 지금 제일 핫한 특가 TOP | 가로 스와이프 카드 3장 (`items.json`의 `hot` 값 순서) — **상품 사진 68×68 썸네일** 포함 |
| 카테고리 탭 | 전체 / 🔥 오늘의 특가 / 🎁 무료 체험단 / 🎯 경품 퀴즈 / 🏆 공모전 / 💸 앱테크 (스크롤 시 상단 고정) |
| 카드 | 플랫폼 배지 · D-day · **상품 사진 80×80 썸네일** · 제목 · 가격/경품 · 마감·확인일 · 메모 · **보기 / 블로그 / 찜 / 공유** |
| 광고 | 목록 맨 끝 1곳에 텐핑(소문박스) CPA 배너(`#adSlot`) — 결과 없을 때·광고 재고 없을 때 숨김 |
| 푸터 | 홈 화면 추가(PWA 설치) · 채널 링크(**블로그 후기 · 쓰레드 · 유튜브**) · 대가성 안내 재노출 · 마지막 확인일 |

**수익 구조**: 카드의 `보기` 버튼이 3사 제휴 링크(쿠팡 파트너스 · 네이버 쇼핑 커넥트 · 토스 셰어링크)로 바로 이동하고,
`블로그` 버튼과 헤더/푸터의 블로그 링크가 `blog.naver.com/allmine1981`으로 연결됩니다(제휴 수수료 + 애드포스트 유입).

---

## 2. 폴더 구조

```
apps/oneul-deuktem/
├─ index.html               # 화면 (이 파일 하나)
├─ manifest.webmanifest     # PWA 매니페스트
├─ sw.js                    # 서비스 워커 (앱 껍데기 캐시, 네트워크 우선)
├─ assets/
│  ├─ styles.css            # 디자인 (코랄 #FF5A36)
│  ├─ app.js                # 렌더·검색·찜·공유·PWA 설치 로직
│  └─ thumbs/               # 상품 사진 21장 (정사각 168×168 WebP, 장당 2~9KB)
├─ data/
│  ├─ items.json            # ★ 원본 데이터 (여기만 고치면 됨)
│  └─ items.js              # items.json 에서 자동 생성 (직접 수정 금지)
├─ icons/
│  ├─ icon.svg, icon-192.png, icon-512.png
│  ├─ icon-maskable-192.png, icon-maskable-512.png
│  ├─ apple-touch-icon.png, favicon-32.png
│  └─ make_icons.py         # 아이콘 재생성 스크립트
├─ tools/
│  ├─ validate.py           # 데이터 검증 + items.js 동기화 + 링크 확인
│  ├─ build_preview.py      # 한 파일 미리보기(downloads/oneul-deuktem-preview.html) 생성 — 상품 사진은 data URI 로 인라인
│  ├─ deploy.sh             # 검증 → 커밋 → GitHub Pages 푸시 (매일 갱신용)
│  ├─ qa_live.py            # 배포된 실제 URL 점검 + 스크린샷
│  ├─ qa_pages_path.py      # 서브패스(/onen1-deuktem/) 배포 환경 재현 점검
│  ├─ thumbs-sources.json   # 상품 사진 원본 주소(og:image) 기록
│  ├─ qa.py                 # 실제 브라우저 자동 점검 + 스크린샷 (http)
│  ├─ qa_images.py          # 상품 사진 로드·깨짐 점검 (http + file://)
│  └─ qa_preview_file.py    # 미리보기 파일을 file:// 로 열어 탭·검색·카드 열기 점검
├─ preview_mobile.png       # 390×844 첫 화면
├─ preview_tabs.png         # 탭 3종 비교
└─ preview_desktop.png      # 1440×900
```

모든 경로가 **상대 경로**라 폴더째 어디에 올려도 그대로 동작합니다.

---

## 3. 로컬에서 보기

```bash
cd apps/oneul-deuktem
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

> `index.html`을 더블클릭(file://)해도 화면은 뜨지만, 서비스 워커·PWA 설치는 http(s)에서만 동작합니다.

---

## 4. 배포 (GitHub Pages — 운영 방식)

| 항목 | 값 |
|---|---|
| 공개 주소 | **https://naongnabi.github.io/onen1-deuktem/** |
| 저장소 | `naongnabi/onen1-deuktem` (public) · 브랜치 `main` · 폴더 `/ (root)` |
| 배포용 로컬 경로 | `apps/oneul-deuktem` (이 폴더 자체가 git 저장소, origin = 위 저장소) |

> 저장소 이름을 `oneul-deuktem`으로 바꾸면 주소도 `https://naongnabi.github.io/oneul-deuktem/` 가 됩니다(로컬 origin URL도 함께 수정).

### 매일 데이터 갱신 → 라이브 반영 (한 줄)
```bash
cd apps/oneul-deuktem && bash tools/deploy.sh          # 검증 → 커밋 → 푸시 → 라이브 확인
bash tools/deploy.sh --no-push                        # 커밋까지만
bash tools/deploy.sh "커밋 메시지 직접 지정"
```
푸시 후 GitHub Pages가 1~2분 안에 다시 빌드합니다(CDN 캐시로 최대 10분 지연될 수 있음).

### 처음 배포할 때 (다시 할 일이 생기면)
1. GitHub에서 **public** 저장소를 만들고 이 폴더를 푸시
   ```bash
   gh repo create <아이디>/<저장소> --public      # 또는 GitHub 웹에서 생성
   cd apps/oneul-deuktem && git remote add origin https://github.com/<아이디>/<저장소>.git
   git push -u origin main
   ```
2. 저장소 → **Settings → Pages** → Source `Deploy from a branch` → Branch `main` / `/ (root)` → Save
3. 1~2분 뒤 `https://<아이디>.github.io/<저장소>/` 확인

> Pages 활성화는 저장소 관리자만 할 수 있습니다. Pickle 쪽 GitHub 연결에는 Pages 설정 권한이 없어서, 새로 배포할 때는 이 2번 클릭만 직접 해 주셔야 합니다.

배포 파일은 git이 추적하는 것만 나갑니다: `index.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, `assets/`, `data/`, `icons/` (+ `README.md`). `tools/`, `preview_*.png`, `qa-*.json`은 `.gitignore`로 제외.

### 다른 정적 호스팅으로 옮길 때
- **Netlify Drop**: https://app.netlify.com/drop 에 폴더 전체를 끌어다 놓기 → `https://xxx.netlify.app`
- **Cloudflare Pages**: `Create project → Direct upload` → 폴더 업로드

### 배포 후 확인
- 폰에서 주소 열기 → 메뉴의 **홈 화면에 추가**(또는 푸터의 `앱으로 추가` 버튼) → 주소창 없는 앱처럼 열림
- 배포 주소가 https 이면 서비스 워커가 등록되어 두 번째 방문부터 더 빨리 열립니다.
- 자동 점검: `python3 tools/qa_live.py` (기본 주소) 또는 `--url <주소>` → `preview_live_pages.png` 저장

---

## 5. 매일 데이터 갱신 (자동화용)

```bash
# 1) data/items.json 만 수정
# 2) 검증 + items.js 재생성
python3 tools/validate.py --sync

# 링크가 실제로 열리는지까지 확인 (느림, 배포 전 1회 권장)
python3 tools/validate.py --sync --check-links
```

`validate.py`가 잡아 주는 것: JSON 문법 · 필수 필드 · `cat`/`pkey` 허용값 · **id 중복** · 마감일 형식/과거 여부 ·
**URL 형식·제휴 도메인** · **상품 사진(`image`) 형식·파일 존재·용량** · `verifiedAt` 미래 여부 · `items.js` 동기화 · (옵션) 깨진 링크.
실패가 하나라도 있으면 종료 코드 1로 끝나므로 자동 갱신 스크립트에서 그대로 막을 수 있습니다.

### 항목 필드

| 필드 | 설명 |
|---|---|
| `id` | 고유 ID. 찜 저장 키로 쓰이므로 한 번 정하면 유지 |
| `cat` | `deal`(특가) · `exp`(체험단) · `quiz`(경품 퀴즈) · `contest`(공모전) · `apptech`(앱테크) |
| `hot` | 1,2,3… 이면 상단 "핫 TOP"에 그 순서로 노출. 없으면 `null` |
| `platform`, `pkey` | 배지 이름 / 색상 키 `toss·coupang·naver·gov·revu·rnote·kakaopay·kb·shinhan·etc` (공모전은 주최가 공공이면 `gov`, 기업이면 `etc`) |
| `tag` | 종류 태그(생필품, 고양이, 가전·디지털, 커피 …). 체험단 탭에서 `가전·디지털`은 '가전·IT'로 묶입니다 |
| `title` | 상품·이벤트 이름 그대로 (과장 금지) |
| `highlight`, `highlightSub` | 카드의 큰 글씨(가격 또는 경품) / 보조 설명(단가·할인율·모집 인원) |
| `deadline` | `YYYY-MM-DD`. 지나면 앱이 자동으로 숨김. 기한 없는 특가는 `null` |
| `deadlineText` | `deadline`이 `null`일 때 배지 문구 (`가격 변동`, `마감 미확인` 등) |
| `meta` | 주관 기관·발표일 등 작은 정보(배열) |
| `note` | 확인 시점·변동 가능성 등 꼭 같이 읽어야 하는 한 줄 |
| `image` | 상품 사진. `assets/thumbs/<id>.webp`(168×168) 또는 상품 이미지 https 주소. 없으면 카테고리 아이콘으로 대신 표시 |
| `url` | 실제 이동 링크(제휴 링크 포함) |
| `cta` | 버튼 문구 |
| `verifiedAt` | 마지막 확인일 |

### 자동 갱신에 붙이는 방법
기존 `scheduled-actions/🎁-매일-저녁-체험단-퀴즈-확인-및-응모`(매일 21:45)가 확인한 결과를
`data/items.json`의 `items` 배열로 덮어쓰고 `python3 tools/validate.py --sync`만 실행하면 됩니다.
`updatedAt`을 갱신하면 앱 상단 날짜와 푸터의 "마지막 확인"이 함께 바뀝니다.

---

## 6. 검증 결과 (2026-11-18 13:20 실행)

`python3 tools/qa.py` — 실제 Chromium으로 확인. **44개 항목 전부 통과**

- 모바일 390×844 · 데스크톱 1440×900 · 320px 좁은 화면 모두 가로 넘침 0px
- 탭 전환(전체/특가/체험단/퀴즈/**앱테크**) · URL 파라미터 · 검색 · 결과 없음 화면
- 찜 저장 → 새로고침 후 유지 → 찜만 보기 → 해제 (`localStorage: deuktem.favs`)
- 공유 버튼: `navigator.share` 없으면 링크 복사 + 토스트
- 외부 링크 **92개 전부** `target="_blank" rel="noopener noreferrer"`
- `manifest.webmanifest` 200 · 필수 필드 · 아이콘 5종 200 · apple-touch-icon
- 서비스 워커 `activated` · 스크롤 시 탭 상단 고정
- **콘솔 에러 0건 · 페이지 예외 0건 · 실패 요청 0건**

`python3 tools/qa_images.py` — 상품 사진 점검(http·file:// 둘 다). **20개 항목 전부 통과**

- 특가 21장 + 핫 TOP 3장 = 사진 24장 모두 로드(`naturalWidth > 0`), 깨진 사진 0건·빈 사진칸 0건
- "오늘의 특가" 카드 21장 전부 사진 있음 · 가로 넘침 0px · 콘솔 에러 0건
- 썸네일은 정사각 168×168 WebP(장당 2~9KB, 전체 79KB). 원본 주소는 `tools/thumbs-sources.json`

`python3 tools/qa_preview_file.py` — 미리보기 파일을 **file:// 로 열어** 확인. **27개 항목 전부 통과**

- 탭 5개 전환 · 앱테크 5장 · 검색 '앱테크' → 앱테크 5장 · 결과 없음 화면
- 카드 본문 / CTA 클릭 → 해당 주소로 새 창 · 찜 · 가로 넘침 0px · 스크롤 시 탭 고정
- 광고는 목록 맨 끝 1곳(텐핑 CPA 배너). 결과 없음·재고 없음일 때는 자리째 숨김
- **콘솔 에러 0건 · 페이지 예외 0건**(file:// 에서도 `history.replaceState` 예외 없음)

상세 결과: `tools/qa-report.json` · `tools/qa-preview-file-report.json` · `tools/qa-images-report.json`

`python3 tools/qa_pages_path.py` — **GitHub Pages 서브패스 환경 그대로**(`/onen1-deuktem/`) 재현 점검. **34개 항목 전부 통과**

- 배포 파일만 복사해 `http://127.0.0.1:PORT/onen1-deuktem/` 로 서빙(실제 Pages와 동일한 경로 구조)
- 페이지·manifest·sw.js·items.json·아이콘 6종 전부 200 · 상품 사진 24장 `naturalWidth>0`
- 탭 5개(42/21/6/10/5) · 채널 버튼 3개 · 카드 CTA 새 창 · 가로 넘침 0px
- 서비스 워커 범위 `/onen1-deuktem/` · 콘솔 에러 0 · 페이지 예외 0 · 실패 요청 0

```bash
pip install playwright && playwright install chromium
python3 tools/qa.py
```

> 이 작업 환경에는 chromium 실행에 필요한 시스템 라이브러리(libatk 등)가 없어 로컬 캐시에 따로 받아 두었습니다.
> 다른 환경에서 결과가 같게 나오면 그대로 쓰시면 되고, 같은 환경에서 다시 돌릴 때는
> `LD_LIBRARY_PATH=/workspace/.cache/chromium-libs PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright python3 tools/qa.py`
> 로 실행하면 됩니다.

---

## 7. 지켜야 할 표기

- 대가성 문구는 **헤더 바로 아래 고정 + 푸터 재노출** 구조를 유지하세요. 문구를 지우거나 접으면 공정위 고지 의무 위반 소지가 있습니다.
  `일부 링크는 쿠팡 파트너스·네이버 쇼핑 커넥트·토스 쉐어링크 제휴 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.`
- 가격은 확인 시점 기준임을 카드마다 표시합니다(`note`). "최저가 보장", "가격 오류" 같은 표현은 검증 스크립트가 경고합니다.
- 체험단은 **0원·배송형·얼굴 비노출** 기준으로만 올립니다. 제세공과금이 붙는 건(다이슨 등)은 카드에 금액을 명시했습니다.
- 확인하지 못한 항목(마감일 미확인 등)은 지어내지 않고 `마감 미확인`으로 표시합니다.

---

## 8. 아이콘 바꾸기

```bash
cd icons && python3 make_icons.py    # 512·192·maskable·apple-touch 전부 재생성
```
색·모양을 바꾸려면 `make_icons.py`의 `gradient()` / `bag_layer()` 값을 수정하고,
헤더 로고(`index.html`의 `.brand-mark` SVG)도 같은 비율로 맞춰 주세요.
