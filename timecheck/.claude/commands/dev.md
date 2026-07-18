---
description: 개발 — 스펙·설계 문서를 기준으로 기능 구현
model: fable
---

기능 "$ARGUMENTS"를 구현하라.

절차:
1. `docs/specs/$ARGUMENTS.md`와 `docs/design/$ARGUMENTS.md`를 읽는다. 설계 문서가 없으면 /design부터 하라고 안내하고 중단한다
2. 설계 문서의 "구현 순서"를 따라 단계별로 구현한다. TaskCreate로 단계를 작업 목록에 등록하고 진행 상태를 갱신한다
3. 각 단계 완료 시 `npx tsc --noEmit`으로 타입 오류가 없는지 확인한다
4. 새 패키지가 필요하면 `npx expo install <패키지>`를 사용한다 (npm install 대신 — Expo SDK 호환 버전을 맞춰줌)
5. 구현 중 설계와 달라져야 하는 부분이 생기면 임의로 바꾸지 말고 사용자에게 알린 뒤 설계 문서도 갱신한다
6. 전체 구현이 끝나면 변경 파일 목록과 함께 /qa 실행을 제안한다

주의: 설계 문서에 없는 기능을 임의로 추가하지 않는다.
