---
name: HiddenReps
description: 개인용 운동 측정 앱 — 다크 우선의 마젠타 액센트, M3에서 파생된 컴포넌트 언어
colors:
  bg-dark: "#141013"
  card-dark: "#211A20"
  card-muted-dark: "#282029"
  text-dark: "#F5F3EE"
  text-muted-dark: "#9A8F96"
  text-faint-dark: "#635760"
  border-dark: "#2C232A"
  bg-light: "#F7F4F5"
  card-light: "#FFFFFF"
  card-muted-light: "#F0EBEC"
  text-light: "#1E1A1C"
  text-muted-light: "#6B6067"
  text-faint-light: "#8B8085"
  border-light: "#E4DEE0"
  danger: "#FF453A"
  danger-soft-dark: "#3A1614"
  danger-soft-light: "#FFE1DE"
  magenta-primary: "#9B2791"
  magenta-pressed: "#6D1B66"
  magenta-soft: "#331C31"
  magenta-accent: "#C67AC9"
  magenta-accent-soft: "#332038"
  orange-primary: "#FC4C02"
  mint-primary: "#00D9A3"
  red-primary: "#E62B2B"
  blue-primary: "#0072CE"
typography:
  display:
    fontFamily: "Pretendard-ExtraBold, System"
    fontSize: "96px"
    fontWeight: 800
    lineHeight: 1
  headline:
    fontFamily: "Pretendard-ExtraBold, System"
    fontSize: "72px"
    fontWeight: 800
    lineHeight: 1
  title:
    fontFamily: "Pretendard-ExtraBold, System"
    fontSize: "28px"
    fontWeight: 800
  titleSecondary:
    fontFamily: "Pretendard-Bold, System"
    fontSize: "20px"
    fontWeight: 700
  body:
    fontFamily: "Pretendard-Regular, System"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Pretendard-Bold, System"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "normal"
rounded:
  sm: "12px"
  md: "16px"
  lg: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  smd: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  fab-primary:
    backgroundColor: "{colors.magenta-primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
  fab-primary-pressed:
    backgroundColor: "{colors.magenta-primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
  card-list-item:
    backgroundColor: "{colors.card-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.md}"
    padding: "20px 20px"
  tag-outline:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted-dark}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  input-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.sm}"
    padding: "12px 12px"
---

# Design System: HiddenReps

## Overview

**Creative North Star: "The Focused Rep"**

HiddenReps는 헬스장이나 집에서 혼자, 짧은 세션을 반복하며 쓰는 도구다. 화면은 어두운 배경(#141013) 위에 단 하나의 강조색(마젠타 계열 프리셋 중 선택된 것)만 또렷하게 떠오르는 구성을 유지한다 — 운동 중 곁눈질로도 "지금 뭘 봐야 하는지"가 즉시 읽혀야 하기 때문이다. 장식은 최소화하고, 큰 표 형태의 숫자(경과 시간·카운트다운)를 화면의 실질적 주인공으로 둔다.

컴포넌트 언어는 Material Design 3에서 형태(필드, pill 태그, extended FAB, 톤 기반 elevation)를 빌려오되 Material의 시스템 컬러 롤 대신 프로젝트 고유의 다크 우선 팔레트로 다시 칠했다. 두 플랫폼(iOS/Android)에서 기본적으로 동일한 모습을 유지하며 OS 네이티브 룩(Cupertino/Material 기본 테마)을 그대로 따르지 않는다 — 커스텀 운동 기록이라는 개인적 도구의 정체성을 기기보다 우선한다. 단, 시스템 시간/날짜 피커처럼 다시 만드는 비용이 이점보다 큰 OS 표준 입력은 예외적으로 네이티브 그대로 쓴다(Don't 목록 참고).

그림자는 장식이 아니라 표면 구분을 위한 최소 신호다. `buttonShadowShape`/`cardShadow`는 옵션 없이 옅은 불투명도(0.14~0.18)로 M3의 톤 기반 elevation을 근사한다 — 진한 드롭섀도우로 표면을 띄우기보다, 카드·FAB가 배경 위에 "살짝 얹혀 있다" 정도로만 신호를 준다.

**Key Characteristics:**
- 다크 우선, 라이트는 동등한 완성도로 지원되는 2차 모드 (시스템 설정 또는 수동 오버라이드)
- 화면당 강조색은 하나 — 5개 프리셋 중 사용자가 고른 것 (기본: 딥 마젠타)
- 큰 표 숫자(96/72pt, ExtraBold, tabular-nums)가 콘텐츠의 시각적 무게중심
- M3에서 빌려온 형태 언어(pill, extended FAB, outlined field) + 프로젝트 고유 팔레트
- 그림자는 옅은 톤 신호일 뿐, 구조적 깊이를 만들지 않는다

## Colors

다크 배경 위에 단일 강조색이 도드라지는 팔레트. 강조색은 5개 프리셋 중 하나를 사용자가 선택하며, 나머지 베이스 톤(배경·카드·텍스트)은 라이트/다크 모드에 따라서만 바뀐다.

### Primary
- **Deep Magenta** (`#9B2791`, 기본 프리셋): 주 액션(FAB, 최고기록 배지, 강조 버튼)의 배경. 빨강·파랑이 균형 잡힌 톤으로, 이전에 썼던 핑크에 가까운 톤(`#E0459B`)이 "너무 핑크같다"는 피드백을 받아 교체됐다.
- **Deep Magenta Pressed** (`#6D1B66`): 프라이머리를 검게 섞은 눌림/라이트모드 텍스트용 파생값.
- **Deep Magenta Soft** (`#331C31`): 프라이머리를 배경과 섞은 옅은 칩·배지 배경.

### Accent
- **Aurora Pink** (`#C67AC9`): 프라이머리를 흰색과 섞은 2차 강조 — 최고기록 텍스트, 카드 위 보조 하이라이트.
- **Aurora Pink Soft** (`#332038`): 액센트를 배경과 섞은 옅은 배경(예: 최고기록 행의 배경).

### 선택 가능한 프리셋 (사용자가 설정에서 교체)
프라이머리/액센트/눌림/소프트 4개 롤이 배경(`#141013`) 기준으로 같은 방식(검게 섞기=pressed, 배경과 섞기=soft, 희게 섞기=accent)으로 파생된다. 기본 프리셋만 예외로, 스펙에서 확정한 값을 그대로 쓴다(파생값 아님).
- **Strava Orange** (`#FC4C02`)
- **Whoop Mint** (`#00D9A3`) — 유일하게 `onPrimary`가 어두운 전경색이다. 밝은 민트 위 흰 텍스트는 대비가 1.8:1까지 떨어져 배경색(`#141013`)을 재사용한 어두운 텍스트로 대체했다(대비 약 10:1).
- **Peloton Red** (`#E62B2B`)
- **MyFitnessPal Blue** (`#0072CE`)

### Neutral (다크)
- **Void** (`#141013`): 화면 배경.
- **Charcoal Card** (`#211A20`): 카드·리스트 아이템 배경.
- **Charcoal Card Muted** (`#282029`): 바텀시트 등, 화면 배경과 구분돼야 하는 표면(백드롭 위 시트 등).
- **Warm White** (`#F5F3EE`): 기본 텍스트.
- **Ash** (`#9A8F96`): 보조 텍스트(날짜, 부제목).
- **Ash Faint** (`#635760`): placeholder, 비활성 아이콘.
- **Hairline** (`#2C232A`): 구분선·미포커스 테두리.

### Neutral (라이트)
- **Porcelain** (`#F7F4F5`): 화면 배경.
- **White Card** (`#FFFFFF`): 카드 배경.
- **Porcelain Muted** (`#F0EBEC`): 바텀시트 등 구분 표면.
- **Ink** (`#1E1A1C`): 기본 텍스트.
- **Warm Gray** (`#6B6067`): 보조 텍스트.
- **Warm Gray Faint** (`#8B8085`): placeholder — QA에서 대비 2.4:1로 너무 흐리다는 지적을 받아 3.5:1 정도로 재조정된 값.
- **Hairline Light** (`#E4DEE0`): 구분선·미포커스 테두리.

### 시스템
- **Danger** (`#FF453A`): 삭제·경고. 두 모드에서 동일 — 위험 신호의 재인식성을 위해 모드와 무관하게 고정.
- **Danger Soft** (다크 `#3A1614` / 라이트 `#FFE1DE`): 경고 배경.

### Named Rules
**The One Accent Rule.** 화면에 강조색은 하나뿐이다(선택된 프리셋). 여러 프리셋 색을 한 화면에 섞지 않는다 — 사용자가 고른 프리셋이 앱 전체의 유일한 "이 앱 색"이다.

**The Fixed-Role Text Rule.** `primary`/`accent`는 페이지 배경처럼 색이 고정되지 않은 표면 위의 텍스트·아이콘에는 그대로 쓰지 않는다. 대신 라이트 모드에서 `primaryPressed`(항상 어둡게 파생)로 대체하는 `primaryText`/`accentText`를 쓴다. 칩처럼 배경 자체가 항상 어두운 곳(예: `primarySoft`)은 예외 — 두 모드에서 배경 톤이 같아 문제없다.

## Typography

**Body Font:** Pretendard (Regular/SemiBold/Bold/ExtraBold 정적 굵기 파일 4종)

**Character:** 한글·라틴 모두 가독성이 좋은 그로테스크 산세리프. 표 숫자(운동 시간·카운트다운)가 화면의 시각적 중심이라, 큰 사이즈일수록 굵기도 극단적으로 무거워진다(ExtraBold 800).

**The Faux-Bold Ban.** RN에 커스텀 폰트로 `fontWeight`를 얹으면 합성 볼드(faux bold)가 시도돼 흐릿해진다. `AppText`(`src/components/AppText.tsx`)가 모든 텍스트에서 `fontWeight`를 실제 로드된 굵기 파일(`Pretendard-Regular/SemiBold/Bold/ExtraBold`)로 치환하고 `fontWeight` 자체는 제거한다 — 새 텍스트도 반드시 이 컴포넌트를 통해서만 렌더링한다.

### Hierarchy
- **Display** (800, 96px, tabular-nums): 측정 화면의 카운트다운 숫자.
- **Headline** (800, 72px, tabular-nums): 진행 중인 운동 시간(`TimeDisplay`) — `MM:SS.ss` 포맷.
- **Title** (800, 28px): 홈 화면 헤더 타이틀.
- **Title Secondary** (700, 20px): 카드 타이틀(운동 이름), 바텀시트 제목.
- **Body** (400, 16px): 본문, 입력창, FAB 라벨.
- **Label** (700, 12~14px): 태그, 배지, 토스트 — 굵은 소형 라벨로 정보 밀도를 높인다.

## Layout

고정 스페이싱 스케일(4/8/12/16/24/32px)만 쓰고 임의 값은 쓰지 않는다. 화면은 단일 컬럼 리스트 중심(홈 화면 운동 목록, 기록 리스트)이며 태블릿·가로모드 전용 레이아웃은 아직 없다(로드맵 Phase 4 대상, `PRODUCT.md` 참고). 바텀시트는 화면 하단에서 `slide`로 올라오며 최대 높이 85%로 제한, 내용이 짧으면 콘텐츠 크기로 줄어든다.

## Elevation & Depth

톤 기반의 옅은 그림자만 쓴다 — 진한 드롭섀도우로 표면을 띄우지 않는다. `cardShadow`(opacity 0.14, radius 6, elevation 1)는 정적 표면에, `buttonShadowShape`(opacity 0.18, radius 10, elevation 3)는 강조색을 `shadowColor`로 물들여 FAB·토스트처럼 강조색 배경 위에 쓴다.

### Shadow Vocabulary
- **cardShadow** (`shadowOffset: {0,2}, shadowOpacity: 0.14, shadowRadius: 6, elevation: 1, color: #000`): 정적 카드·컨테이너.
- **buttonShadowShape** (`shadowOffset: {0,4}, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3`, `shadowColor`는 호출부에서 강조색으로 지정): FAB, 토스트 등 강조색 배경의 떠 있는 요소.

### Named Rules
**The Tinted Shadow Rule.** 강조색 배경 위 요소의 그림자는 검정이 아니라 그 배경색 자체를 `shadowColor`로 쓴다 — 톤 기반 elevation을 흉내내려는 의도.

## Shapes

세 단계 라운드 스케일: `sm`(12px, 입력창·리스트 행), `md`(16px, 카드·바텀시트 상단 모서리), `lg`(24px, 큰 컨테이너), `pill`(999px, 태그·배지·FAB·원형 아이콘 뱃지). 테두리는 얇게(1~1.5px, 포커스 시 2px)만 쓰고 헤어라인 색은 두 모드 전용 `border` 토큰을 따른다.

## Components

### FAB (Extended)
- **Shape:** pill (999px)
- **Primary:** `magenta-primary` 배경, `onPrimary`(대개 흰색) 텍스트/아이콘, 아이콘+라벨 나란히, `buttonShadowShape`(그림자색=강조색)
- **Press:** `opacity: 0.9`로만 어두워짐, 위치·크기 변화 없음
- **역할:** 화면당 하나, 화면 우하단 고정 — 목록 스크롤과 무관하게 항상 같은 자리 (M3 Extended FAB 패턴)

### List Card (운동 목록 아이템)
- **Corner Style:** `radius.md`(16px)
- **Background:** `card` (다크 `#211A20` / 라이트 `#FFFFFF`)
- **Shadow:** 없음 (평면, 목록 밀도 우선)
- **Press:** `opacity: 0.85`
- **구성:** 좌측 원형(pill) 아이콘 배지(강조색 배경, 48×48) + 타이틀/측정방식 태그 + 우측 편집 아이콘 + chevron

### Tag / Chip (측정 방식 태그, 최고기록 배지)
- **Style:** outline 버전(투명 배경, 1px 테두리, 배경색과 같은 텍스트/아이콘색) 또는 filled 버전(강조색 배경, `onPrimary` 텍스트) — 문맥에 따라 선택
- **Shape:** pill
- **Padding:** 8px 가로 / 3px 세로, 아이콘+텍스트 4px 간격

### Inputs (Outlined Text Field)
- **Style:** M3 Outlined Text Field 패턴 — 비어있고 미포커스 상태에선 라벨이 입력칸 안에 placeholder처럼 보이다가, 포커스되거나 값이 생기면 라벨이 테두리 위로 떠오르며 축소(120ms 애니메이션)
- **Focus:** 테두리색이 `border` → `primary`로, 두께가 1.5px → 2px로
- **Shape:** `radius.sm`(12px)

### Bottom Sheet
- **Style:** 화면 전체 폭, 상단만 라운드(`radius.lg`, 24px), 최대 높이 85%, 배경 `cardMuted`(화면 배경과 한 단계 대비를 두어 시트 경계가 보이게)
- **헤더:** 중앙 정렬 타이틀 + 우측 닫기 버튼(40×40 히트 영역)
- **역할:** 홈 화면에서 여는 보조 화면(도움말, 백업/복원, 설정)을 하나의 컴포넌트로 통일 — 항상 이 컴포넌트 하나만 마운트해 두고 내용만 교체하는 구조라, RN Modal 두 개가 동시에 뜨는 상황이 구조적으로 생기지 않는다

### Toast
- **Style:** pill, 강조색 배경, `onPrimary` 텍스트, `buttonShadowShape`(그림자색=강조색)
- **위치:** 화면 하단, 저장 버튼과 겹치지 않게 그 위(64px 오프셋)
- **모션:** 200ms 페이드 인/아웃, 2초 노출

## Do's and Don'ts

### Do:
- **Do** 텍스트는 항상 `AppText`(`src/components/AppText.tsx`)를 통해 렌더링해 `fontWeight` → `fontFamily` 치환이 적용되게 한다.
- **Do** 강조색이 필요한 곳은 `useAccentColors()`가 내려주는 현재 프리셋 값을 쓴다 — 하드코딩된 마젠타 hex를 직접 쓰지 않는다(사용자가 프리셋을 바꾸면 깨진다).
- **Do** 강조색 배경 위 떠 있는 요소의 그림자는 `shadowColor`를 검정이 아니라 그 강조색으로 지정한다(Tinted Shadow Rule).
- **Do** 새 화면·컴포넌트는 `spacing`/`radius`/`fontSize` 스케일 값만 쓴다 — 임의 px 값을 새로 만들지 않는다.
- **Do** 색상 작업 전 `src/theme.ts`, `src/lib/themePresets.ts`를 직접 열어 확인한다 — 팔레트가 과거 여러 차례 바뀐 이력이 있다.

### Don't:
- **Don't** iOS/Android에서 서로 다른 네이티브 룩(Cupertino/Material 기본 테마)을 기본값으로 입히지 않는다 — 두 플랫폼에서 동일한 커스텀 테마를 유지하는 게 원칙이다. 다만 시스템 시간/날짜 피커처럼 사용자에게 이미 익숙한 OS 표준 입력이고 커스텀으로 다시 만드는 비용 대비 이점이 낮은 경우엔, 필요에 따라 네이티브 컴포넌트를 그대로 쓸 수 있다(예: 리마인더 알림 시각 선택 — `@react-native-community/datetimepicker`). 예외이지 기본값이 아니므로 화면 대부분은 여전히 커스텀 테마를 따라야 한다.
- **Don't** 진한 드롭섀도우로 구조적 깊이를 만들지 않는다 — elevation은 항상 옅은 톤 신호(opacity 0.14~0.18)로 제한한다.
- **Don't** 밝은 프리셋(Whoop Mint 등)의 `primary`/`accent`를 라이트 모드 배경 위 텍스트로 직접 쓰지 않는다 — `primaryText`/`accentText`(라이트에서 `primaryPressed`로 대체)를 쓴다.
- **Don't** 한 화면에 두 개 이상의 프리셋 강조색을 동시에 노출하지 않는다(One Accent Rule).
