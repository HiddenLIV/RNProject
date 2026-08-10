import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { VideoRef } from './types';
import { captureExerciseVideo, getVideoPermissionState, PermissionState, requestVideoPermissions } from './video';

type Messages = {
  captureFailedTitle: string;
  captureFailedBody: string;
  permissionFailedBody: string;
};

// 측정 화면의 "자세 촬영" 버튼 하나가 다루는 권한 확인 → 촬영 → 실패 안내 흐름을 통째로 캡슐화한다.
export function useVideoCapture(messages: Messages) {
  // 촬영한 영상 참조 — 이번 세션(다시 시작·메인으로 나가기 전까지) 동안 유효하다.
  const [capturedVideo, setCapturedVideo] = useState<VideoRef | null>(null);
  const [viewingVideo, setViewingVideo] = useState(false);
  const [permissionModal, setPermissionModal] = useState<PermissionState | null>(null);
  const [busy, setBusy] = useState(false);

  const runCapture = async () => {
    try {
      const result = await captureExerciseVideo();
      if (result.status !== 'saved') return;
      setCapturedVideo(result.ref);
    } catch {
      Alert.alert(messages.captureFailedTitle, messages.captureFailedBody);
    } finally {
      setBusy(false);
    }
  };

  const handleCapturePress = async () => {
    if (busy) return; // 연타 방지 — 권한 확인 중에도 이미 처리 중으로 간주한다
    setBusy(true);
    try {
      const state = await getVideoPermissionState();
      if (state !== 'granted') {
        setPermissionModal(state);
        return;
      }
      await runCapture();
    } catch {
      Alert.alert(messages.captureFailedTitle, messages.permissionFailedBody);
    } finally {
      // runCapture가 실행됐다면 이미 false로 되돌려놨겠지만, 권한 확인 자체가
      // 실패한 경우를 대비해 여기서도 항상 풀어준다.
      setBusy(false);
    }
  };

  const handleGrantPermission = async () => {
    setBusy(true);
    try {
      const granted = await requestVideoPermissions();
      if (!granted) {
        setPermissionModal(await getVideoPermissionState());
        return;
      }
      setPermissionModal(null);
      await runCapture();
    } catch {
      Alert.alert(messages.captureFailedTitle, messages.permissionFailedBody);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSettings = () => {
    setPermissionModal(null);
    Linking.openSettings();
  };

  return {
    capturedVideo,
    resetCapturedVideo: () => setCapturedVideo(null),
    viewingVideo,
    setViewingVideo,
    permissionModal,
    closePermissionModal: () => setPermissionModal(null),
    busy,
    handleCapturePress,
    handleGrantPermission,
    handleOpenSettings,
  };
}
