import mobileAds, { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';

// TODO: AdMob 콘솔에서 iOS/Android 앱을 등록하고 발급받은 실제 광고 단위 ID로 교체.
// 실제 ID가 준비되기 전(및 __DEV__)에는 항상 테스트 ID를 써서, 개발 중 실수로 진짜 광고에
// 노출·클릭이 잡혀 AdMob 계정이 제재되는 일을 막는다.
// 이 상수들을 실제 값으로 바꿀 때 app.json의 react-native-google-mobile-ads plugin에 있는
// androidAppId/iosAppId(지금은 Google 공식 샘플 App ID)도 반드시 같이 실제 값으로 바꿀 것 —
// 광고 단위 ID만 바꾸고 App ID를 안 바꾸면 소속 불일치로 광고가 서빙되지 않는다.
export const BANNER_AD_UNIT_ID = __DEV__ ? TestIds.BANNER : 'ca-app-pub-6810020420008072/8138409657';
export const INTERSTITIAL_AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-6810020420008072/5261944813';

// "3번째 등록부터, 이후 3개씩" — 별도 카운터 없이 매번 실제 등록 개수로 판단해
// 삭제 후 재등록에도 항상 실시간 상태와 일치한다.
export function shouldShowInterstitial(totalExerciseCount: number): boolean {
  return totalExerciseCount >= 3 && totalExerciseCount % 3 === 0;
}

let interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);

// SDK 초기화가 끝난 뒤에 첫 광고를 요청해야 하므로, 앱 시작 시 한 번만 호출한다.
// 이후 트리거를 위한 재로드는 showInterstitialAndWait()의 finish()에서 처리한다.
export function initializeAds(): void {
  mobileAds()
    .initialize()
    .then(() => interstitial.load())
    // 초기화 자체가 실패해도(Play Services 없음 등) 앱을 막지 않는다 — 이후 트리거 시점에
    // showInterstitialAndWait()가 !interstitial.loaded 분기에서 다시 load()를 시도한다.
    .catch(() => {});
}

let isShowingInterstitial = false;

// 로드됐으면 보여주고 닫히거나 실패하면 resolve, 아직 로드가 안 됐으면 즉시 resolve —
// 어떤 경우에도 운동 추가 흐름을 막지 않는다.
export function showInterstitialAndWait(): Promise<void> {
  return new Promise((resolve) => {
    // 이미 보여주는 중이면 같은 인스턴스에 중복으로 show()를 걸지 않고 그냥 넘어간다
    // (예: 연속 탭으로 handleAdd가 겹쳐 호출되는 경우에 대한 안전망).
    if (isShowingInterstitial || !interstitial.loaded) {
      interstitial.load(); // 이번엔 못 보여주더라도 다음 트리거를 위해 재시도해 둔다.
      resolve();
      return;
    }
    isShowingInterstitial = true;

    let settled = false;
    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, finish);
    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, finish);
    // Android는 광고 만료 등으로 표시가 실패해도 CLOSED/ERROR 이벤트가 전혀 오지 않는 경우가
    // 있어(show()가 반환하는 프로미스만 reject), 안전망으로 일정 시간 뒤 강제로 흐름을 풀어준다.
    const timeoutId = setTimeout(finish, 5000);

    function finish() {
      if (settled) return;
      settled = true;
      isShowingInterstitial = false;
      clearTimeout(timeoutId);
      unsubscribeClosed();
      unsubscribeError();
      // 한 번 보여준(혹은 실패한) 인스턴스는 재사용할 수 없으므로, 다음 트리거를 위해 새로 만들어 미리 로드해 둔다.
      interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);
      interstitial.load();
      resolve();
    }

    // show()는 동기적으로 throw하거나, 반환한 프로미스가 나중에 reject될 수 있다(예: 현재 activity
    // 없음) — 두 경우 모두 이벤트 없이 그냥 넘어가도록 finish()로 흡수한다.
    Promise.resolve()
      .then(() => interstitial.show())
      .catch(finish);
  });
}
