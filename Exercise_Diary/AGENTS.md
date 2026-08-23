# HiddenReps (구 Exercise_Diary)

데드행(매달리기)·플랭크 같은 시간형 운동부터 턱걸이·팔굽혀펴기·스쿼트·런지 같은 횟수·세트형 운동까지, 원하는 운동을 직접 추가/커스터마이징해 측정·기록하는 iOS/Android 앱. 앱 이름은 "HiddenReps"(한국어 표기 "나의 운동 일지")로 리브랜딩되었고, 저장소 디렉터리명은 이전 이름인 `Exercise_Diary`를 그대로 쓰고 있다. 패키지 식별자는 `com.hiddenlab.hiddenreps`. Expo SDK 57 (React Native 0.86) + TypeScript.

> Expo has changed — 코드를 작성하기 전에 https://docs.expo.dev/versions/v57.0.0/ 의 정확한 버전 문서를 확인할 것.

## 주요 기능

- 운동 커스터마이징: 프리셋(턱걸이/팔굽혀펴기/스쿼트/런지 등)에서 고르거나 이름·아이콘·색상을 직접 정해 추가, 측정 방식(시간 / 횟수·세트)과 무게 기록 여부 선택
- 측정: 시간형은 준비 카운트다운 + 벨 간격 알림, 횟수·세트형은 세트별 기록 누적. 타이머는 `Date.now()` 경과 시간 기반(코드 규칙 참고)
- 자세 안내 영상: 운동별로 YouTube 링크를 검색·등록해 측정 화면에서 바로 재생
- 운동 촬영: 카메라로 운동 영상을 찍어 기기에 저장하고 다시 재생
- 기록: 운동별 최고 기록 표시, 세트별 상세 기록, 기록 시간 보정
- 라이트/다크 테마 커스터마이징(`src/lib/themePresets.ts`), 다국어 지원(한국어/영어/일본어/중국어, `src/lib/i18n/locales/`)
- 첫 실행 온보딩 안내, 홈 화면 도움말

## 명령어

- `npm start` — Expo 개발 서버 시작
- `npm run ios` / `npm run android` — 시뮬레이터/에뮬레이터 실행
- `npx tsc --noEmit` — 타입 체크
- `npm test` — `src/lib/`의 저장 로직 등 순수 로직 유닛 테스트 실행 (Jest, `jest-expo` 프리셋)

## 개발 워크플로우

새 기능은 아래 단계를 따른다. 각 단계는 슬래시 커맨드로 실행한다.

1. **기획** `/spec <기능명>` — 요구사항을 `docs/specs/<기능명>.md`로 정리하고 사용자 승인을 받는다
2. **설계** `/design <기능명>` — 승인된 스펙을 바탕으로 `docs/design/<기능명>.md`에 화면 구조·상태·데이터 설계를 작성한다
3. **개발** `/dev <기능명>` — 스펙과 설계 문서를 기준으로 구현한다
4. **검증** `/qa <기능명>` — 타입 체크, 앱 실행 확인, 스펙 대비 체크리스트 검증
5. **마무리** `/ship <기능명>` — reviewer 에이전트 리뷰 후 한국어 메시지로 커밋 (push는 별도 요청 시)

문서 없이 바로 구현을 요청받은 소규모 수정은 단계를 생략해도 되지만, 새 화면/새 기능은 반드시 spec부터 시작한다.

## 코드 규칙

- 화면은 `src/screens/`, 재사용 컴포넌트는 `src/components/`, 로직(타이머·저장·i18n 등)은 `src/lib/`에 둔다
- 로컬 데이터 저장은 `@react-native-async-storage/async-storage` 사용 — 서버 전송 없음, 모든 기록은 기기 로컬에만 저장
- 타이머는 `setInterval` 누적이 아니라 시작 시각(`Date.now()`) 기준 경과 시간으로 계산한다 (백그라운드 전환·프레임 드랍 시 오차 방지)
- 새 UI 텍스트를 추가하면 `src/lib/i18n/locales/`의 4개 언어(ko/en/ja/zh) 파일을 모두 갱신한다
- 테마 팔레트는 자주 바뀌므로 색상 관련 작업 전에 `src/theme.ts`, `src/lib/themePresets.ts`를 직접 확인한다 — 기억에 의존하지 않는다
- 생성형 에셋(앱 아이콘, 효과음, 스토어용 아이콘/피처 그래픽/스크린샷)은 `scripts/`의 생성 스크립트로 만든다 — 수정할 때 스크립트를 고쳐 재생성 (`npm run assets:icons`, `npm run assets:feature-graphic`, `npm run assets:notification-icon`, `npm run assets:store-screenshots`, `npm run assets:bell`, `npm run assets:silence`)
- `scripts/make-icons.js`는 실제 런처 아이콘(`assets/icon.png` 등)과 더 이상 같은 디자인을 생성하지 않는다 — 아이콘은 2026-08-09에 그라데이션+글로우 디자인으로 교체되며 스크립트 없이 이미지 파일만 직접 갈아 끼워졌다. 아이콘 관련 작업 전엔 스크립트 출력이 실제 에셋과 일치하는지 먼저 확인할 것. 피처 그래픽(`npm run assets:feature-graphic`)은 `scripts/make-feature-graphic.js`가 `sharp`로 실제 아이콘의 foreground 레이어를 합성해 만들며, 이 스크립트는 별개로 최신 상태다. 안드로이드 알림 아이콘(`assets/notification-icon.png`, `app.json`의 `expo-notifications` 플러그인 `icon` 옵션)도 같은 foreground 레이어에서 `scripts/make-notification-icon.js`가 RGB를 순백으로 덮어써(안드로이드 상태 표시줄 아이콘은 알파 채널만 실루엣으로 쓰고 색은 항상 흰색으로 렌더링하기 때문) 최신 상태로 만든다.
- Play Console용 스크린샷(휴대전화 + 태블릿 7·10인치)은 각 기기 폴더의 `raw/`(`store-assets/android/screenshots/raw/`, `.../tablet-7in/raw/`, `.../tablet-10in/raw/`) 원본 캡처를 `scripts/make-store-screenshots.js`(sharp)가 둥근 베젤 기기 프레임(휴대전화=노치, 태블릿=카메라 점) 안에 넣고 밝은 배경(`#FAF6F8`) + 브랜드 마젠타 헤드라인 카피를 얹어 각 기기 폴더에 재생성한다(`npm run assets:store-screenshots`). 헤드라인 카피는 스크립트 안 `shots` 배열, 기기별 프레임 크기는 `DEVICES` 배열에서 관리한다. 원본 캡처를 새로 찍었으면 해당 기기의 `raw/`에 같은 파일명으로 교체한 뒤 스크립트를 다시 돌린다.
- 커밋 메시지는 한국어로 작성한다
- 데이터 유실로 이어질 수 있는 `src/lib/storage.ts`의 저장·삭제·백업 복원 로직처럼 리스크가 큰 순수 로직은 유닛 테스트를 붙인다 — 테스트 파일은 대상 파일과 같은 위치에 `*.test.ts`로 둔다(`npm test`)

## 코딩 컨벤션 (린트/포맷)

- `npm run lint` (`expo lint`, ESLint flat config) / `npm run format` (Prettier)
- 스타일(들여쓰기·따옴표·세미콜론)은 전부 Prettier가 강제한다 — 사람이 스타일로 논쟁할 필요 없음
- ESLint는 정확성·명시성에 집중한다:
  - `@typescript-eslint/no-explicit-any` — `any` 금지, 타입을 명시해야 코드만 읽고 계약을 파악할 수 있다
  - `simple-import-sort` — import/export 순서 자동 정렬, 파일마다 제각각인 순서로 생기는 diff 노이즈 방지
  - `eslint-config-expo` 기본 규칙(React Hooks 규칙 포함, React Compiler 대비 렌더 중 ref 접근·effect 내 setState 직접 호출 등을 에러로 잡음)
- 새 코드를 작성/수정하면 해당 파일에 한해 `npm run lint`로 확인한다 (기존 코드 전체의 기존 위반은 별도 작업으로 다룬다)

## 문서 위치

- `docs/specs/` — 기능별 요구사항 (무엇을, 왜)
- `docs/design/` — 기능별 설계 (어떻게)
- `docs/guides/` — 스토어 배포·마켓 등록 등 운영 가이드. 배포 가이드는 플랫폼별로 분리되어 있다 (`구글플레이 배포 가이드.html`, `앱스토어 배포 가이드.html`, `play-store-listing-copy.md`)
- `docs/privacy-policy.html` — 개인정보처리방침 (GitHub Pages `gh-pages` 브랜치로 배포됨)
