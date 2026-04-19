import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildDueDateIndex,
  getCalendarMatrix,
  dateKey,
  WEEKDAYS,
  SOURCE_LABELS,
} from '../utils/assignmentCalendarUtils';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

const SOURCE_DOT = {
  active: COLORS.primary,
  upcoming: '#702ae1',
  completed: '#10b981',
};

export default function AssignmentCalendarModal({
  visible,
  onClose,
  calendarItems,
  onOpenAssignment,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const refYear = new Date().getFullYear();

  const [viewDate, setViewDate] = useState(() => new Date());
  useEffect(() => {
    if (visible) setViewDate(new Date());
  }, [visible]);

  const dueIndex = useMemo(
    () => buildDueDateIndex(calendarItems, refYear),
    [calendarItems, refYear]
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const { cells } = useMemo(() => getCalendarMatrix(year, month), [year, month]);
  const gridRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [cells]);

  const [selectedKey, setSelectedKey] = useState(null);
  useEffect(() => {
    const today = new Date();
    if (
      today.getFullYear() === year &&
      today.getMonth() === month
    ) {
      setSelectedKey(dateKey(today));
    } else {
      setSelectedKey(null);
    }
  }, [year, month]);

  const selectedItems = selectedKey && dueIndex[selectedKey] ? dueIndex[selectedKey] : [];

  const goPrev = () => {
    setViewDate(new Date(year, month - 1, 1));
  };
  const goNext = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const monthLabel = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const titleSize = isTablet ? 20 : 18;
  const dayFont = isTablet ? 15 : 14;
  const gridIcon = isTablet ? 16 : 14;

  const isTodayCell = (date) => {
    const t = new Date();
    return (
      date.getDate() === t.getDate() &&
      date.getMonth() === t.getMonth() &&
      date.getFullYear() === t.getFullYear()
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              marginTop: insets.top + SPACING.md,
              marginBottom: insets.bottom + SPACING.md,
              maxHeight: '88%',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { fontSize: titleSize }]}>Due dates</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <MaterialIcons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.legendRow}>
            {Object.entries(SOURCE_DOT).map(([src, color]) => (
              <View key={src} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{SOURCE_LABELS[src]}</Text>
              </View>
            ))}
          </View>

          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goPrev} style={styles.monthArrow} hitSlop={8}>
              <MaterialIcons name="chevron-left" size={28} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity onPress={goNext} style={styles.monthArrow} hitSlop={8}>
              <MaterialIcons name="chevron-right" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={`w-${i}`} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {gridRows.map((row, ri) => (
              <View key={`row-${ri}`} style={styles.gridRow}>
                {row.map((cell) => {
                  if (cell.type === 'pad') {
                    return <View key={cell.key} style={styles.gridCell} />;
                  }
                  const key = dateKey(cell.date);
                  const items = dueIndex[key] || [];
                  const selected = selectedKey === key;
                  const today = isTodayCell(cell.date);

                  const dotsBySource = {};
                  items.forEach((it) => {
                    const s = it.calendarSource || 'active';
                    dotsBySource[s] = (dotsBySource[s] || 0) + 1;
                  });

                  return (
                    <TouchableOpacity
                      key={cell.key}
                      style={[
                        styles.gridCell,
                        styles.dayCell,
                        today && styles.todayCell,
                        selected && styles.selectedCell,
                      ]}
                      onPress={() => setSelectedKey(key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.dayNum, { fontSize: dayFont }]}>{cell.day}</Text>
                      <View style={styles.dotRow}>
                        {Object.entries(SOURCE_DOT).map(([src, color]) =>
                          dotsBySource[src] ? (
                            <View
                              key={src}
                              style={[styles.miniDot, { backgroundColor: color }]}
                            />
                          ) : null
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {selectedKey
              ? new Date(selectedKey + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Select a day'}
          </Text>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {selectedItems.length === 0 ? (
              <Text style={styles.emptyText}>
                {selectedKey
                  ? 'No assignments due on this date.'
                  : 'Tap a date with dots to see assignments.'}
              </Text>
            ) : (
              selectedItems.map((item) => (
                <TouchableOpacity
                  key={`${item.id}-${item.calendarSource}`}
                  style={styles.assignRow}
                  onPress={() => onOpenAssignment?.(item)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.sourceStripe,
                      { backgroundColor: SOURCE_DOT[item.calendarSource] || COLORS.primary },
                    ]}
                  />
                  <View style={styles.assignBody}>
                    <Text style={styles.assignTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.assignMeta} numberOfLines={1}>
                      {item.subject}
                      {item.dueDate ? ` · Due ${item.dueDate}` : ''}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={gridIcon} color={COLORS.gray400} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => {
              const t = new Date();
              setViewDate(new Date(t.getFullYear(), t.getMonth(), 1));
              setSelectedKey(dateKey(t));
            }}
          >
            <MaterialIcons name="today" size={gridIcon} color={COLORS.primary} />
            <Text style={styles.todayBtnText}>Jump to today</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    ...SHADOWS.lg,
    ...Platform.select({
      ios: { shadowColor: '#000' },
      android: { elevation: 12 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray200,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sheetTitle: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.headline,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray600,
    fontFamily: 'Manrope-Medium',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  monthArrow: {
    padding: SPACING.xs,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray500,
    fontFamily: 'Manrope-Medium',
  },
  grid: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    maxHeight: 56,
    padding: 2,
  },
  dayCell: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  todayCell: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  selectedCell: {
    backgroundColor: 'rgba(0, 80, 212, 0.12)',
  },
  dayNum: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    minHeight: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    fontFamily: 'Manrope-Medium',
  },
  listScroll: {
    maxHeight: 220,
  },
  listContent: {
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray500,
    fontFamily: 'Manrope-Regular',
    paddingVertical: SPACING.md,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  sourceStripe: {
    width: 4,
    alignSelf: 'stretch',
    minHeight: 56,
  },
  assignBody: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  assignTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'Manrope-Medium',
  },
  assignMeta: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
    fontFamily: 'Manrope-Regular',
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: SPACING.xs,
  },
  todayBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'Manrope-Medium',
  },
});
