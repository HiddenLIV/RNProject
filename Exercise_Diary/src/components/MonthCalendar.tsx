import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { SPEECH_LOCALE, useLanguage, useTranslation } from '../lib/i18n';
import { localDateKey } from '../lib/stats';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';
import BottomSheet from './BottomSheet';

const CELL_GAP = spacing.xs;
const DAYS_PER_WEEK = 7;
const YEARS_BACK = 2; // 올해 포함, 과거 몇 해까지 연도 선택지로 보여줄지

type DayCell = { key: string; day: number } | null;

function pad(n: number): string {
  return `${n}`.padStart(2, '0');
}

// 1일이 있는 요일만큼 앞을 비우고, 그 달 일수만큼 채운 뒤, 7의 배수가 되도록 뒤도 비운다 —
// 흔한 달력 그리드(주 단위 행) 구성 방식.
function buildMonthWeeks(year: number, month: number): DayCell[][] {
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: DayCell[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: `${year}-${pad(month + 1)}-${pad(day)}`, day });
  }
  while (cells.length % DAYS_PER_WEEK !== 0) cells.push(null);

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += DAYS_PER_WEEK) {
    weeks.push(cells.slice(i, i + DAYS_PER_WEEK));
  }
  return weeks;
}

type Props = {
  recordedDates: Set<string>;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey?: string | null;
  // 화살표 이동·연월 선택 어느 쪽으로든 보고 있는 달이 바뀔 때마다 새 연/월(0-indexed)을 알려준다 —
  // 선택된 날짜가 더 이상 보이는 달에 없으면 부모가 선택을 해제할 수 있게 한다.
  onMonthChange?: (year: number, month: number) => void;
};

// 요일 인덱스(0=일 ... 6=토) 기준 텍스트 색 — 평일은 호출부에서 넘긴 기본색을 그대로 쓴다.
// 일/토요일 색(weekendSunday/weekendSaturday)은 theme.ts에 라이트/다크 모드별로 대비가 맞게
// 정의돼 있고, 강조색 프리셋과 무관하게 항상 같은 톤을 유지한다(요일 표시는 프리셋과 별개 의미).
function weekdayTextColor(dow: number, defaultColor: string, sunday: string, saturday: string): string {
  if (dow === 0) return sunday;
  if (dow === 6) return saturday;
  return defaultColor;
}

export default function MonthCalendar({
  recordedDates,
  onSelectDate,
  selectedDateKey,
  onMonthChange,
}: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const language = useLanguage();

  const now = new Date();
  const [viewedYear, setViewedYear] = useState(now.getFullYear());
  const [viewedMonth, setViewedMonth] = useState(now.getMonth()); // 0-indexed
  const todayKey = localDateKey(now.toISOString());
  const isCurrentMonth = viewedYear === now.getFullYear() && viewedMonth === now.getMonth();

  const goPrevMonth = () => {
    const [nextYear, nextMonth] = viewedMonth === 0 ? [viewedYear - 1, 11] : [viewedYear, viewedMonth - 1];
    setViewedYear(nextYear);
    setViewedMonth(nextMonth);
    onMonthChange?.(nextYear, nextMonth);
  };
  const goNextMonth = () => {
    if (isCurrentMonth) return; // 미래 달은 기록이 있을 수 없어 이동을 막는다
    const [nextYear, nextMonth] = viewedMonth === 11 ? [viewedYear + 1, 0] : [viewedYear, viewedMonth + 1];
    setViewedYear(nextYear);
    setViewedMonth(nextMonth);
    onMonthChange?.(nextYear, nextMonth);
  };

  const monthTitle = new Intl.DateTimeFormat(SPEECH_LOCALE[language], {
    year: 'numeric',
    month: 'long',
  }).format(new Date(viewedYear, viewedMonth, 1));

  // 연/월 직접 선택 — 화살표로 한 달씩 넘기는 것과 별개로, 제목을 누르면 연도(최근 3년)와
  // 12개월 중에서 바로 골라 이동할 수 있다.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(viewedYear);
  const openPicker = () => {
    setPickerYear(viewedYear);
    setPickerOpen(true);
  };
  // 화살표로 최근 3년 범위보다 더 과거로 넘어간 뒤 시트를 열면, 보고 있는 연도가 칩 목록에
  // 아예 없어서 아무 연도도 선택된 것처럼 안 보이는 문제가 있었다 — 그 연도를 목록 앞에 끼워
  // 넣어 항상 현재 보고 있는 연도가 칩으로 존재하고 선택 표시되게 한다.
  const baseYearOptions = Array.from({ length: YEARS_BACK + 1 }, (_, i) => now.getFullYear() - YEARS_BACK + i);
  const yearOptions = baseYearOptions.includes(viewedYear)
    ? baseYearOptions
    : [viewedYear, ...baseYearOptions].sort((a, b) => a - b);
  const monthNames = Array.from({ length: 12 }, (_, m) =>
    new Intl.DateTimeFormat(SPEECH_LOCALE[language], { month: 'short' }).format(new Date(2000, m, 1)),
  );
  const selectMonth = (month: number) => {
    setViewedYear(pickerYear);
    setViewedMonth(month);
    setPickerOpen(false);
    onMonthChange?.(pickerYear, month);
  };

  const weeks = buildMonthWeeks(viewedYear, viewedMonth);

  const [rowWidth, setRowWidth] = useState(0);
  const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);
  const cellSize = rowWidth > 0 ? (rowWidth - CELL_GAP * (DAYS_PER_WEEK - 1)) / DAYS_PER_WEEK : 0;
  const dayCircleSize = cellSize * 0.78;

  return (
    <View>
      <View style={styles.monthHeader}>
        <Pressable
          style={styles.monthNavButton}
          onPress={goPrevMonth}
          hitSlop={8}
          accessibilityLabel={t.activity.previousMonth}
        >
          <Ionicons name="chevron-back" size={20} color={accent.primary} />
        </Pressable>
        <Pressable
          style={styles.monthTitleButton}
          onPress={openPicker}
          accessibilityLabel={t.activity.selectMonth}
        >
          <Text style={[styles.monthTitle, { color: accent.text }]}>{monthTitle}</Text>
          <Ionicons name="chevron-down" size={16} color={accent.textFaint} />
        </Pressable>
        <Pressable
          style={styles.monthNavButton}
          onPress={goNextMonth}
          hitSlop={8}
          disabled={isCurrentMonth}
          accessibilityLabel={t.activity.nextMonth}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isCurrentMonth ? accent.textFaint : accent.primary}
          />
        </Pressable>
      </View>

      <View style={styles.weekdayRow} onLayout={onRowLayout}>
        {cellSize > 0 &&
          t.weekdays.map((label, i) => (
            <View key={i} style={{ width: cellSize }}>
              <Text
                style={[
                  styles.weekdayLabel,
                  { color: weekdayTextColor(i, accent.textMuted, accent.weekendSunday, accent.weekendSaturday) },
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
      </View>

      {cellSize > 0 &&
        weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={[styles.weekRow, { marginTop: weekIndex === 0 ? 0 : CELL_GAP }]}>
            {week.map((cell, dow) => {
              if (!cell) return <View key={dow} style={{ width: cellSize, height: cellSize }} />;
              const recorded = recordedDates.has(cell.key);
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDateKey;
              const dateLabel = `${cell.key.replaceAll('-', '.')} (${t.weekdays[dow]})`;
              const status = recorded ? t.activity.recorded : t.activity.noRecord;
              const dayNumberColor = isSelected
                ? accent.onPrimary
                : weekdayTextColor(dow, accent.text, accent.weekendSunday, accent.weekendSaturday);
              const cellContent = (
                <>
                  <View
                    style={[
                      styles.dayCircle,
                      { width: dayCircleSize, height: dayCircleSize },
                      // 선택 표시(채움)가 우선이다 — 오늘이면서 선택된 날짜는 테두리 없이 채움만
                      // 보여준다. isSelected일 때도 굳이 borderWidth:0을 명시하면(같은 스타일
                      // 객체에 backgroundColor와 함께) 안드로이드에서 borderRadius 클리핑이 깨져
                      // 모서리가 각진 사각형으로 나오는 버그가 있었다 — 아예 테두리 스타일 자체를
                      // 안 넣는 방식으로 피한다.
                      isToday && !isSelected && { borderWidth: 1.5, borderColor: accent.primary },
                      isSelected && { backgroundColor: accent.primary },
                    ]}
                  >
                    <Text style={[styles.dayNumber, { color: dayNumberColor }]}>{cell.day}</Text>
                  </View>
                  <View
                    style={[styles.recordDot, { backgroundColor: recorded ? accent.primary : 'transparent' }]}
                  />
                </>
              );
              // 기록이 있는 날짜만 눌러서 "그날 한 운동" 목록을 볼 수 있게 한다 — 기록 없는 날은
              // 눌러도 보여줄 게 없으니 아예 탭 반응을 주지 않는다.
              if (!recorded) {
                return (
                  <View
                    key={dow}
                    style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}
                    accessible
                    accessibilityLabel={
                      isToday ? `${dateLabel}, ${status}, ${t.activity.today}` : `${dateLabel}, ${status}`
                    }
                  >
                    {cellContent}
                  </View>
                );
              }
              return (
                <Pressable
                  key={dow}
                  onPress={() => onSelectDate(cell.key)}
                  style={({ pressed }) => [
                    { width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' },
                    pressed && styles.cellPressed,
                  ]}
                  accessibilityLabel={
                    isToday ? `${dateLabel}, ${status}, ${t.activity.today}` : `${dateLabel}, ${status}`
                  }
                >
                  {cellContent}
                </Pressable>
              );
            })}
          </View>
        ))}

      <View style={styles.legendRow}>
        <View style={[styles.recordDot, styles.legendDot, { backgroundColor: accent.primary }]} />
        <Text style={[styles.legendText, { color: accent.textMuted }]}>{t.activity.recordedDayLegend}</Text>
      </View>

      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t.activity.selectMonth}
        closeAccessibilityLabel={t.activity.closeAccessibility}
      >
        <View style={styles.yearRow}>
          {yearOptions.map((year) => (
            <Pressable
              key={year}
              onPress={() => setPickerYear(year)}
              style={[
                styles.yearChip,
                { borderColor: accent.border },
                pickerYear === year && { backgroundColor: accent.primary, borderColor: accent.primary },
              ]}
            >
              <Text
                style={[
                  styles.yearChipText,
                  { color: pickerYear === year ? accent.onPrimary : accent.text },
                ]}
              >
                {year}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.monthGrid}>
          {monthNames.map((name, month) => {
            const disabled = pickerYear === now.getFullYear() && month > now.getMonth();
            const selected = pickerYear === viewedYear && month === viewedMonth;
            return (
              <Pressable
                key={month}
                disabled={disabled}
                onPress={() => selectMonth(month)}
                style={[
                  styles.monthCell,
                  { borderColor: accent.border },
                  selected && { backgroundColor: accent.primary, borderColor: accent.primary },
                ]}
              >
                <Text
                  style={[
                    styles.monthCellText,
                    { color: selected ? accent.onPrimary : disabled ? accent.textFaint : accent.text },
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.smd,
  },
  monthNavButton: {
    padding: spacing.xs,
  },
  monthTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 140,
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  cellPressed: {
    opacity: 0.6,
  },
  // width/height는 컴포넌트 안에서 cellSize 기준 픽셀 값으로 직접 계산해 넘긴다(퍼센트+aspectRatio
  // 조합 대신 — 히트맵 때와 같은 종류의 함정을 피하려고). overflow:'hidden'은 별도 이유로 필요하다 —
  // 안드로이드에서 backgroundColor만 있고 테두리가 없는 View는 borderRadius를 무시하고 각진
  // 사각형으로 그려지는 알려진 문제가 있다(오늘 표시처럼 테두리만 있는 경우엔 문제없이 둥글게
  // 나오는데, 선택 표시처럼 배경색만 채우면 모서리가 안 잘렸다) — overflow:'hidden'을 주면
  // 배경도 강제로 borderRadius에 맞춰 잘린다.
  dayCircle: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  recordDot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  legendDot: {
    marginTop: 0,
  },
  legendText: {
    fontSize: fontSize.xs,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  yearChip: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  yearChipText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  monthCell: {
    width: '22%',
    paddingVertical: spacing.smd,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  monthCellText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
