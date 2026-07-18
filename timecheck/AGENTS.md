# timecheck

풀업(턱걸이) 전 데드행(매달리기) 버틴 시간을 측정·기록하는 iOS/Android 앱. Expo SDK 57 (React Native 0.86) + TypeScript.

> Expo has changed — 코드를 작성하기 전에 https://docs.expo.dev/versions/v57.0.0/ 의 정확한 버전 문서를 확인할 것.

## 명령어

- `npm start` — Expo 개발 서버 시작
- `npm run ios` / `npm run android` — 시뮬레이터/에뮬레이터 실행
- `npx tsc --noEmit` — 타입 체크

## 개발 워크플로우

새 기능은 아래 단계를 따른다. 각 단계는 슬래시 커맨드로 실행한다.

1. **기획** `/spec <기능명>` — 요구사항을 `docs/specs/<기능명>.md`로 정리하고 사용자 승인을 받는다
2. **설계** `/design <기능명>` — 승인된 스펙을 바탕으로 `docs/design/<기능명>.md`에 화면 구조·상태·데이터 설계를 작성한다
3. **개발** `/dev <기능명>` — 스펙과 설계 문서를 기준으로 구현한다
4. **검증** `/qa <기능명>` — 타입 체크, 앱 실행 확인, 스펙 대비 체크리스트 검증
5. **마무리** `/ship <기능명>` — reviewer 에이전트 리뷰 후 한국어 메시지로 커밋 (push는 별도 요청 시)

문서 없이 바로 구현을 요청받은 소규모 수정은 단계를 생략해도 되지만, 새 화면/새 기능은 반드시 spec부터 시작한다.

## 코드 규칙

- 화면은 `src/screens/`, 재사용 컴포넌트는 `src/components/`, 로직(타이머·저장 등)은 `src/lib/`에 둔다
- 로컬 데이터 저장은 `@react-native-async-storage/async-storage` 사용
- 타이머는 `setInterval` 누적이 아니라 시작 시각(`Date.now()`) 기준 경과 시간으로 계산한다 (백그라운드 전환·프레임 드랍 시 오차 방지)
- 생성형 에셋(앱 아이콘, 효과음)은 `scripts/`의 생성 스크립트로 만든다 — 수정할 때 스크립트를 고쳐 재생성 (`npm run assets:icons`, `npm run assets:bell`)
- 커밋 메시지는 한국어로 작성한다

## 문서 위치

- `docs/specs/` — 기능별 요구사항 (무엇을, 왜)
- `docs/design/` — 기능별 설계 (어떻게)
