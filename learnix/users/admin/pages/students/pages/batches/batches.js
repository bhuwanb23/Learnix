import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BATCHES } from '../../constants/studentsData';

import SectionHeader from '../../../../components/ui/SectionHeader';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

export default function Batches({ onBack }) {
  const [expandedBatch, setExpandedBatch] = useState(null);

  const handleAddStudents = (batch) => {
    Alert.alert('Add Students', `Bulk-add students to ${batch.name} (spreadsheet upload).`);
  };

  const handleExport = (batch) => {
    Alert.alert('Export', `${batch.name} student list downloaded as Excel.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#7c3aed" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Batches</Text>
            <Text style={styles.headerSubtitle}>Manage student cohorts</Text>
          </View>
        </View>

        <SectionHeader title={`${BATCHES.length} Active Batches`} actionLabel="New Batch" actionIcon="add" onAction={() => Alert.alert('New Batch', 'Create a new batch for the upcoming academic year.')} />

        {BATCHES.map((batch) => (
          <View key={batch.id} style={styles.batchCard}>
            <TouchableOpacity
              style={styles.batchHeader}
              onPress={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
              activeOpacity={0.8}
            >
              <View style={styles.batchIcon}>
                <Ionicons name="people" size={20} color="#7c3aed" />
              </View>
              <View style={styles.batchInfo}>
                <Text style={styles.batchName}>{batch.name}</Text>
                <Text style={styles.batchMeta}>{batch.students} students • {batch.year}</Text>
              </View>
              <View style={styles.batchActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => handleExport(batch)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="download-outline" size={18} color="#7c3aed" />
                </TouchableOpacity>
                <Ionicons name={expandedBatch === batch.id ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {expandedBatch === batch.id ? (
              <View style={styles.batchDetail}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Boys</Text>
                  <Text style={styles.detailValue}>{(batch.students * 0.62).toFixed(0)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Girls</Text>
                  <Text style={styles.detailValue}>{(batch.students * 0.38).toFixed(0)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Active</Text>
                  <Text style={[styles.detailValue, { color: '#059669' }]}>{batch.students - 6}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>On Probation</Text>
                  <Text style={[styles.detailValue, { color: '#d97706' }]}>4</Text>
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleAddStudents(batch)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.addBtnText}>Add Students</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  batchCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  batchIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  batchInfo: {
    flex: 1,
  },
  batchName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  batchMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  batchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchDetail: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  addBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#7c3aed',
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 12,
    marginTop: SPACING.sm,
  },
  addBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#ffffff',
    fontFamily: 'Manrope-SemiBold',
  },
});