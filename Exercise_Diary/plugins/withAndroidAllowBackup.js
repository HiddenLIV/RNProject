const { withAndroidManifest } = require('expo/config-plugins');

// adb backup으로 앱 데이터(운동 기록 등)를 기기 밖으로 추출할 수 없도록
// AndroidManifest의 <application android:allowBackup>을 false로 강제한다.
// expo-build-properties는 gradle 레벨 옵션만 지원하고 매니페스트 속성은 다루지 않아 별도 플러그인으로 처리한다.
module.exports = function withAndroidAllowBackup(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:allowBackup'] = 'false';
    }
    return config;
  });
};
