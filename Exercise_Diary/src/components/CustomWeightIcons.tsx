import { ReactElement } from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { CustomIconKey } from '../lib/customIcons';

type IconProps = {
  size: number;
  color: string;
};

// Ionicons outline 아이콘과 동일한 24x24 그리드 / 1.5px 스트로크 규칙을 따른다 — 같은 그리드에서
// 섞여 보여도 굵기·비율이 어긋나지 않게 하기 위함. 원본 디자인은 icons_claude/*.svg.
const STROKE_WIDTH = 1.5;

// 모든 도형이 공유하는 stroke 속성 — 도형마다 반복 지정하지 않기 위한 헬퍼
function strokeProps(color: string) {
  return {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: STROKE_WIDTH,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

function BarbellIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="2" y1="12" x2="22" y2="12" {...p} />
      <Rect x="1" y="6" width="3" height="12" rx="1" {...p} />
      <Rect x="4.5" y="8.5" width="2" height="7" rx="1" {...p} />
      <Rect x="20" y="6" width="3" height="12" rx="1" {...p} />
      <Rect x="17.5" y="8.5" width="2" height="7" rx="1" {...p} />
    </Svg>
  );
}

function DumbbellIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="8" width="4" height="8" rx="1.5" {...p} />
      <Rect x="18" y="8" width="4" height="8" rx="1.5" {...p} />
      <Rect x="6" y="9.5" width="2.2" height="5" rx="1" {...p} />
      <Rect x="15.8" y="9.5" width="2.2" height="5" rx="1" {...p} />
      <Line x1="8.2" y1="12" x2="15.8" y2="12" {...p} />
    </Svg>
  );
}

function KettlebellIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9,8 C9,5.2 10.3,3.5 12,3.5 C13.7,3.5 15,5.2 15,8" {...p} />
      <Circle cx="12" cy="15" r="6.5" {...p} />
    </Svg>
  );
}

function WeightPlateIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" {...p} />
      <Circle cx="12" cy="12" r="3" {...p} />
    </Svg>
  );
}

function BenchIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="7" y1="3" x2="7" y2="11" {...p} />
      <Line x1="17" y1="3" x2="17" y2="11" {...p} />
      <Line x1="5" y1="5" x2="9" y2="5" {...p} />
      <Line x1="15" y1="5" x2="19" y2="5" {...p} />
      <Rect x="3" y="11" width="18" height="3" rx="1" {...p} />
      <Line x1="5.5" y1="14" x2="5.5" y2="20" {...p} />
      <Line x1="18.5" y1="14" x2="18.5" y2="20" {...p} />
    </Svg>
  );
}

function SquatRackIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="5" y1="4" x2="5" y2="20" {...p} />
      <Line x1="19" y1="4" x2="19" y2="20" {...p} />
      <Line x1="3" y1="20" x2="7" y2="20" {...p} />
      <Line x1="17" y1="20" x2="21" y2="20" {...p} />
      <Line x1="2" y1="8" x2="22" y2="8" {...p} />
      <Line x1="5" y1="11" x2="7.5" y2="11" {...p} />
      <Line x1="16.5" y1="11" x2="19" y2="11" {...p} />
    </Svg>
  );
}

function PullUpIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="3" y1="5" x2="21" y2="5" {...p} />
      <Line x1="5" y1="5" x2="5" y2="3" {...p} />
      <Line x1="19" y1="5" x2="19" y2="3" {...p} />
      <Path d="M9.5,5.5 L10.8,10" {...p} />
      <Path d="M14.5,5.5 L13.2,10" {...p} />
      <Circle cx="12" cy="11.8" r="2" {...p} />
      <Line x1="12" y1="13.8" x2="12" y2="20" {...p} />
    </Svg>
  );
}

function MuscleIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5,21 C5,15 5,11 8.5,9 C7.7,7 9,4.7 11.2,4.6 C13.3,4.5 14.6,6.4 13.7,8.3 C13.2,9.3 12.2,9.8 12.2,9.8 C16,9.6 19,11.8 19,15.5 L19,21"
        {...p}
      />
      <Line x1="5" y1="21" x2="9" y2="21" {...p} />
      <Line x1="15" y1="21" x2="19" y2="21" {...p} />
    </Svg>
  );
}

function StopwatchIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="13.5" r="8" {...p} />
      <Line x1="10.3" y1="2.5" x2="13.7" y2="2.5" {...p} />
      <Line x1="12" y1="5" x2="12" y2="2.8" {...p} />
      <Line x1="17.5" y1="6.5" x2="19" y2="5" {...p} />
      <Line x1="12" y1="13.5" x2="12" y2="9" {...p} />
    </Svg>
  );
}

function WatchIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="6" y="6" width="12" height="12" rx="3.5" {...p} />
      <Path d="M9,6 L9,3 L15,3 L15,6" {...p} />
      <Path d="M9,18 L9,21 L15,21 L15,18" {...p} />
      <Line x1="18.5" y1="10.5" x2="20" y2="10.5" {...p} />
      <Path d="M9,12 L10.5,12 L11.4,10 L12.9,14 L13.8,12 L15,12" {...p} />
    </Svg>
  );
}

function PaceIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5,17.5 A9,9 0 1 1 20.5,17.5" {...p} />
      <Line x1="12" y1="16.5" x2="16" y2="10" {...p} />
      <Circle cx="12" cy="17" r="1.3" {...p} />
    </Svg>
  );
}

function TrackIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="7" width="20" height="10" rx="5" {...p} />
      <Rect x="6.5" y="10" width="11" height="4" rx="2" {...p} />
    </Svg>
  );
}

function RouteIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12,2.8 C8.5,2.8 5.5,5.5 5.5,9.3 C5.5,14.5 12,21 12,21 C12,21 18.5,14.5 18.5,9.3 C18.5,5.5 15.5,2.8 12,2.8 Z"
        {...p}
      />
      <Circle cx="12" cy="9.3" r="2.6" {...p} />
    </Svg>
  );
}

function RunningPersonIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="15.5" cy="4.5" r="2" {...p} />
      <Path d="M15,8 L11.5,11.5 L7,10.3" {...p} />
      <Path d="M11.5,11.5 L13.5,15.5 L10,19.5" {...p} />
      <Path d="M13.5,15.5 L18,17.5" {...p} />
      <Path d="M8,16 L5,20" {...p} />
    </Svg>
  );
}

function RunningShoeIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M2.5,17.5 C2.5,17.5 3.3,12.7 7.5,11.5 C10.2,10.7 11.8,8 14.7,7.8 C17.8,7.6 20.5,9.3 21,12.5 C21.2,13.8 21,15.5 21,17 C21,17.8 20.4,18.3 19.6,18.3 L4,18.3 C3.1,18.3 2.5,17.9 2.5,17.5 Z"
        {...p}
      />
      <Line x1="9.5" y1="9.5" x2="11.5" y2="13" {...p} />
      <Line x1="12.5" y1="8.7" x2="14" y2="13" {...p} />
    </Svg>
  );
}

function TreadmillIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="15.5" width="15" height="2.6" rx="1.2" {...p} />
      <Circle cx="4.3" cy="16.8" r="1.3" {...p} />
      <Circle cx="15.5" cy="16.8" r="1.3" {...p} />
      <Line x1="15" y1="15.8" x2="20" y2="4" {...p} />
      <Line x1="12.5" y1="8" x2="19.3" y2="8" {...p} />
      <Rect x="18" y="2.5" width="4" height="3" rx="1" {...p} />
    </Svg>
  );
}

function JumpRopeIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2.5" y="7.5" width="2.5" height="5" rx="1.2" {...p} />
      <Rect x="19" y="7.5" width="2.5" height="5" rx="1.2" {...p} />
      <Path d="M5.2,10 C7,20 17,20 18.8,10" {...p} />
    </Svg>
  );
}

function HeartRateIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2,13 L7,13 L9,7 L12,19 L15,3 L17.5,13 L22,13" {...p} />
    </Svg>
  );
}

function CaloriesIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12,2.5 C15,7 18,9.5 18,13.5 C18,17.1 15.3,20 12,20 C8.7,20 6,17.1 6,13.5 C6,9.5 9,7 12,2.5 Z" {...p} />
      <Path d="M12,12.5 C13.5,14 14,15.6 13.1,16.9 C12.5,17.8 11,17.7 10.6,16.6 C10.3,15.6 11,14.4 12,12.5 Z" {...p} />
    </Svg>
  );
}

function WaterBottleIcon({ size, color }: IconProps) {
  const p = strokeProps(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="9.5" y="2" width="5" height="2.5" rx="0.8" {...p} />
      <Rect x="8" y="4.5" width="8" height="17" rx="2.5" {...p} />
      <Line x1="8" y1="10" x2="16" y2="10" {...p} />
    </Svg>
  );
}

export const CUSTOM_ICON_COMPONENTS: Record<CustomIconKey, (props: IconProps) => ReactElement> = {
  'custom-barbell': BarbellIcon,
  'custom-dumbbell': DumbbellIcon,
  'custom-kettlebell': KettlebellIcon,
  'custom-weight-plate': WeightPlateIcon,
  'custom-bench': BenchIcon,
  'custom-squat-rack': SquatRackIcon,
  'custom-pull-up': PullUpIcon,
  'custom-muscle': MuscleIcon,
  'custom-stopwatch': StopwatchIcon,
  'custom-watch': WatchIcon,
  'custom-pace': PaceIcon,
  'custom-track': TrackIcon,
  'custom-route': RouteIcon,
  'custom-running-person': RunningPersonIcon,
  'custom-running-shoe': RunningShoeIcon,
  'custom-treadmill': TreadmillIcon,
  'custom-jump-rope': JumpRopeIcon,
  'custom-heart-rate': HeartRateIcon,
  'custom-calories': CaloriesIcon,
  'custom-water-bottle': WaterBottleIcon,
};
