import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * StatusChip — colored status pill.
 *
 * Usage:
 * <StatusChip status="ON_TIME" />
 * <StatusChip color="#059669" label="Active" />
 */

const STATUS_MAP = {
  ON_TIME:     { bg: '#dcfce7', color: '#059669', label: 'On Time' },
  ON_ROAD:     { bg: '#dcfce7', color: '#059669', label: 'On Road' },
  ON_DUTY:     { bg: '#dcfce7', color: '#059669', label: 'On Duty' },
  COMPLETED:   { bg: '#dcfce7', color: '#059669', label: 'Completed' },
  PAID:        { bg: '#dcfce7', color: '#059669', label: 'Paid' },
  DELAYED:     { bg: '#fee2e2', color: '#dc2626', label: 'Delayed' },
  SERVICE:     { bg: '#fee2e2', color: '#dc2626', label: 'Service' },
  CRITICAL:    { bg: '#fee2e2', color: '#dc2626', label: 'Critical' },
  LOW_FUEL:    { bg: '#fef3c7', color: '#d97706', label: 'Low Fuel' },
  IN_PROGRESS: { bg: '#fef3c7', color: '#d97706', label: 'In Progress' },
  PARTIAL:     { bg: '#fef3c7', color: '#d97706', label: 'Partial' },
  SCHEDULED:   { bg: '#dbeafe', color: '#2563eb', label: 'Scheduled' },
  IDLE:        { bg: '#f1f5f9', color: '#64748b', label: 'Idle' },
  OFF_DUTY:    { bg: '#f1f5f9', color: '#64748b', label: 'Off Duty' },
  ON_LEAVE:    { bg: '#fef3c7', color: '#d97706', label: 'On Leave' },
  UNPAID:      { bg: '#fee2e2', color: '#dc2626', label: 'Unpaid' },
};

export default function StatusChip({ status, color, label, size = 'sm' }) {
  const resolved = status ? (STATUS_MAP[status] || STATUS_MAP.IDLE) : null;
  const bg = color ? color + '1a' : resolved?.bg || '#f1f5f9';
  const textColor = color || resolved?.color || '#64748b';
  const text = label || resolved?.label || status || 'Unknown';

  const isSmall = size === 'sm';

  return (
    <View style={[styles.chip, { backgroundColor: bg }, isSmall ? styles.sm : styles.md]}>
      <Text style={[styles.text, { color: textColor }, isSmall ? styles.textSm : styles.textMd]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  md: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  text: {
    fontFamily: 'Manrope-Bold',
  },
  textSm: {
    fontSize: 10,
  },
  textMd: {
    fontSize: 12,
  },
});
