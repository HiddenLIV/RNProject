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
};

export default function MonthCalendar({ recordedDates, onSelectDate }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const language = useLanguage();

  const now = new Date();
  const [viewedYear, setViewedYear] = useState(now.getFullYear());
  const [viewedMonth, setViewedMonth] = useState(now.getMonth()); // 0-indexed
  const todayKey = localDateKey(now.toISOString());
  const isCurrentMonth = viewedYear === now.getFullYear() && viewedMonth === now.getMonth();

  const goPrevMonth = () => {
    if (viewedMonth === 0) {
      setViewedYear((y) => y - 1);
      setViewedMonth(11);
    } else {
      setViewedMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (isCurrentMonth) return; // 미래 달은 기록이 있을 수 없어 이동을 막는다
    if (viewedMonth === 11) {
      setViewedYear((y) => y + 1);
      setViewedMonth(0);
    } else {
      setViewedMonth((m) => m + 1);
    }
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
  };

  const weeks = buildMonthWeeks(viewedYear, viewedMonth);

  const [rowWidth, setRowWidth] = useState(0);
  const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);
  const cellSize = rowWidth > 0 ? (rowWidth - CELL_GAP * (DAYS_PER_WEEK - 1)) / DAYS_PER_WEEK : 0;

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
              <Text style={[styles.weekdayLabel, { color: accent.textFaint }]}>{label}</Text>
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
              const dateLabel = `${cell.key.replaceAll('-', '.')} (${t.weekdays[dow]})`;
              const status = recorded ? t.activity.recorded : t.activity.noRecord;
              const cellContent = (
                <>
                  <View
                    style={[styles.dayCircle, isToday && { borderWidth: 1.5, borderColor: accent.primary }]}
                  >
                    <Text style={[styles.dayNumber, { color: accent.text }]}>{cell.day}</Text>
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
        <Text style={[styles.legendText, { color: accent.textFaint }]}>{t.activity.recordedDayLegend}</Text>
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
  dayCircle: {
    width: '78%',
    aspectRatio: 1,
    borderRadius: radius.pill,
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
