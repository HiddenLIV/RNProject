import * as Device from 'expo-device';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Asset, getPermissionsAsync, requestPermissionsAsync } from 'expo-media-library';
import { VideoRef } from './types';

export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'blocked'; // 'blocked' = 영구 거부(canAskAgain: false)

// 동영상만 다루므로 사진·음악 접근까지 요청하지 않는다 (안드로이드 13+ 세분화 권한).
const LIBRARY_GRANULAR_PERMISSIONS: ['video'] = ['video'];

// OS 팝업을 띄우지 않고 현재 권한 상태만 읽는다 — 촬영 버튼을 눌렀을 때
// 안내 모달을 띄울지 말지 판단하는 데 쓴다.
export async function getVideoPermissionState(): Promise<PermissionState> {
  const camera = await ImagePicker.getCameraPermissionsAsync();
  const library = await getPermissionsAsync(false, LIBRARY_GRANULAR_PERMISSIONS);
  if (camera.granted && library.granted) return 'granted';
  if (camera.canAskAgain === false || library.canAskAgain === false) return 'blocked';
  if (camera.status === 'undetermined' || library.status === 'undetermined') return 'undetermined';
  return 'denied';
}

// 실제 OS 권한 팝업을 띄운다 — CameraPermissionModal에서 "권한 허용"을 눌렀을 때만 호출한다.
export async function requestVideoPermissions(): Promise<boolean> {
  const camera = await ImagePicker.requestCameraPermissionsAsync();
  if (!camera.granted) return false; // 카메라를 거부했으면 갤러리 권한까지 이어서 물어볼 필요 없다
  const library = await requestPermissionsAsync(false, LIBRARY_GRANULAR_PERMISSIONS);
  return library.granted;
}

export type VideoCaptureResult = { status: 'saved'; ref: VideoRef } | { status: 'cancelled' };

// 권한이 이미 있다는 전제로만 호출한다 — 권한 확보는 화면 쪽에서 먼저 끝낸다.
export async function captureExerciseVideo(): Promise<VideoCaptureResult> {
  // 시뮬레이터/에뮬레이터는 카메라 하드웨어가 없다. expo-image-picker가 이 경우를 감지 못 하고
  // 네이티브 예외(SIGABRT)로 앱 전체가 죽어버리므로, 호출 자체를 막아 기존 catch 블록의
  // "촬영 실패" 안내로 흡수되게 한다 — 실기기에서는 항상 true라 이 분기를 타지 않는다.
  if (!Device.isDevice) {
    throw new Error('Camera is not available on simulator/emulator');
  }

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'] });
  if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };

  const tempUri = result.assets[0].uri;
  const asset = await Asset.create(tempUri);
  // 앱 캐시에 남은 원본을 지워 앱 쪽엔 아무 사본도 안 남게 한다 — 영상은 갤러리에만 존재한다.
  // 정리 작업일 뿐이라 실패해도 이미 성공한 저장 자체를 실패로 만들지 않는다.
  try {
    const tempFile = new File(tempUri);
    if (tempFile.exists) tempFile.delete();
  } catch {
    // 캐시 정리 실패는 무시 — 갤러리 저장은 이미 완료됐다.
  }
  return { status: 'saved', ref: { assetId: asset.id } };
}

// 재생용 URI 조회 — 권한이 없거나 에셋이 갤러리에서 삭제됐으면 null로 수렴시켜
// 호출부가 "영상을 찾을 수 없습니다" 한 가지 상태로만 처리하면 되게 한다.
export async function resolveVideoUri(assetId: string): Promise<string | null> {
  try {
    const permission = await getPermissionsAsync(false, LIBRARY_GRANULAR_PERMISSIONS); // 조회만, OS 팝업 유발 안 함
    if (!permission.granted) return null;
    const asset = new Asset(assetId);
    return await asset.getUri();
  } catch {
    return null;
  }
}
